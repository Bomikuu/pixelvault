from audit.models import AuditEntry
from config.errors import DomainError
from config.views import MemberView
from django.conf import settings
from django.db import IntegrityError
from eligibility.models import LenderRegistration, ProductPolicy
from rest_framework.response import Response
from verification.views import registration_data

from .permissions import require_staff


class AuditView(MemberView):
    def get(self, request):
        require_staff(request.user, {"finance"})
        return Response(
            [
                {
                    "id": str(row.pk),
                    "action": row.action,
                    "subject_id": str(row.subject_id) if row.subject_id else None,
                    "actor_id": str(row.actor_id) if row.actor_id else None,
                    "reason": row.reason,
                    "created_at": row.created_at,
                }
                for row in AuditEntry.objects.order_by("-created_at")[:100]
            ]
        )


class PoliciesView(MemberView):
    def get(self, request):
        require_staff(request.user, {"finance"})
        return Response(
            [
                {
                    "id": str(p.pk),
                    "version": p.version,
                    "environment": p.environment,
                    "approved": p.approved,
                    "evidence_ref": p.evidence_ref,
                    "rules": p.rules,
                }
                for p in ProductPolicy.objects.order_by("-created_at")
            ]
        )

    def post(self, request):
        require_staff(request.user, set(), sensitive=True)
        if settings.ENVIRONMENT != "test":
            raise DomainError(
                "LIVE_POLICY_UNAVAILABLE",
                "Live policy activation requires an approved operational arrangement.",
                403,
            )
        rules = request.data.get("rules", {})
        required = {
            "min_principal",
            "max_principal",
            "max_annual_rate_bps",
            "max_installments",
            "allowed_frequencies",
            "commission_bps",
        }
        if not isinstance(rules, dict) or set(rules) != required:
            raise DomainError("INVALID_POLICY", "Provide the complete supported policy rule set.")
        for key in required - {"allowed_frequencies"}:
            if type(rules[key]) is not int or rules[key] < 0:
                raise DomainError(
                    "INVALID_POLICY", "Policy amounts and limits must be nonnegative integers."
                )
        if (
            not 0 < rules["min_principal"] <= rules["max_principal"] <= 9007199254740991
            or not 1 <= rules["max_installments"] <= 120
        ):
            raise DomainError("INVALID_POLICY", "Choose valid amount and installment bounds.")
        if (
            not isinstance(rules["allowed_frequencies"], list)
            or not rules["allowed_frequencies"]
            or not set(rules["allowed_frequencies"])
            <= {"weekly", "twice_monthly", "monthly", "maturity"}
        ):
            raise DomainError("INVALID_POLICY", "Choose supported payment frequencies.")
        version = request.data.get("version")
        evidence = request.data.get("evidence_ref")
        if (
            not isinstance(version, str)
            or not 1 <= len(version) <= 60
            or not isinstance(evidence, str)
            or not evidence.strip()
            or len(evidence) > 200
        ):
            raise DomainError(
                "INVALID_POLICY", "Provide a unique version and a test-review evidence reference."
            )
        try:
            policy = ProductPolicy.objects.create(
                version=version,
                environment="test",
                approved=True,
                evidence_ref=evidence,
                rules=rules,
            )
        except IntegrityError:
            raise DomainError(
                "POLICY_EXISTS",
                "Create a new policy version; existing versions are immutable.",
                409,
            ) from None
        return Response(
            {"id": str(policy.pk), "version": policy.version, "environment": "test"}, status=201
        )


class TemplatesView(MemberView):
    def get(self, request):
        require_staff(request.user, {"reviewer", "finance"})
        from agreements.models import AgreementVersion

        versions = list(
            AgreementVersion.objects.values_list("template_version", flat=True).distinct()
        )
        return Response(
            {
                "templates": [
                    {
                        "version": v,
                        "reviewed": False,
                        "environment": "test",
                        "status": "unreviewed_test_template",
                    }
                    for v in versions or ["unreviewed-demo-v1"]
                ],
                "live_activation_available": False,
                "explanation": "Generated agreements are sandbox templates. A lawyer-reviewed production template and signing arrangement have not been configured.",
            }
        )


class RegistrationQueueView(MemberView):
    def get(self, request):
        require_staff(request.user, {"reviewer"})
        return Response(
            [
                {
                    **registration_data(row),
                    "member_id": str(row.member_id),
                    "member_name": str(row.member),
                }
                for row in LenderRegistration.objects.select_related("member").order_by(
                    "created_at"
                )[:100]
            ]
        )
