from accounts.permissions import require_staff
from audit.services import record_audit
from config.errors import DomainError
from config.views import MemberView
from django.db import transaction
from django.shortcuts import get_object_or_404
from documents.models import Document
from eligibility.models import LenderRegistration
from rest_framework.response import Response

from .models import VerificationCase
from .services import review_check

KINDS = ["identity", "income", "contact", "funding_account"]


def case_data(case):
    return {
        "id": str(case.pk),
        "member_id": str(case.member_id),
        "member_name": str(case.member),
        "kind": case.kind,
        "status": case.status,
        "reason": case.reason,
        "expires_at": case.expires_at,
        "version": case.version,
        "provenance": case.provenance,
        "document_id": str(case.document_id) if case.document_id else None,
    }


def registration_data(registration):
    return {
        "id": str(registration.pk),
        "status": registration.status,
        "authority": registration.authority,
        "evidence_ref": registration.evidence_ref,
        "reason": registration.reason,
        "version": registration.version,
        "legal_authorization": False,
    }


class VerificationView(MemberView):
    def get(self, request):
        return Response(
            {
                "cases": [
                    case_data(c)
                    for c in VerificationCase.objects.filter(member=request.user).order_by(
                        "-created_at"
                    )
                ],
                "required_checks": KINDS,
                "environment": "test",
            }
        )

    def post(self, request):
        kind = request.data.get("kind")
        if kind not in KINDS:
            raise DomainError("INVALID_CHECK", "Choose a supported verification check.")
        document = None
        if request.data.get("document_id"):
            document = get_object_or_404(
                Document, pk=request.data["document_id"], owner=request.user
            )
        if kind in {"identity", "income", "funding_account"} and not document:
            raise DomainError("EVIDENCE_REQUIRED", "Attach the appropriate private evidence file.")
        pending = VerificationCase.objects.filter(
            member=request.user, kind=kind, status__in=["submitted", "under_review"]
        )
        if pending.exists():
            raise DomainError("ALREADY_SUBMITTED", "This check is already awaiting review.", 409)
        case = VerificationCase.objects.create(
            member=request.user,
            kind=kind,
            document=document,
            notes=str(request.data.get("notes", ""))[:500],
        )
        return Response(case_data(case), status=201)


class ReviewQueueView(MemberView):
    def get(self, request):
        require_staff(request.user, {"reviewer"})
        cases = VerificationCase.objects.select_related("member").all().order_by("created_at")
        if request.user.staff_role != "admin":
            cases = cases.filter(assigned_to=request.user)
        return Response([case_data(c) for c in cases[:100]])


class ReviewView(MemberView):
    def get(self, request, case_id):
        require_staff(request.user, {"reviewer"})
        case = get_object_or_404(VerificationCase.objects.select_related("member"), pk=case_id)
        if request.user.staff_role != "admin" and case.assigned_to_id != request.user.pk:
            raise DomainError("FORBIDDEN", "This case is assigned to another reviewer.", 403)
        return Response(case_data(case))

    def post(self, request, case_id):
        require_staff(request.user, {"reviewer"})
        get_object_or_404(VerificationCase, pk=case_id)
        return Response(
            case_data(
                review_check(
                    actor_id=request.user.pk,
                    case_id=case_id,
                    expected_version=request.data.get("expected_version"),
                    outcome=request.data.get("outcome"),
                    reason=request.data.get("reason", ""),
                )
            )
        )


class RegistrationView(MemberView):
    def get(self, request):
        registration, _ = LenderRegistration.objects.get_or_create(member=request.user)
        return Response(registration_data(registration))

    @transaction.atomic
    def post(self, request):
        registration, _ = LenderRegistration.objects.get_or_create(member=request.user)
        registration = LenderRegistration.objects.select_for_update().get(pk=registration.pk)
        authority, evidence = (
            request.data.get("authority", ""),
            request.data.get("evidence_ref", ""),
        )
        if (
            not isinstance(authority, str)
            or not isinstance(evidence, str)
            or not authority.strip()
            or not evidence.strip()
        ):
            raise DomainError(
                "EVIDENCE_REQUIRED", "Provide the authority and evidence reference for review."
            )
        registration.authority, registration.evidence_ref = authority[:150], evidence[:200]
        registration.status = "submitted"
        registration.version += 1
        registration.save()
        return Response(registration_data(registration))


class RegistrationReviewView(MemberView):
    def get(self, request, registration_id):
        require_staff(request.user, {"reviewer"})
        registration = get_object_or_404(
            LenderRegistration.objects.select_related("member"), pk=registration_id
        )
        return Response(
            {
                **registration_data(registration),
                "member_id": str(registration.member_id),
                "member_name": str(registration.member),
            }
        )

    @transaction.atomic
    def post(self, request, registration_id):
        registration = get_object_or_404(
            LenderRegistration.objects.select_for_update(), pk=registration_id
        )
        require_staff(request.user, {"reviewer"}, sensitive=True, subject_id=registration.member_id)
        if (
            type(request.data.get("expected_version")) is not int
            or request.data.get("expected_version") != registration.version
        ):
            raise DomainError("STALE_VERSION", "Refresh this registration before deciding.", 409)
        outcome = request.data.get("outcome")
        if outcome not in {
            "evidence_reviewed",
            "needs_information",
            "rejected",
            "suspended",
            "revoked",
        } or not request.data.get("reason"):
            raise DomainError("INVALID_DECISION", "Choose an outcome and provide a reason.")
        registration.status, registration.reason = outcome, str(request.data["reason"])[:300]
        registration.version += 1
        registration.save()
        record_audit(
            actor_id=request.user.pk,
            action="registration.review",
            subject_id=registration.pk,
            reason=registration.reason,
        )
        return Response(registration_data(registration))
