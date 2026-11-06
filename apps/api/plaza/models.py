from config.models import Record
from django.conf import settings
from django.db import models


class Bubble(Record):
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    room_slug = models.CharField(max_length=40)
    body = models.CharField(max_length=120)
    offer = models.ForeignKey("marketplace.LendingOffer", null=True, blank=True, on_delete=models.SET_NULL)
    operation_id = models.UUIDField()
    fingerprint = models.CharField(max_length=64)
    visible_until = models.DateTimeField()
    status = models.CharField(max_length=16, default="visible")
    version = models.PositiveIntegerField(default=1)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["author", "operation_id"], name="plaza_bubble_operation")]
        indexes = [models.Index(fields=["room_slug", "status", "visible_until"], name="plaza_bubble_visibility")]
