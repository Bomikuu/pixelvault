"""Explicit ownership proof, generic recovery responses and single-use tokens."""

import hashlib
import secrets
from datetime import timedelta
from django.conf import settings
from django.contrib.auth import logout
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.mail import send_mail
from django.db import transaction
from django.utils import timezone
from django.utils.crypto import constant_time_compare
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from audit.services import record_audit
from config.errors import DomainError
from config.views import MemberView
from .models import Member, PasswordRecovery, RecoveryEmail


def digest(value):
    return hashlib.sha256(value.encode()).hexdigest()


def response(data):
    result = Response(data)
    result["Cache-Control"] = "private, no-store"
    return result


def deliver(email, subject, body):
    if not settings.RECOVERY_DELIVERY_AVAILABLE:
        return False
    try:
        return bool(
            send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [email], fail_silently=False)
        )
    except Exception:
        # No email address, token, password or provider exception is logged.
        return False


class RecoveryEmailView(MemberView):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"

    def get(self, request):
        row = RecoveryEmail.objects.filter(member=request.user).first()
        return response(
            {
                "verified": bool(
                    row and row.verified_at and row.verified_email == request.user.email
                ),
                "email": request.user.email,
                "delivery_available": settings.RECOVERY_DELIVERY_AVAILABLE,
                "delivery_mode": "local_capture" if settings.ENVIRONMENT == "test" else "email",
            }
        )

    @transaction.atomic
    def post(self, request):
        member = Member.objects.select_for_update().get(pk=request.user.id)
        row, _ = RecoveryEmail.objects.get_or_create(member=member)
        now = timezone.now()
        if row.requested_at and row.requested_at > now - timedelta(minutes=1):
            raise DomainError(
                "verification_cooldown", "Wait one minute before requesting another link.", 429
            )
        token = secrets.token_urlsafe(32)
        row.pending_email, row.challenge_digest = member.email, digest(token)
        row.challenge_expires_at, row.requested_at = now + timedelta(minutes=30), now
        row.save()
        url = f"{settings.FRONTEND_URL}/verify-email/{member.id}#token={token}"
        if not deliver(
            member.email,
            "Verify your PixelVault recovery email",
            f"You asked to verify this email for PixelVault account recovery.\n\n{url}\n\nThis link expires in 30 minutes. It does not accept loan terms or move money. Ignore it if you did not request it.",
        ):
            raise DomainError(
                "delivery_unavailable",
                "Email delivery is unavailable. Try again later or contact private support.",
                503,
            )
        return response(
            {
                "sent": True,
                "message": "Open the verification email to confirm ownership. Test mode captures email locally; it sends no external message."
                if settings.ENVIRONMENT == "test"
                else "Open the verification email to confirm ownership.",
            }
        )


@method_decorator(csrf_protect, name="dispatch")
class VerifyRecoveryEmailView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"

    @transaction.atomic
    def post(self, request, member_id):
        token = request.data.get("token")
        row = (
            RecoveryEmail.objects.select_for_update()
            .select_related("member")
            .filter(member_id=member_id)
            .first()
        )
        if (
            not isinstance(token, str)
            or len(token) > 200
            or not row
            or not row.challenge_expires_at
            or row.challenge_expires_at <= timezone.now()
            or not row.challenge_digest
            or not constant_time_compare(row.challenge_digest, digest(token))
            or row.pending_email != row.member.email
            or not row.member.is_active
        ):
            raise DomainError(
                "invalid_verification",
                "This verification link is invalid or expired. Request a new link from private contacts.",
            )
        row.verified_email, row.verified_at = row.member.email, timezone.now()
        row.challenge_digest, row.challenge_expires_at = "", None
        row.save()
        record_audit(
            actor_id=row.member_id,
            action="account.recovery_email_verified",
            subject_id=row.member_id,
        )
        return response({"verified": True})


@method_decorator(csrf_protect, name="dispatch")
class RecoveryRequestView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"

    def post(self, request):
        email = request.data.get("email")
        if not isinstance(email, str) or len(email) > 254:
            raise DomainError("invalid_email", "Enter your account email address.")
        # Same response for unknown, unverified, disabled, cooldown and delivery failures.
        result = {
            "message": "If this address has a verified recovery email, a reset link will be delivered. Check your inbox or contact private support.",
            "test_mode": settings.ENVIRONMENT == "test",
        }
        # Always queue the same task. Account lookup and SMTP latency never affect
        # this public response. send_task deliberately bypasses eager test mode.
        from config.celery import app

        try:
            app.send_task("accounts.tasks.send_recovery", args=[email.strip()], retry=False)
        except Exception:
            pass  # Same generic response when the delivery queue is unavailable.
        return response(result)


@method_decorator(csrf_protect, name="dispatch")
class RecoveryConfirmView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"

    @transaction.atomic
    def post(self, request, recovery_id):
        token, password = request.data.get("token"), request.data.get("password")
        row = PasswordRecovery.objects.select_for_update().filter(pk=recovery_id).first()
        if (
            not isinstance(token, str)
            or len(token) > 200
            or not row
            or row.used_at
            or row.expires_at <= timezone.now()
            or not constant_time_compare(row.token_digest, digest(token))
        ):
            raise DomainError(
                "invalid_recovery", "This reset link is invalid or expired. Request another link."
            )
        member = Member.objects.select_for_update().get(pk=row.member_id)
        if (
            not member.is_active
            or member.email != row.email_at_issue
            or not constant_time_compare(row.password_fingerprint, digest(member.password))
            or not RecoveryEmail.objects.filter(
                member=member, verified_email=member.email, verified_at__isnull=False
            ).exists()
        ):
            raise DomainError(
                "invalid_recovery", "This reset link is invalid or expired. Request another link."
            )
        if not isinstance(password, str) or password != request.data.get("password_confirm"):
            raise DomainError("password_mismatch", "Enter the same new password in both fields.")
        try:
            validate_password(password, member)
        except ValidationError as error:
            from rest_framework.exceptions import ValidationError as APIValidationError

            raise APIValidationError({"password": error.messages}) from None
        member.set_password(password)
        member.staff_step_up_until = None
        member.save(update_fields=["password", "staff_step_up_until"])
        row.used_at = timezone.now()
        row.token_digest = ""
        row.save(update_fields=["used_at", "token_digest"])
        record_audit(actor_id=member.id, action="account.password_recovered", subject_id=member.id)
        if request.user.is_authenticated and request.user.id == member.id:
            logout(request)
        return response(
            {"changed": True, "message": "Password changed. Sign in again on your devices."}
        )
