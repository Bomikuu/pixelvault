from config.models import Record
from django.conf import settings
from django.db import models


class SavedOffer(Record):
    member = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    offer = models.ForeignKey("marketplace.LendingOffer", on_delete=models.CASCADE)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["member", "offer"], name="unique_saved_offer")
        ]


class ActionRead(Record):
    member = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    key = models.CharField(max_length=220)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["member", "key"], name="unique_action_read")]


class ThreadRead(Record):
    member = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    thread = models.ForeignKey("community.Thread", on_delete=models.CASCADE)
    through = models.DateTimeField()

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["member", "thread"], name="unique_thread_read")
        ]
