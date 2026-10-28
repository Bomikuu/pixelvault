import uuid
from datetime import datetime, time
from decimal import Decimal

from agreements.schedule import rounded
from django.db import transaction
from django.utils import timezone

from .models import LedgerEntry, Loan
from .types import AccrualResult


def accrue_locked(loan, through):
    terms = loan.active_terms or loan.agreement.terms
    effective = datetime.fromisoformat(terms["effective_date"]).date()
    maturity = datetime.fromisoformat(terms["due_dates"][-1]).date()
    end = min(through, maturity)
    start = loan.accrued_through or effective
    if loan.status not in {"active", "repaid"} or end <= start:
        return 0
    # Each interval is accrued on actual outstanding principal. Cumulative exact
    # fractions preserve sub-centavo amounts across daily task runs.
    loan.accrual_exact += (
        Decimal(loan.principal_balance)
        * terms["annual_rate_bps"]
        * (end - start).days
        / Decimal(3650000)
    )
    cumulative = rounded(loan.accrual_exact)
    delta = cumulative - loan.interest_posted
    loan.interest_posted = cumulative
    loan.interest_balance += delta
    loan.accrued_through = end
    loan.save(
        update_fields=[
            "accrual_exact",
            "interest_posted",
            "interest_balance",
            "accrued_through",
            "updated_at",
        ]
    )
    if delta:
        LedgerEntry.objects.create(
            loan=loan,
            kind="interest_accrued",
            interest_delta=delta,
            amount=delta,
            source_key=f"accrual:{loan.id}:{uuid.uuid4()}",
            effective_at=timezone.make_aware(datetime.combine(end, time.min)),
            metadata={"basis": "ACT/365 fixed", "through": end.isoformat()},
        )
    return delta


def accrue_to(*, loan_id, through):
    with transaction.atomic():
        loan = Loan.objects.select_for_update().select_related("agreement").get(pk=loan_id)
        amount = accrue_locked(loan, through)
        return AccrualResult(str(loan.id), amount, loan.interest_balance)


def rewind_for_event_locked(loan, *, effective_at, source_key):
    """Recalculate a delayed latest financial event with compensating facts.

    Later allocations or amendments need reviewed multi-event reconciliation; we
    never silently change another payment's immutable allocation.
    """
    from config.errors import DomainError

    terms = loan.active_terms or loan.agreement.terms
    target = timezone.localtime(effective_at).date()
    original = loan.accrued_through
    if original is None or target >= original:
        return None
    if target < date_from_terms(terms["effective_date"]):
        raise DomainError(
            "historical_reconciliation_required",
            "Effective payment precedes the active signed terms.",
            409,
        )
    later = loan.ledger.filter(effective_at__gt=effective_at).exclude(principal_delta=0)
    if (
        later.exists()
        or loan.ledger.filter(kind="amendment_activated", effective_at__gt=effective_at).exists()
    ):
        raise DomainError(
            "historical_reconciliation_required",
            "Later financial allocations require reviewed reconciliation.",
            409,
        )
    interval = (
        Decimal(loan.principal_balance)
        * terms["annual_rate_bps"]
        * (original - target).days
        / Decimal(3650000)
    )
    earlier_exact = loan.accrual_exact - interval
    earlier_posted = rounded(earlier_exact)
    correction = earlier_posted - loan.interest_posted
    if earlier_exact < 0 or loan.interest_balance + correction < 0:
        raise DomainError(
            "historical_reconciliation_required",
            "Delayed event requires reviewed historical allocation.",
            409,
        )
    loan.accrual_exact = earlier_exact
    loan.interest_posted = earlier_posted
    loan.interest_balance += correction
    loan.accrued_through = target
    loan.save(
        update_fields=[
            "accrual_exact",
            "interest_posted",
            "interest_balance",
            "accrued_through",
            "updated_at",
        ]
    )
    if correction:
        LedgerEntry.objects.create(
            loan=loan,
            kind="accrual_correction",
            interest_delta=correction,
            amount=abs(correction),
            source_key=f"accrual-correction:{source_key}",
            effective_at=effective_at,
            metadata={
                "reason": "Delayed authoritative financial event",
                "previous_through": original.isoformat(),
            },
        )
    return original


def date_from_terms(value):
    from datetime import date

    return date.fromisoformat(value)
