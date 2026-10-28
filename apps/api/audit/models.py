from config.models import Record
from django.conf import settings
from django.db import models


class AuditEntry(Record):
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.PROTECT)
    action = models.CharField(max_length=100)
    subject_id = models.UUIDField(null=True)
    reason = models.CharField(max_length=300, blank=True)

    def save(self, *args, **kwargs):
        if not self._state.adding:
            raise ValueError("Audit history is append-only")
        super().save(*args, **kwargs)


class OutboxMessage(Record):
    kind = models.CharField(max_length=100)
    subject_id = models.UUIDField()
    payload = models.JSONField(default=dict)
    dedupe_key = models.CharField(max_length=200, unique=True)
    status = models.CharField(max_length=20, default="pending")
    attempts = models.PositiveIntegerField(default=0)
    last_error = models.CharField(max_length=100, blank=True)
