import uuid
from datetime import timedelta

from config.errors import DomainError
from config.views import MemberView
from django.conf import settings
from django.contrib.auth import authenticate, login, logout
from django.db import IntegrityError, transaction
from django.http import HttpResponse
from django.middleware.csrf import get_token
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .models import Member
from .profile import contact_data, own_profile_details, photo_url
from .services import normalize_email, normalize_phone, register_member, validate_avatar_key


def member_data(member):
    from community.reputation import reputation_summary

    return {
        "id": str(member.pk),
        "email": member.email,
        "display_name": member.display_name or member.username,
        "area": member.area,
        "bio": member.bio,
        "avatar_key": member.avatar_key,
        "photo_url": photo_url(member),
        "suspended": member.suspended,
        "literacy_completed": member.literacy_completed,
        "staff_role": member.staff_role,
        "is_staff": member.is_staff,
        "community_reputation": reputation_summary(member, own=True),
        **own_profile_details(member),
    }


class PresenceView(MemberView):
    def post(self, request):
        from django.db.models import Q

        now = timezone.now()
        Member.objects.filter(pk=request.user.pk).filter(
            Q(last_active_at__isnull=True) | Q(last_active_at__lte=now - timedelta(seconds=30))
        ).update(last_active_at=now)
        response = Response({"recorded": True})
        response["Cache-Control"] = "private, no-store"
        return response


class SessionView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response(
            {
                "member": member_data(request.user) if request.user.is_authenticated else None,
                "environment": settings.ENVIRONMENT,
                "csrf_token": get_token(request),
            }
        )


@method_decorator(csrf_protect, name="dispatch")
class SignInView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"

    def post(self, request):
        candidate = Member.objects.filter(
            email__iexact=str(request.data.get("email", "")).strip()
        ).first()
        member = authenticate(
            request,
            username=candidate.username if candidate else "unknown-account",
            password=request.data.get("password", ""),
        )
        if not member:
            raise DomainError("INVALID_CREDENTIALS", "Check your email and password.", 401)
        login(request, member)
        return Response(
            {
                "member": member_data(member),
                "environment": settings.ENVIRONMENT,
                "csrf_token": get_token(request),
            }
        )


@method_decorator(csrf_protect, name="dispatch")
class RegisterView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"

    def post(self, request):
        member = register_member(
            email=request.data.get("email", ""),
            password=request.data.get("password", ""),
            accepted_policy_version=request.data.get("accepted_policy_version", ""),
            display_name=str(request.data.get("display_name", "")),
            phone=request.data.get("mobile_number", ""),
        )
        login(request, member)
        return Response(
            {
                "member": member_data(member),
                "environment": settings.ENVIRONMENT,
                "csrf_token": get_token(request),
            },
            status=201,
        )


class SignOutView(MemberView):
    def post(self, request):
        request.user.staff_step_up_until = None
        request.user.save(update_fields=["staff_step_up_until"])
        logout(request)
        return Response({"signed_out": True})


class ProfileView(MemberView):
    @transaction.atomic
    def patch(self, request):
        request.user = Member.objects.select_for_update().get(pk=request.user.id)
        if set(request.data) - {"display_name", "area", "bio", "avatar_key", "photo_mode"}:
            raise DomainError(
                "INVALID_PROFILE",
                "Only your display name, city, bio and avatar may be edited here.",
            )
        changes = {}
        if "avatar_key" in request.data:
            changes["avatar_key"] = validate_avatar_key(request.data["avatar_key"])
            if "photo_mode" not in request.data:
                changes["photo_mode"] = "avatar"
        if "photo_mode" in request.data:
            mode = request.data["photo_mode"]
            if mode not in ("avatar", "photo") or (
                mode == "photo" and not request.user.profile_photo_id
            ):
                raise DomainError(
                    "INVALID_PHOTO_MODE", "Upload a photo first, or choose an illustrated avatar."
                )
            changes["photo_mode"] = mode
        for field, limit in [("display_name", 100), ("area", 80), ("bio", 400)]:
            if field in request.data:
                value = request.data[field]
                if not isinstance(value, str) or len(value) > limit:
                    raise DomainError(
                        "INVALID_PROFILE", f"{field.replace('_', ' ').capitalize()} is too long."
                    )
                if field == "area":
                    from community.locations import coarse_area

                    value = coarse_area(area_code=value)["name"]
                changes[field] = value.strip()
        for field, value in changes.items():
            setattr(request.user, field, value)
        if changes:
            request.user.save(update_fields=list(changes))
        return Response(member_data(request.user))


class ContactView(MemberView):
    def get(self, request):
        return Response(contact_data(request.user))

    def patch(self, request):
        from verification.models import VerificationCase

        if not request.data or set(request.data) - {"email", "mobile_number"}:
            raise DomainError("INVALID_CONTACTS", "Edit only your contact email and mobile number.")
        changes = {}
        if "email" in request.data:
            changes["email"] = normalize_email(request.data["email"])
        if "mobile_number" in request.data:
            changes["mobile_number"] = normalize_phone(request.data["mobile_number"])
        try:
            with transaction.atomic():
                member = Member.objects.select_for_update().get(pk=request.user.id)
                if (
                    "email" in changes
                    and Member.objects.filter(email__iexact=changes["email"])
                    .exclude(pk=member.id)
                    .exists()
                ):
                    raise DomainError(
                        "CONTACT_UNAVAILABLE",
                        "This email cannot be used. Choose another address.",
                        409,
                    )
                changed = {
                    key: value for key, value in changes.items() if getattr(member, key) != value
                }
                if changed:
                    for key, value in changed.items():
                        setattr(member, key, value)
                    member.save(update_fields=list(changed))
                    VerificationCase.objects.create(
                        member=member,
                        kind="contact",
                        status="needs_information",
                        provenance="self_reported",
                        reason="Contact details changed; new contact evidence is required.",
                    )
                return Response(contact_data(member))
        except IntegrityError:
            raise DomainError(
                "CONTACT_UNAVAILABLE", "This email cannot be used. Choose another address.", 409
            ) from None


class ProfilePhotoView(MemberView):
    @transaction.atomic
    def post(self, request):
        from .photos import sanitized_photo

        if set(request.data) - {"photo"}:
            raise DomainError("INVALID_PHOTO", "Upload one profile photo using the photo field.")
        raw = sanitized_photo(request.FILES.get("photo"))
        member = Member.objects.select_for_update().get(pk=request.user.id)
        member.profile_photo = raw
        member.profile_photo_id = uuid.uuid4()
        member.photo_mode = "photo"
        member.save(update_fields=["profile_photo", "profile_photo_id", "photo_mode"])
        return Response(member_data(member), status=201)

    @transaction.atomic
    def delete(self, request):
        member = Member.objects.select_for_update().get(pk=request.user.id)
        member.profile_photo = b""
        member.profile_photo_id = None
        member.photo_mode = "avatar"
        member.save(update_fields=["profile_photo", "profile_photo_id", "photo_mode"])
        return Response(member_data(member))


class PublicPhotoView(APIView):
    permission_classes = (AllowAny,)

    def get(self, request, photo_id):
        member = get_object_or_404(
            Member, profile_photo_id=photo_id, is_active=True, suspended=False
        )
        if not member.profile_photo or (
            member.photo_mode != "photo" and request.user.pk != member.pk
        ):
            from django.http import Http404

            raise Http404
        response = HttpResponse(bytes(member.profile_photo), content_type="image/jpeg")
        response["Cache-Control"] = "private, no-store"
        response["Content-Disposition"] = 'inline; filename="profile.jpg"'
        response["X-Content-Type-Options"] = "nosniff"
        return response


class LiteracyView(MemberView):
    def get(self, request):
        return Response(
            {
                "questions": [
                    {
                        "prompt": "Does an identity check guarantee repayment?",
                        "options": ["Yes", "No"],
                    },
                    {
                        "prompt": "What should you compare before accepting?",
                        "options": [
                            "Only the advertised rate",
                            "Total cost and exact payment dates",
                        ],
                    },
                    {"prompt": "Is an offer a preapproved credit line?", "options": ["Yes", "No"]},
                ],
                "completed": request.user.literacy_completed,
            }
        )

    def post(self, request):
        if request.data.get("answers") != [1, 1, 1]:
            raise DomainError(
                "REVIEW_LESSON", "Review the cost and verification explanations, then try again."
            )
        request.user.literacy_completed = True
        request.user.save(update_fields=["literacy_completed"])
        return Response({"completed": True})


class StepUpView(MemberView):
    def post(self, request):
        if not request.user.is_staff or not request.user.check_password(
            request.data.get("password", "")
        ):
            raise DomainError("INVALID_CREDENTIALS", "Confirm your staff password.", 403)
        if settings.ENVIRONMENT != "test":
            raise DomainError(
                "MFA_REQUIRED", "Production MFA is not configured; review is unavailable.", 403
            )
        request.user.staff_step_up_until = timezone.now() + timedelta(minutes=5)
        request.user.save(update_fields=["staff_step_up_until"])
        return Response(
            {
                "expires_at": request.user.staff_step_up_until,
                "provenance": "sandbox_password_reauthentication",
            }
        )
