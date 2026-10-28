from config.errors import DomainError


def loan_for(loan_id, actor_id=None):
    from servicing.models import Loan

    try:
        loan = Loan.objects.select_related("agreement", "borrower", "lender").get(pk=loan_id)
    except (Loan.DoesNotExist, ValueError):
        raise DomainError("not_found", "Record not found.", 404)
    if actor_id is not None and actor_id not in (loan.lender_id, loan.borrower_id):
        raise DomainError("not_found", "Record not found.", 404)
    return loan


def eligible_review_loan(loan_id, actor_id=None):
    loan = loan_for(loan_id, actor_id)
    if (
        loan.status != "repaid"
        or loan.disbursement_status != "confirmed"
        or loan.principal_balance
        or loan.interest_balance
        or has_pending_correction(loan)
    ):
        raise DomainError(
            "review_not_eligible",
            "Reviews become eligible after a confirmed, fully settled loan.",
            409,
        )
    return loan


def has_pending_correction(loan):
    from payments.models import EventInbox, PaymentOperation, RefundOperation

    if RefundOperation.objects.filter(
        payment_operation__loan=loan, status__in=["pending", "uncertain"]
    ).exists():
        return True
    operations = PaymentOperation.objects.filter(loan=loan).exclude(payment_id="")
    return any(
        EventInbox.objects.filter(
            routing_id=operation.routing_id,
            state__in=[
                "received",
                "awaiting_collection",
                "awaiting_mapping",
                "reconciliation_required",
            ],
            payload__type__in=["refund.succeeded", "payment.refunded"],
            payload__data__id=operation.payment_id,
        ).exists()
        for operation in operations
    )
