from .models import AuditEntry


def record_audit(*, actor_id, action, subject_id=None, reason=""):
    return AuditEntry.objects.create(
        actor_id=actor_id, action=action, subject_id=subject_id, reason=reason[:300]
    ).pk
