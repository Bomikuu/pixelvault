from pathlib import Path

from audit.services import record_audit
from config.errors import DomainError
from django.conf import settings
from django.utils import timezone

from .models import Document


def apply_retention(*, at=None, dry_run=True):
    if settings.ENVIRONMENT != "test":
        raise DomainError(
            "RETENTION_POLICY_REQUIRED", "A reviewed production retention policy is required.", 403
        )
    due = Document.objects.filter(retain_until__lte=at or timezone.now()).exclude(status="deleted")
    held = due.filter(legal_hold=True).count()
    deleted = []
    for document in due.filter(legal_hold=False):
        deleted.append(str(document.pk))
        if not dry_run:
            (Path(settings.MEDIA_ROOT) / document.storage_key).unlink(missing_ok=True)
            document.status = "deleted"
            document.name = "Deleted evidence"
            document.save()
            record_audit(
                actor_id=None, action="document.retained_period_expired", subject_id=document.pk
            )
    return {"deleted": deleted, "held": held, "dry_run": dry_run}
