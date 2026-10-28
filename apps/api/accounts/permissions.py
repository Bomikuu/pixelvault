from config.errors import DomainError
from django.utils import timezone

from .models import Member


def require_staff(member, roles, *, sensitive=False, subject_id=None):
    if not member.is_active or not member.is_staff or member.staff_role not in {*roles, "admin"}:
        raise DomainError("FORBIDDEN", "This action requires an assigned staff role.", 403)
    if subject_id and str(member.pk) == str(subject_id):
        raise DomainError("SELF_REVIEW_FORBIDDEN", "Another reviewer must decide this case.", 403)
    if sensitive and (
        not member.staff_step_up_until or member.staff_step_up_until <= timezone.now()
    ):
        raise DomainError(
            "STEP_UP_REQUIRED", "Confirm your identity again before reviewing evidence.", 403
        )


def authorize(*, actor_id, action, subject_id=None):
    actor = Member.objects.filter(pk=actor_id, is_active=True).first()
    if not actor:
        raise DomainError("FORBIDDEN", "This record is unavailable.", 403)
    if action in {"verification.review", "registration.review"}:
        require_staff(actor, {"reviewer"}, sensitive=True, subject_id=subject_id)
        return
    if subject_id is None or str(subject_id) == str(actor.pk):
        if action in {
            "read",
            "repay",
            "complain",
            "view_document",
            "profile.edit",
            "apply",
            "accept",
            "post_offer",
            "disburse",
        }:
            return
    raise DomainError("FORBIDDEN", "This record is unavailable.", 403)
