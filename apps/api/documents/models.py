from config.models import Record
from django.conf import settings
from django.db import models


class Document(Record):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    name = models.CharField(max_length=160)
    purpose = models.CharField(max_length=40)
    storage_key = models.CharField(max_length=200)
    content_type = models.CharField(max_length=80)
    size = models.PositiveIntegerField()
    status = models.CharField(max_length=30, default="quarantined")
    provenance = models.CharField(max_length=30, default="sandbox")
    legal_hold = models.BooleanField(default=False)
    retain_until = models.DateTimeField(null=True, blank=True)
