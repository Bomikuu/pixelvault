from dataclasses import dataclass

from accounts.models import Member
from django.conf import settings
from django.utils import timezone
from verification.models import VerificationCase


@dataclass(frozen=True)
class EligibilityResult:
    allowed: bool
    reasons: tuple[str, ...]
    policy_version: str = "demo-v1"


def check_eligibility(*, member_id, purpose, at=None):
    at = at or timezone.now()
    member = Member.objects.filter(pk=member_id, is_active=True).first()
    if not member:
        return EligibilityResult(False, ("MEMBER_UNAVAILABLE",))
    if purpose in {"repay", "view_document", "complain", "read"}:
        return EligibilityResult(True, ())
    if purpose not in {"post_offer", "apply", "accept", "disburse", "borrow", "lend"}:
        return EligibilityResult(False, ("UNKNOWN_PURPOSE",))
    reasons = []
    if settings.ENVIRONMENT == "live":
        reasons.append("LIVE_ORIGINATION_NOT_APPROVED")
    if member.suspended:
        reasons.append("NEW_ACTIVITY_RESTRICTED")
    kinds = ["identity", "contact", "funding_account"]
    if purpose not in {"post_offer", "lend"}:
        kinds.append("income")
    for kind in kinds:
        case = (
            VerificationCase.objects.filter(member=member, kind=kind)
            .order_by("-created_at")
            .first()
        )
        if not case or case.status != "approved" or (case.expires_at and case.expires_at <= at):
            reasons.append(f"{kind.upper()}_CHECK_REQUIRED")
    return EligibilityResult(not reasons, tuple(reasons))
