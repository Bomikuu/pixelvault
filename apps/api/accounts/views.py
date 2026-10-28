from datetime import timedelta

from config.errors import DomainError
from config.views import MemberView
from django.conf import settings
from django.contrib.auth import authenticate, login, logout
from django.middleware.csrf import get_token
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .models import Member
from .services import register_member


def member_data(member):
    return {
        "id": str(member.pk),
        "email": member.email,
        "display_name": member.display_name or member.username,
        "area": member.area,
        "bio": member.bio,
        "suspended": member.suspended,
        "literacy_completed": member.literacy_completed,
        "staff_role": member.staff_role,
        "is_staff": member.is_staff,
    }


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
    def patch(self, request):
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
                setattr(request.user, field, value.strip())
        request.user.save()
        return Response(member_data(request.user))


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
