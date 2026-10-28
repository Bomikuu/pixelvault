from config.errors import DomainError
from django.db import transaction

from .models import CommissionAccrual, CommissionAdjustment, Disbursement, Loan


def accrue_commission(*, loan_id, disbursement_id):
    with transaction.atomic():
        loan = Loan.objects.select_for_update().select_related("agreement").get(pk=loan_id)
        transfer = Disbursement.objects.get(pk=disbursement_id, loan=loan)
        if transfer.status != "confirmed" or transfer.amount != loan.agreement.terms["principal"]:
            raise DomainError(
                "unfunded_loan", "Commission requires full confirmed disbursement.", 409
            )
        amount = sum(
            x["amount"]
            for x in loan.agreement.terms.get("lender_fees", [])
            if x["code"] == "platform_commission_demo"
        )
        accrual, _ = CommissionAccrual.objects.get_or_create(
            loan=loan,
            defaults={
                "disbursement": transfer,
                "payer_id": loan.lender_id,
                "amount": amount,
                "policy_version": loan.agreement.terms["policy_version"],
            },
        )
        return accrual


def reverse_commission(*, accrual_id, reason, operation_id):
    with transaction.atomic():
        accrual = CommissionAccrual.objects.select_for_update().get(pk=accrual_id)
        existing = CommissionAdjustment.objects.filter(operation_id=operation_id).first()
        if existing:
            if existing.accrual_id != accrual.id or existing.reason != reason:
                raise DomainError("operation_conflict", "Operation key has different input.", 409)
            return existing
        if accrual.status == "reversed":
            raise DomainError("already_reversed", "Commission was already reversed.", 409)
        adjustment = CommissionAdjustment.objects.create(
            accrual=accrual, amount=-accrual.amount, reason=reason, operation_id=operation_id
        )
        accrual.status = "reversed"
        accrual.save(update_fields=["status", "updated_at"])
        return adjustment
