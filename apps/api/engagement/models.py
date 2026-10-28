from config.models import Record
from django.conf import settings
from django.db import models


class OfferLike(Record):
    offer = models.ForeignKey("marketplace.LendingOffer", on_delete=models.PROTECT)
    member = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    liked = models.BooleanField(default=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["offer", "member"], name="engagement_one_like")
        ]


class OfferReaction(Record):
    offer = models.ForeignKey("marketplace.LendingOffer", on_delete=models.PROTECT)
    member = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    award = models.ForeignKey("community.Award", on_delete=models.PROTECT)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["offer", "member"], name="engagement_one_reaction")
        ]


class OfferComment(Record):
    offer = models.ForeignKey("marketplace.LendingOffer", on_delete=models.PROTECT)
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    body = models.CharField(max_length=1200)
    status = models.CharField(max_length=16, default="pending")
    operation_id = models.UUIDField()
    version = models.PositiveIntegerField(default=1)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["author", "operation_id"], name="engagement_comment_operation"
            )
        ]


class CommentReport(Record):
    comment = models.ForeignKey(OfferComment, on_delete=models.PROTECT, related_name="reports")
    reporter = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    reason = models.CharField(max_length=1000)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["comment", "reporter"], name="engagement_one_comment_report"
            )
        ]


class CommentDecision(Record):
    comment = models.ForeignKey(OfferComment, on_delete=models.PROTECT)
    moderator = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    decision = models.CharField(max_length=16)
    reason = models.CharField(max_length=1000)
    previous_version = models.PositiveIntegerField()
