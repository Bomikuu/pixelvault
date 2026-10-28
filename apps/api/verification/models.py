from config.models import Record
from django.conf import settings
from django.db import models


class VerificationCase(Record):
    member = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="verification_cases"
    )
    kind = models.CharField(max_length=30)
    status = models.CharField(max_length=30, default="submitted")
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="assigned_checks",
    )
    document = models.ForeignKey(
        "documents.Document", null=True, blank=True, on_delete=models.PROTECT
    )
    expires_at = models.DateTimeField(null=True, blank=True)
    provenance = models.CharField(max_length=30, default="sandbox")
    notes = models.CharField(max_length=500, blank=True)
    reason = models.CharField(max_length=300, blank=True)
    version = models.PositiveIntegerField(default=1)
