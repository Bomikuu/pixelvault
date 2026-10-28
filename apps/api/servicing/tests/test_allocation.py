from datetime import timedelta

import pytest
from django.utils import timezone

from servicing.accrual import accrue_to
from servicing.allocation import record_collection, reverse_collection
from servicing.models import LedgerEntry

pytestmark = pytest.mark.django_db


def test_partial_collection_interest_then_principal(funded):
    effective = timezone.now() + timedelta(days=31)
    result = record_collection(
        loan_id=funded.id, amount=20000, effective_at=effective, source_key="partial"
    )
    assert result.interest == 10192
    assert result.principal == 9808
    funded.refresh_from_db()
    assert funded.principal_balance == 990192
    assert funded.interest_balance == 0


def test_early_payoff_excludes_future_interest(funded):
    result = record_collection(
        loan_id=funded.id, amount=1000000, effective_at=timezone.now(), source_key="payoff"
    )
    funded.refresh_from_db()
    assert result.interest == 0
    assert funded.status == "repaid"
    assert funded.closed_at


def test_reversal_appends_and_reopens(funded):
    effective = timezone.now()
    record_collection(
        loan_id=funded.id, amount=1000000, effective_at=effective, source_key="payoff"
    )
    reverse_collection(
        source_key="payoff", refund_key="refund", amount=50000, effective_at=effective
    )
    funded.refresh_from_db()
    assert funded.status == "active" and funded.closed_at is None
    assert funded.principal_balance == 50000
    assert LedgerEntry.objects.filter(kind="collection").count() == 1
    assert LedgerEntry.objects.filter(kind="collection_reversed").count() == 1
    assert sum(x.principal_delta for x in funded.ledger.all()) == 50000
    reverse_collection(
        source_key="payoff", refund_key="refund", amount=50000, effective_at=effective
    )
    assert LedgerEntry.objects.filter(kind="collection_reversed").count() == 1


def test_suspended_member_can_repay(funded, members):
    members[1].suspended = True
    members[1].save()
    assert (
        record_collection(
            loan_id=funded.id, amount=10000, effective_at=timezone.now(), source_key="suspended"
        ).principal
        == 10000
    )


def test_ledger_rejects_mutation(funded):
    from config.errors import DomainError

    entry = funded.ledger.first()
    entry.amount = 1
    with pytest.raises(DomainError):
        entry.save()


def test_delayed_latest_payment_recomputes_accrual_append_only(funded):
    from decimal import Decimal

    from agreements.schedule import rounded

    start = timezone.now()
    accrue_to(loan_id=funded.id, through=(start + timedelta(days=20)).date())
    old_entries = list(funded.ledger.values_list("id", "interest_delta"))
    result = record_collection(
        loan_id=funded.id,
        amount=100000,
        effective_at=start + timedelta(days=10),
        source_key="delayed-latest",
    )
    funded.refresh_from_db()
    expected_first = rounded(Decimal(1000000) * 1200 * 10 / Decimal(3650000))
    assert result.interest == expected_first
    assert funded.principal_balance == 1000000 - (100000 - expected_first)
    expected_remaining = (
        rounded(
            (Decimal(1000000) * 1200 * 10 + Decimal(funded.principal_balance) * 1200 * 10)
            / Decimal(3650000)
        )
        - expected_first
    )
    assert funded.interest_balance == expected_remaining
    assert funded.ledger.filter(kind="accrual_correction").exists()
    assert all(
        funded.ledger.filter(id=key, interest_delta=value).exists() for key, value in old_entries
    )
    assert sum(x.principal_delta for x in funded.ledger.all()) == funded.principal_balance
    assert sum(x.interest_delta for x in funded.ledger.all()) == funded.interest_balance
