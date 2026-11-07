"""Test-mode immutable agreements, capital attribution and simulated payouts."""

from config.models import Record
from config.errors import DomainError
from django.conf import settings
from django.db import models


class InvestmentAgreement(Record):
    room = models.OneToOneField(
        "negotiations.Room", on_delete=models.PROTECT, related_name="investment_agreement"
    )
    terms = models.JSONField()
    proposal_hash = models.CharField(max_length=64)
    hash = models.CharField(max_length=64)
    body = models.TextField()

    def save(self, *args, **kwargs):
        if not self._state.adding:
            raise DomainError(
                "immutable_agreement", "Prepared investment terms cannot be edited.", 409
            )
        return super().save(*args, **kwargs)


class InvestmentApproval(Record):
    agreement = models.ForeignKey(
        InvestmentAgreement, on_delete=models.PROTECT, related_name="approvals"
    )
    member = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    kind = models.CharField(max_length=16)
    hash = models.CharField(max_length=64)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["agreement", "member", "kind"], name="one_investment_approval_per_kind"
            )
        ]


class InvestmentFund(Record):
    agreement = models.OneToOneField(
        InvestmentAgreement, on_delete=models.PROTECT, related_name="fund"
    )
    offer = models.ForeignKey(
        "marketplace.LendingOffer", on_delete=models.PROTECT, related_name="investment_funds"
    )
    investor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="investment_funds"
    )
    amount = models.PositiveBigIntegerField()
    platform_fee = models.PositiveBigIntegerField()
    status = models.CharField(max_length=20, default="simulated_confirmed")
    confirmed_at = models.DateTimeField()
    source_key = models.CharField(max_length=160, unique=True)


class InvestmentAllocation(Record):
    fund = models.ForeignKey(InvestmentFund, on_delete=models.PROTECT, related_name="allocations")
    loan = models.ForeignKey(
        "servicing.Loan", on_delete=models.PROTECT, related_name="investment_allocations"
    )
    amount = models.PositiveBigIntegerField()

    def save(self, *args, **kwargs):
        if not self._state.adding:
            raise DomainError(
                "immutable_allocation", "Confirmed capital allocations cannot be edited.", 409
            )
        return super().save(*args, **kwargs)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["fund", "loan"], name="one_fund_allocation_per_loan")
        ]


class InvestmentAccrual(Record):
    allocation = models.ForeignKey(
        InvestmentAllocation, on_delete=models.PROTECT, related_name="accruals"
    )
    entry = models.ForeignKey("servicing.LedgerEntry", on_delete=models.PROTECT)
    principal_delta = models.BigIntegerField(default=0)
    earnings_delta = models.BigIntegerField(default=0)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["allocation", "entry"], name="one_investment_allocation_fact"
            )
        ]

    def save(self, *args, **kwargs):
        if not self._state.adding:
            raise DomainError(
                "immutable_attribution", "Corrections use compensating allocation facts.", 409
            )
        return super().save(*args, **kwargs)


class InvestmentPayout(Record):
    fund = models.ForeignKey(InvestmentFund, on_delete=models.PROTECT, related_name="payouts")
    principal_amount = models.PositiveBigIntegerField(default=0)
    earnings_amount = models.PositiveBigIntegerField(default=0)
    unallocated_amount = models.PositiveBigIntegerField(default=0)
    status = models.CharField(max_length=24, default="awaiting_investor")
    operation_id = models.UUIDField(unique=True)
    confirmed_at = models.DateTimeField(null=True)
