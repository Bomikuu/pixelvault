from datetime import date

from config.errors import DomainError
from django.conf import settings
from django.db import transaction
from django.utils import timezone
from marketplace.offers import eligible

from .commission import accrue_commission
from .models import Disbursement, LedgerEntry, Loan
from .types import TransferResult


class SandboxTransferAdapter:
    """Synthetic authoritative fixture. Never connects to PixelFlow or moves money."""

    def dispatch(self, transfer):
        if settings.ENVIRONMENT != "test":
            raise DomainError(
                "unsupported_disbursement", "No approved live disbursement adapter.", 403
            )
        return {
            "status": "confirmed",
            "external_id": f"sandbox-{transfer.operation_id}",
            "effective_at": timezone.now(),
            "amount": transfer.amount,
        }

    def reconcile(self, transfer):
        return self.dispatch(transfer)


def finalize(transfer_id, outcome):
    preliminary = Disbursement.objects.get(pk=transfer_id)
    with transaction.atomic():
        loan = (
            Loan.objects.select_for_update().select_related("agreement").get(pk=preliminary.loan_id)
        )
        transfer = Disbursement.objects.select_for_update().get(pk=transfer_id)
        if transfer.status == "confirmed":
            return TransferResult(str(transfer.id), str(loan.id), transfer.status)
        transfer.status = outcome["status"]
        transfer.external_id = outcome.get("external_id", "")
        transfer.effective_at = outcome.get("effective_at")
        terms = loan.agreement.terms
        if transfer.status == "confirmed":
            effective = transfer.effective_at
            if outcome.get("amount") != terms["principal"] or timezone.localtime(
                effective
            ).date() != date.fromisoformat(terms["effective_date"]):
                transfer.status = "activation_exception"
                loan.disbursement_status = "activation_exception"
                loan.activation_exception = "Confirmed transfer falls outside signed amount/date. Human review and mutual correction required."
            else:
                loan.principal_balance = terms["principal"]
                loan.status = "active"
                loan.disbursement_status = "confirmed"
                loan.disbursed_at = effective
                loan.accrued_through = date.fromisoformat(terms["effective_date"])
                LedgerEntry.objects.get_or_create(
                    source_key=f"disbursement:{transfer.id}",
                    defaults={
                        "loan": loan,
                        "kind": "principal_disbursed",
                        "principal_delta": transfer.amount,
                        "amount": transfer.amount,
                        "effective_at": effective,
                        "metadata": {"synthetic": True},
                    },
                )
        else:
            loan.disbursement_status = transfer.status
        transfer.save()
        loan.save()
        if transfer.status == "confirmed":
            accrue_commission(loan_id=loan.id, disbursement_id=transfer.id)
        return TransferResult(str(transfer.id), str(loan.id), transfer.status)


def request_disbursement(*, loan_id, actor_id, operation_id, adapter=None):
    adapter = adapter or SandboxTransferAdapter()
    with transaction.atomic():
        loan = Loan.objects.select_for_update().select_related("agreement").get(pk=loan_id)
        if actor_id != loan.lender_id:
            raise DomainError("not_found", "Loan not found.", 404)
        existing = Disbursement.objects.filter(loan=loan).first()
        operation = Disbursement.objects.filter(operation_id=operation_id).first()
        if operation and operation.loan_id != loan.id:
            raise DomainError(
                "operation_conflict", "Operation key already belongs to another loan.", 409
            )
        if existing:
            if existing.operation_id != operation_id:
                raise DomainError(
                    "disbursement_exists",
                    "Reconcile the original disbursement; do not dispatch another.",
                    409,
                )
            return TransferResult(str(existing.id), str(loan.id), existing.status)
        if loan.status != "awaiting_disbursement":
            raise DomainError("invalid_state", "Loan is not awaiting disbursement.", 409)
        from agreements.policy import policy_for_terms
        from agreements.types import LoanTerms

        policy_for_terms(LoanTerms.from_dict(loan.agreement.terms))
        eligible(loan.lender_id, "disburse")
        eligible(loan.borrower_id, "disburse")
        if timezone.localdate() != date.fromisoformat(loan.agreement.terms["effective_date"]):
            raise DomainError(
                "new_acceptance_required",
                "Signed effective date has passed or is not yet reached.",
                409,
            )
        transfer = Disbursement.objects.create(
            loan=loan,
            amount=loan.agreement.terms["principal"],
            operation_id=operation_id,
            dispatch_attempts=1,
        )
        loan.disbursement_status = "pending"
        loan.save(update_fields=["disbursement_status", "updated_at"])
    # Deliberately outside the financial database transaction.
    try:
        outcome = adapter.dispatch(transfer)
    except TimeoutError:
        outcome = {"status": "uncertain"}
    return finalize(transfer.id, outcome)


def reconcile_disbursement(*, transfer_id, adapter=None):
    transfer = Disbursement.objects.get(pk=transfer_id)
    if transfer.status == "confirmed":
        return TransferResult(str(transfer.id), str(transfer.loan_id), "confirmed")
    return finalize(transfer.id, (adapter or SandboxTransferAdapter()).reconcile(transfer))
