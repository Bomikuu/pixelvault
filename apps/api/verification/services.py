from datetime import timedelta

from accounts.models import Member
from accounts.permissions import require_staff
from audit.services import record_audit
from config.errors import DomainError
from django.db import transaction
from django.utils import timezone

from .models import VerificationCase


@transaction.atomic
def review_check(*, actor_id, case_id, expected_version, outcome, reason):
    actor = Member.objects.get(pk=actor_id)
    case = VerificationCase.objects.select_for_update().get(pk=case_id)
    require_staff(actor, {"reviewer"}, sensitive=True, subject_id=case.member_id)
    if actor.staff_role != "admin" and case.assigned_to_id != actor.pk:
        raise DomainError("FORBIDDEN", "This case is assigned to another reviewer.", 403)
    if type(expected_version) is not int or case.version != expected_version:
        raise DomainError("STALE_VERSION", "This case changed. Refresh it before deciding.", 409)
    if outcome not in {"approved", "rejected", "needs_information"} or not str(reason).strip():
        raise DomainError("REASON_REQUIRED", "Choose an outcome and provide a reason.")
    if outcome == "approved" and case.document_id and case.document.status != "clean":
        raise DomainError(
            "DOCUMENT_QUARANTINED", "Evidence must pass its configured scan before review."
        )
    case.status, case.reason = outcome, reason[:300]
    case.version += 1
    case.expires_at = timezone.now() + timedelta(days=90) if outcome == "approved" else None
    case.save()
    record_audit(
        actor_id=actor.pk, action="verification.review", subject_id=case.pk, reason=case.reason
    )
    return case
