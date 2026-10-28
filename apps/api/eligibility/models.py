from config.models import Record
from django.conf import settings
from django.db import models


class LenderRegistration(Record):
    member = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    status = models.CharField(max_length=30, default="not_submitted")
    authority = models.CharField(max_length=150, blank=True)
    evidence_ref = models.CharField(max_length=200, blank=True)
    reason = models.CharField(max_length=300, blank=True)
    version = models.PositiveIntegerField(default=1)
    valid_until = models.DateTimeField(null=True, blank=True)


class ProductPolicy(Record):
    version = models.CharField(max_length=60, unique=True)
    environment = models.CharField(max_length=10, default="test")
    approved = models.BooleanField(default=False)
    evidence_ref = models.CharField(max_length=200, blank=True)
    rules = models.JSONField(default=dict)
