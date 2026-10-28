from config.models import Record
from django.conf import settings
from django.db import models


class Case(Record):
    opened_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="opened_cases"
    )
    loan_id = models.UUIDField(null=True, blank=True)
    kind = models.CharField(max_length=30)
    body = models.TextField()
    operation_id = models.UUIDField()
    status = models.CharField(max_length=30, default="open")
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="assigned_cases",
    )
    version = models.PositiveIntegerField(default=1)
    legal_remedy_reviewed = models.BooleanField(default=False)
    legal_remedy_reason = models.TextField(blank=True)

    class Meta:
        constraints = [  # noqa: RUF012 -- Django model metadata
            models.UniqueConstraint(
                fields=["opened_by", "operation_id"], name="unique_case_operation"
            )
        ]


class CaseDecision(Record):
    case = models.ForeignKey(Case, on_delete=models.PROTECT, related_name="decisions")
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    decision = models.CharField(max_length=30)
    reason = models.TextField()
    previous_version = models.PositiveIntegerField()


class CaseResponse(Record):
    case = models.ForeignKey(Case, on_delete=models.PROTECT, related_name="responses")
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    body = models.TextField()


class NoticePreference(Record):
    member = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    channel = models.CharField(max_length=20, default="in_app")
    debt_reminders = models.BooleanField(default=True)


class Notice(Record):
    loan_id = models.UUIDField()
    member = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    channel = models.CharField(max_length=20, default="in_app")
    local_date = models.DateField()
    kind = models.CharField(max_length=30, default="payment_reminder")
    body = models.TextField()
    status = models.CharField(max_length=20, default="captured")

    class Meta:
        constraints = [  # noqa: RUF012 -- Django model metadata
            models.UniqueConstraint(
                fields=["member", "local_date", "kind"],
                name="one_daily_debt_notice_across_channels",
            )
        ]


class AmendmentProposal(Record):
    loan_id = models.UUIDField()
    case = models.ForeignKey(Case, null=True, on_delete=models.PROTECT)
    proposed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    terms = models.JSONField()
    disclosures = models.JSONField()
    original_agreement_hash = models.CharField(max_length=64)
    proposal_hash = models.CharField(max_length=64)
    reason = models.TextField()
    status = models.CharField(max_length=30, default="awaiting_acceptance")
    version = models.PositiveIntegerField(default=1)

    def save(self, *args, **kwargs):
        if not self._state.adding:
            from config.errors import DomainError

            original = type(self).objects.get(pk=self.pk)
            fields = (
                "loan_id",
                "terms",
                "disclosures",
                "original_agreement_hash",
                "proposal_hash",
                "reason",
                "proposed_by_id",
            )
            if any(getattr(original, field) != getattr(self, field) for field in fields):
                raise DomainError(
                    "immutable_amendment",
                    "Create a new proposal; reviewed amendment terms cannot be edited.",
                    409,
                )
        return super().save(*args, **kwargs)


class AmendmentAcceptance(Record):
    proposal = models.ForeignKey(
        AmendmentProposal, on_delete=models.PROTECT, related_name="acceptances"
    )
    member = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    proposal_hash = models.CharField(max_length=64)

    class Meta:
        constraints = [  # noqa: RUF012 -- Django model metadata
            models.UniqueConstraint(
                fields=["proposal", "member"], name="one_amendment_acceptance_per_party"
            )
        ]
