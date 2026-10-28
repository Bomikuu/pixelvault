from config.errors import DomainError
from config.models import Record
from django.conf import settings
from django.db import models
from django.db.models import F, Q


class Loan(Record):
    agreement = models.OneToOneField(
        "agreements.AgreementVersion", on_delete=models.PROTECT, related_name="loan"
    )
    lender = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="lent_loans"
    )
    borrower = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="borrowed_loans"
    )
    status = models.CharField(max_length=32, default="awaiting_disbursement")
    active_terms = models.JSONField(null=True)
    active_disclosure = models.JSONField(null=True)
    active_amendment_id = models.UUIDField(null=True)
    disbursement_status = models.CharField(max_length=32, default="not_requested")
    settlement_status = models.CharField(max_length=24, default="unknown")
    principal_balance = models.PositiveBigIntegerField(default=0)
    interest_balance = models.PositiveBigIntegerField(default=0)
    accrued_through = models.DateField(null=True)
    accrual_exact = models.DecimalField(max_digits=36, decimal_places=16, default=0)
    interest_posted = models.PositiveBigIntegerField(default=0)
    disbursed_at = models.DateTimeField(null=True)
    closed_at = models.DateTimeField(null=True)
    activation_exception = models.TextField(blank=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=~Q(lender_id=F("borrower_id")), name="loan_distinct_parties"
            )
        ]


class LedgerEntry(Record):
    loan = models.ForeignKey(Loan, on_delete=models.PROTECT, related_name="ledger")
    kind = models.CharField(max_length=40)
    principal_delta = models.BigIntegerField(default=0)
    interest_delta = models.BigIntegerField(default=0)
    amount = models.PositiveBigIntegerField(default=0)
    source_key = models.CharField(max_length=220, unique=True)
    effective_at = models.DateTimeField()
    metadata = models.JSONField(default=dict)

    def save(self, *args, **kwargs):
        if not self._state.adding:
            raise DomainError(
                "immutable_ledger", "Financial corrections must append compensating entries.", 409
            )
        return super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise DomainError("immutable_ledger", "Financial history cannot be deleted.", 409)


class Disbursement(Record):
    loan = models.OneToOneField(Loan, on_delete=models.PROTECT, related_name="disbursement")
    operation_id = models.UUIDField(unique=True)
    amount = models.PositiveBigIntegerField()
    status = models.CharField(max_length=32, default="pending")
    external_id = models.CharField(max_length=150, blank=True)
    effective_at = models.DateTimeField(null=True)
    adapter = models.CharField(max_length=40, default="sandbox")
    dispatch_attempts = models.PositiveIntegerField(default=0)


class CommissionAccrual(Record):
    loan = models.OneToOneField(Loan, on_delete=models.PROTECT, related_name="commission")
    disbursement = models.OneToOneField(Disbursement, on_delete=models.PROTECT)
    payer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    amount = models.PositiveBigIntegerField()
    policy_version = models.CharField(max_length=60)
    status = models.CharField(max_length=24, default="pending")
    collected_amount = models.PositiveBigIntegerField(default=0)


class CommissionAdjustment(Record):
    accrual = models.ForeignKey(
        CommissionAccrual, on_delete=models.PROTECT, related_name="adjustments"
    )
    amount = models.BigIntegerField()
    reason = models.CharField(max_length=300)
    operation_id = models.UUIDField(unique=True)
