from config.models import Record
from django.conf import settings
from django.db import models


class ProfileSettings(Record):
    member = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="community_settings"
    )
    public_award_ids = models.JSONField(default=list)
    avatar_frame = models.CharField(max_length=20, default="plain")
    avatar_flair_id = models.UUIDField(null=True, blank=True)
    show_reputation = models.BooleanField(default=True)
    leaderboard_opt_in = models.BooleanField(default=False)
    show_lending_totals = models.BooleanField(default=False)


class Contribution(Record):
    member = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    title = models.CharField(max_length=120)
    body = models.TextField()
    status = models.CharField(max_length=20, default="pending")
    moderator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        on_delete=models.PROTECT,
        related_name="moderated_contributions",
    )
    moderation_reason = models.TextField(blank=True)
    version = models.PositiveIntegerField(default=1)


class Award(Record):
    member = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="community_awards"
    )
    key = models.CharField(max_length=40)
    rule_version = models.CharField(max_length=30, default="v1")
    evidence = models.JSONField(default=list)
    eligible = models.BooleanField(default=True)
    earned_at = models.DateTimeField()
    private = models.BooleanField(default=False)

    class Meta:
        constraints = [  # noqa: RUF012 -- Django model metadata
            models.UniqueConstraint(
                fields=["member", "key", "rule_version"], name="unique_member_award_rule"
            )
        ]


class AwardCorrection(Record):
    award = models.ForeignKey(Award, on_delete=models.PROTECT, related_name="corrections")
    reason = models.CharField(max_length=100)
    evidence = models.JSONField(default=list)
    eligible = models.BooleanField()


class AchievementHold(Record):
    member = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    reason = models.CharField(max_length=100)
    resolved = models.BooleanField(default=False)


class Thread(Record):
    investment_context = models.UUIDField(null=True, blank=True, unique=True)
    loan_id = models.UUIDField(null=True, blank=True, unique=True)
    application_id = models.UUIDField(null=True, blank=True, unique=True)
    participants = models.ManyToManyField(
        settings.AUTH_USER_MODEL, related_name="community_threads"
    )

    class Meta:
        constraints = [  # noqa: RUF012 -- Django model metadata
            models.CheckConstraint(
                condition=(
                    models.Q(
                        loan_id__isnull=False,
                        application_id__isnull=True,
                        investment_context__isnull=True,
                    )
                    | models.Q(
                        loan_id__isnull=True,
                        application_id__isnull=False,
                        investment_context__isnull=True,
                    )
                    | models.Q(
                        loan_id__isnull=True,
                        application_id__isnull=True,
                        investment_context__isnull=False,
                    )
                ),
                name="thread_single_context",
            )
        ]


class Message(Record):
    thread = models.ForeignKey(Thread, on_delete=models.PROTECT, related_name="messages")
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    body = models.TextField()
    operation_id = models.UUIDField()

    class Meta:
        constraints = [  # noqa: RUF012 -- Django model metadata
            models.UniqueConstraint(
                fields=["sender", "operation_id"], name="unique_message_operation"
            )
        ]


class Review(Record):
    loan_id = models.UUIDField()
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="authored_reviews"
    )
    subject = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="received_reviews"
    )
    ratings = models.JSONField()
    body = models.TextField(blank=True)
    recommendation = models.CharField(
        max_length=4,
        choices=(("up", "Recommend"), ("down", "Do not recommend")),
        null=True,
        blank=True,
        default=None,
    )
    operation_id = models.UUIDField()
    status = models.CharField(max_length=20, default="pending")
    moderation_reason = models.TextField(blank=True)
    moderator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        on_delete=models.PROTECT,
        related_name="moderated_reviews",
    )
    version = models.PositiveIntegerField(default=1)
    published_at = models.DateTimeField(null=True)
    response = models.TextField(blank=True)
    response_status = models.CharField(max_length=20, default="none")

    class Meta:
        constraints = [  # noqa: RUF012 -- Django model metadata
            models.UniqueConstraint(fields=["loan_id", "author"], name="one_review_per_loan_party"),
            models.UniqueConstraint(
                fields=["author", "operation_id"], name="unique_review_operation"
            ),
        ]


class ContentReport(Record):
    reporter = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    content_type = models.CharField(max_length=20)
    content_id = models.UUIDField()
    reason = models.TextField()
    status = models.CharField(max_length=20, default="open")


class ModerationHistory(Record):
    content_type = models.CharField(max_length=20)
    content_id = models.UUIDField()
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    decision = models.CharField(max_length=30)
    reason = models.TextField()
    previous_version = models.PositiveIntegerField()
