from datetime import timedelta

import pytest

from servicing.accrual import accrue_to
from servicing.models import LedgerEntry

pytestmark = pytest.mark.django_db


def test_cumulative_rounding_has_no_daily_drift(funded):
    start = funded.accrued_through
    for days in range(1, 32):
        accrue_to(loan_id=funded.id, through=start + timedelta(days=days))
    funded.refresh_from_db()
    assert funded.interest_balance == 10192
    assert sum(x.interest_delta for x in LedgerEntry.objects.filter(loan=funded)) == 10192
    assert accrue_to(loan_id=funded.id, through=start + timedelta(days=31)).accrued_amount == 0


def test_no_interest_on_interest_and_zero_late_fee(funded):
    from datetime import date

    maturity = date.fromisoformat(funded.agreement.terms["due_dates"][-1])
    accrue_to(loan_id=funded.id, through=maturity)
    funded.refresh_from_db()
    balance = funded.interest_balance
    accrue_to(loan_id=funded.id, through=maturity + timedelta(days=100))
    funded.refresh_from_db()
    assert funded.interest_balance == balance
    assert not funded.ledger.filter(kind="late_fee").exists()
