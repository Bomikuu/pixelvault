from datetime import timedelta

import pytest
from config.errors import DomainError
from django.utils import timezone
from servicing.models import LedgerEntry

from reporting.metrics import member_metrics, operations_metrics

pytestmark = pytest.mark.django_db


def report(member, role="borrower"):
    now = timezone.localdate()
    return member_metrics(
        actor_id=member.id,
        role=role,
        start=(now - timedelta(days=1)).isoformat(),
        end=(now + timedelta(days=1)).isoformat(),
    )


def test_metrics_use_full_period_not_first_page(loan, members):
    for index in range(65):
        LedgerEntry.objects.create(
            loan=loan,
            kind="collection",
            principal_delta=-1,
            amount=1,
            source_key=f"metric:{index}",
            effective_at=timezone.now(),
        )
    data = report(members[1])
    assert data["metrics"]["confirmed_collections"] == "65"
    assert data["metrics"]["principal_outstanding"] == "999935"


def test_projected_interest_not_earned_income(loan, members):
    data = report(members[1])
    assert int(data["metrics"]["contractual_future_interest"]) > 0
    assert data["metrics"]["interest_collected"] == "0"
    assert data["metrics"]["interest_accrued"] == "0"
    assert data["metrics"]["settlement_unknown_count"] == "1"
    assert data["metrics"]["settlement_confirmed_count"] == "0"


def test_refunds_reduce_confirmed_collections_once(loan, members):
    LedgerEntry.objects.create(
        loan=loan,
        kind="collection",
        principal_delta=-500,
        interest_delta=-100,
        amount=600,
        source_key="metric:collection",
        effective_at=timezone.now(),
    )
    LedgerEntry.objects.create(
        loan=loan,
        kind="collection_reversed",
        principal_delta=500,
        interest_delta=100,
        amount=600,
        source_key="metric:refund",
        effective_at=timezone.now(),
    )
    data = report(members[1])
    assert data["metrics"]["net_collections"] == "0"
    assert data["metrics"]["interest_collected"] == "0"


def test_member_cannot_report_other_member(loan, members):
    assert report(members[2])["metrics"]["principal_disbursed"] == "0"
    with pytest.raises(DomainError):
        operations_metrics(actor_id=members[2].id)


def test_empty_period_has_true_zeros_no_fake_comparison(members):
    data = report(members[1])
    assert all(value == "0" for value in data["metrics"].values())
    assert data["comparison"] is None


def test_aggregate_above_js_safe_integer_uses_decimal_string(loan, members):
    large = 9007199254740995
    LedgerEntry.objects.create(
        loan=loan,
        kind="collection",
        amount=large,
        source_key="large-metric",
        effective_at=timezone.now(),
    )
    assert report(members[1])["metrics"]["confirmed_collections"] == str(large)


def test_delayed_collection_metric_includes_signed_accrual_correction(loan, members):
    from datetime import datetime, time

    from servicing.accrual import accrue_to
    from servicing.allocation import record_collection

    start = timezone.localdate()
    through = start + timedelta(days=10)
    effective = timezone.make_aware(datetime.combine(start + timedelta(days=5), time(12)))
    accrue_to(loan_id=loan.id, through=through)
    record_collection(
        loan_id=loan.id,
        amount=100000,
        effective_at=effective,
        source_key="report-delayed-collection",
    )
    entries = loan.ledger.filter(kind__in=["interest_accrued", "accrual_correction"])
    assert entries.filter(kind="accrual_correction", interest_delta__lt=0).exists()
    expected = sum(entry.interest_delta for entry in entries)
    data = member_metrics(
        actor_id=members[1].id, role="borrower", start=start, end=through + timedelta(days=1)
    )
    assert data["metrics"]["interest_accrued"] == str(expected)


def test_accrual_correction_metric_respects_effective_period_and_signed_amount(loan, members):
    from datetime import datetime, time

    start = timezone.localdate()
    effective = timezone.make_aware(datetime.combine(start, time(12)))
    LedgerEntry.objects.create(
        loan=loan,
        kind="interest_accrued",
        amount=500,
        interest_delta=500,
        source_key="period-accrual",
        effective_at=effective,
    )
    LedgerEntry.objects.create(
        loan=loan,
        kind="accrual_correction",
        amount=200,
        interest_delta=-200,
        source_key="period-correction",
        effective_at=effective + timedelta(days=1),
    )
    first = member_metrics(
        actor_id=members[1].id, role="borrower", start=start, end=start + timedelta(days=1)
    )
    second = member_metrics(
        actor_id=members[1].id,
        role="borrower",
        start=start + timedelta(days=1),
        end=start + timedelta(days=2),
    )
    assert first["metrics"]["interest_accrued"] == "500"
    assert second["metrics"]["interest_accrued"] == "-200"
