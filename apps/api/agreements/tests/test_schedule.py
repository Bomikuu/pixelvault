from datetime import date

import pytest
from config.errors import DomainError

from agreements.schedule import build_schedule, generate_due_dates
from agreements.types import LoanTerms


def fixture(**overrides):
    data = dict(
        principal=1000000,
        currency="PHP",
        annual_rate_bps=1200,
        frequency="monthly",
        installment_count=3,
        effective_date=date(2026, 10, 28),
        due_dates=(date(2026, 11, 28), date(2026, 12, 28), date(2027, 1, 28)),
    )
    return LoanTerms(**(data | overrides))


def test_monthly_act365_fixture():
    schedule = build_schedule(fixture())
    assert [x.principal for x in schedule.lines] == [333333, 333333, 333334]
    assert [x.interest for x in schedule.lines] == [10192, 6575, 3397]
    assert [x.total for x in schedule.lines] == [343525, 339908, 336731]
    assert schedule.total_repayment == 1020164
    assert schedule.net_proceeds == 1000000


def test_january_31_restores_march_anchor():
    assert generate_due_dates(effective_date=date(2027, 1, 31), frequency="monthly", count=3) == (
        date(2027, 2, 28),
        date(2027, 3, 31),
        date(2027, 4, 30),
    )


def test_twice_monthly_is_15_and_month_end():
    assert generate_due_dates(
        effective_date=date(2026, 10, 28), frequency="twice_monthly", count=4
    ) == (date(2026, 10, 31), date(2026, 11, 15), date(2026, 11, 30), date(2026, 12, 15))


def test_weekly_calendar_days():
    dates = generate_due_dates(effective_date=date(2026, 10, 28), frequency="weekly", count=3)
    assert [(b - a).days for a, b in zip((date(2026, 10, 28), *dates), dates)] == [7, 7, 7]


@pytest.mark.parametrize(
    "field,value",
    [
        ("principal", True),
        ("principal", 1.1),
        ("principal", -1),
        ("annual_rate_bps", False),
        ("currency", "USD"),
    ],
)
def test_reject_invalid_numeric_and_currency(field, value):
    with pytest.raises(DomainError):
        fixture(**{field: value})


@pytest.mark.parametrize("principal,count", [(100001, 3), (191911, 7), (1000000, 12), (1, 1)])
def test_schedule_principal_conserved(principal, count):
    terms = fixture(
        principal=principal,
        installment_count=count,
        due_dates=generate_due_dates(
            effective_date=date(2026, 10, 28), frequency="monthly", count=count
        ),
    )
    schedule = build_schedule(terms)
    assert sum(x.principal for x in schedule.lines) == principal
    assert all(type(x.total) is int for x in schedule.lines)
    assert schedule.total_repayment == sum(x.total for x in schedule.lines)
