from agreements.types import integer
from config.errors import DomainError
from django.db import transaction
from django.utils import timezone

from .accrual import accrue_locked, rewind_for_event_locked
from .models import LedgerEntry, Loan
from .types import AllocationResult


def record_collection(*, loan_id, amount, effective_at, source_key):
    integer(amount, "amount", 1)
    with transaction.atomic():
        loan = Loan.objects.select_for_update().select_related("agreement").get(pk=loan_id)
        existing = LedgerEntry.objects.filter(source_key=source_key).first()
        if existing:
            if (
                existing.loan_id != loan.id
                or existing.amount != amount
                or existing.kind != "collection"
            ):
                raise DomainError(
                    "collection_conflict",
                    "Collection identity conflicts with an existing fact.",
                    409,
                )
            return AllocationResult(
                str(loan.id),
                -existing.principal_delta,
                -existing.interest_delta,
                loan.principal_balance + loan.interest_balance,
            )
        if loan.status not in {"active", "repaid"}:
            raise DomainError(
                "not_disbursed", "Collections require confirmed loan disbursement.", 409
            )
        resume_through = rewind_for_event_locked(
            loan, effective_at=effective_at, source_key=source_key
        )
        accrue_locked(loan, timezone.localtime(effective_at).date())
        if amount > loan.principal_balance + loan.interest_balance:
            raise DomainError("overpayment", "Payment exceeds the current accrued obligation.", 409)
        interest = min(amount, loan.interest_balance)
        principal = amount - interest
        loan.interest_balance -= interest
        loan.principal_balance -= principal
        if loan.principal_balance + loan.interest_balance == 0:
            loan.status = "repaid"
            loan.closed_at = effective_at
        loan.save(
            update_fields=[
                "interest_balance",
                "principal_balance",
                "status",
                "closed_at",
                "updated_at",
            ]
        )
        LedgerEntry.objects.create(
            loan=loan,
            kind="collection",
            principal_delta=-principal,
            interest_delta=-interest,
            amount=amount,
            source_key=source_key,
            effective_at=effective_at,
        )
        if resume_through:
            accrue_locked(loan, resume_through)
        return AllocationResult(
            str(loan.id), principal, interest, loan.principal_balance + loan.interest_balance
        )


def reverse_collection(*, source_key, refund_key, amount, effective_at):
    integer(amount, "amount", 1)
    original = LedgerEntry.objects.get(source_key=source_key, kind="collection")
    with transaction.atomic():
        loan = Loan.objects.select_for_update().select_related("agreement").get(pk=original.loan_id)
        existing = LedgerEntry.objects.filter(source_key=refund_key).first()
        if existing:
            if existing.metadata.get("original_source") != source_key or existing.amount != amount:
                raise DomainError(
                    "refund_conflict", "Refund identity conflicts with an existing fact.", 409
                )
            return AllocationResult(
                str(loan.id),
                existing.principal_delta,
                existing.interest_delta,
                loan.principal_balance + loan.interest_balance,
            )
        reversals = list(
            loan.ledger.filter(kind="collection_reversed", metadata__original_source=source_key)
        )
        reversed_amount = sum(x.amount for x in reversals)
        if reversed_amount + amount > original.amount:
            raise DomainError(
                "refund_exceeds_collection", "Refund exceeds the original collection.", 409
            )
        resume_through = rewind_for_event_locked(
            loan, effective_at=effective_at, source_key=refund_key
        )
        accrue_locked(loan, timezone.localtime(effective_at).date())
        # Reverse the original allocation, never an arbitrary current installment.
        principal_left = -original.principal_delta - sum(x.principal_delta for x in reversals)
        principal = min(amount, principal_left)
        interest = amount - principal
        loan.principal_balance += principal
        loan.interest_balance += interest
        loan.status = "active"
        loan.closed_at = None
        loan.save(
            update_fields=[
                "principal_balance",
                "interest_balance",
                "status",
                "closed_at",
                "updated_at",
            ]
        )
        LedgerEntry.objects.create(
            loan=loan,
            kind="collection_reversed",
            principal_delta=principal,
            interest_delta=interest,
            amount=amount,
            source_key=refund_key,
            effective_at=effective_at,
            metadata={"original_source": source_key},
        )
        if resume_through:
            accrue_locked(loan, resume_through)
        return AllocationResult(
            str(loan.id), principal, interest, loan.principal_balance + loan.interest_balance
        )
