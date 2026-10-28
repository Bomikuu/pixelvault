import uuid

from agreements.types import integer
from config.errors import DomainError
from django.db import transaction
from django.utils import timezone
from marketplace.offers import fingerprint
from servicing.accrual import accrue_locked
from servicing.models import CommissionAccrual, Loan

from . import pixelflow
from .contracts import CheckoutLink, PayableSnapshot
from .models import FinancialSource, PaymentOperation, PaymentRoutingProfile, RefundOperation
from .vendor_sdk.client import PixelflowError


def begin_checkout(*, loan_id, payer_id, operation_id, mode="installment", requested_amount=None):
    with transaction.atomic():
        loan = Loan.objects.select_for_update().select_related("agreement").get(pk=loan_id)
        if loan.borrower_id != payer_id:
            raise DomainError("not_found", "Loan not found.", 404)
        request_hash = fingerprint(
            {
                "loan": str(loan.id),
                "payer": str(payer_id),
                "mode": mode,
                "requested_amount": requested_amount,
            }
        )
        previous = PaymentOperation.objects.filter(operation_id=operation_id).first()
        if previous:
            if (
                previous.loan_id != loan.id
                or previous.payer_id != payer_id
                or previous.payload_hash != request_hash
            ):
                raise DomainError("operation_conflict", "Operation key has different input.", 409)
            operation = previous
            if operation.payment_id:
                return CheckoutLink(
                    operation.payment_id,
                    operation.checkout_url,
                    operation.expires_at,
                    operation.status,
                )
        else:
            if loan.status != "active":
                raise DomainError(
                    "not_collectible", "This loan has no active collectible balance.", 409
                )
            if PaymentOperation.objects.filter(
                loan=loan, kind="repayment", status__in=["pending", "uncertain", "awaiting_payment"]
            ).exists():
                raise DomainError(
                    "checkout_pending", "An existing checkout must be completed or reconciled.", 409
                )
            accrue_locked(loan, timezone.localdate())
            from servicing.payment_review import payment_review
            from servicing.projections import get_loan_projection

            preview = payment_review(
                projection=get_loan_projection(loan_id=loan.id),
                mode=mode,
                requested_amount=requested_amount,
            )
            amount = preview["amount"]
            routing = PaymentRoutingProfile.objects.filter(
                lender_id=loan.lender_id, purpose="repayment", approved=True, environment="test"
            ).first()
            if not routing:
                raise DomainError(
                    "routing_unconfigured",
                    "No approved repayment route exists for this individual lender.",
                    503,
                )
            identifier = uuid.uuid4()
            operation = PaymentOperation.objects.create(
                operation_id=operation_id,
                id=identifier,
                loan=loan,
                routing=routing,
                payer_id=payer_id,
                kind="repayment",
                amount=amount,
                payable_version=loan.agreement.hash
                if not loan.active_amendment_id
                else fingerprint(
                    {"agreement": loan.agreement.hash, "amendment": str(loan.active_amendment_id)}
                ),
                external_id=str(identifier),
                payload_hash=request_hash,
            )
    return dispatch_operation(operation)


def dispatch_operation(operation):
    payable = PayableSnapshot(
        operation.id,
        operation.kind,
        operation.loan_id,
        operation.payer_id,
        operation.loan.lender_id if operation.loan_id else None,
        operation.amount,
        operation.currency,
        operation.payable_version,
        operation.routing_id,
    )
    try:
        link = pixelflow.create_checkout(payable=payable, operation_id=operation.operation_id)
    except PixelflowError as error:
        PaymentOperation.objects.filter(pk=operation.id).update(
            status="uncertain"
            if error.status == 0 or error.status >= 500 or error.code == "INVALID_RESPONSE"
            else "failed"
        )
        raise DomainError(
            "checkout_uncertain" if error.status == 0 else "checkout_rejected",
            "Keep the original operation key and reconcile this checkout.",
            503,
        ) from None
    except DomainError:
        PaymentOperation.objects.filter(pk=operation.id).update(status="failed")
        raise
    with transaction.atomic():
        current = PaymentOperation.objects.select_for_update().get(pk=operation.id)
        if not link.payment_id:
            current.status = "uncertain"
            current.save(update_fields=["status", "updated_at"])
            raise DomainError(
                "checkout_uncertain", "Provider response lacks a payment identity.", 503
            )
        current.payment_id, current.checkout_url, current.expires_at = (
            link.payment_id,
            link.checkout_url,
            link.expires_at,
        )
        if current.status in {"pending", "uncertain"}:
            current.status = "awaiting_payment"
        current.save()
    # Events received before the mapping remain durable and can now be retried.
    from .inbox import apply_event

    for inbox in operation.routing.eventinbox_set.filter(state="awaiting_mapping")[:100]:
        apply_event(inbox_id=inbox.id)
    return link


def begin_commission_checkout(*, accrual_id, payer_id, operation_id):
    with transaction.atomic():
        accrual = CommissionAccrual.objects.select_for_update().get(pk=accrual_id)
        if accrual.payer_id != payer_id:
            raise DomainError("not_found", "Commission not found.", 404)
        existing = PaymentOperation.objects.filter(operation_id=operation_id).first()
        if existing:
            if existing.commission_id != accrual.id:
                raise DomainError("operation_conflict", "Operation key has different input.", 409)
            operation = existing
        else:
            if (
                accrual.status != "pending"
                or PaymentOperation.objects.filter(
                    commission=accrual, status__in=["pending", "uncertain", "awaiting_payment"]
                ).exists()
            ):
                raise DomainError(
                    "commission_unavailable",
                    "Commission already collected or has a pending checkout.",
                    409,
                )
            routing = PaymentRoutingProfile.objects.filter(
                purpose="platform_fee", approved=True, environment="test", lender__isnull=True
            ).first()
            if not routing:
                raise DomainError(
                    "fee_routing_unconfigured", "No approved platform-fee route exists.", 503
                )
            remaining = accrual.amount - accrual.collected_amount
            if remaining <= 0:
                raise DomainError(
                    "commission_unavailable", "No uncollected commission remains.", 409
                )
            identifier = uuid.uuid4()
            operation = PaymentOperation.objects.create(
                id=identifier,
                operation_id=operation_id,
                commission=accrual,
                payer_id=payer_id,
                routing=routing,
                kind="platform_fee",
                amount=remaining,
                payable_version=accrual.policy_version,
                external_id=str(identifier),
                payload_hash=fingerprint({"commission": str(accrual.id), "amount": remaining}),
            )
    if operation.payment_id:
        return CheckoutLink(
            operation.payment_id, operation.checkout_url, operation.expires_at, operation.status
        )
    return dispatch_operation(operation)


def request_refund(*, payment_operation_id, amount, reason, operation_id):
    integer(amount, "amount", 1)
    with transaction.atomic():
        operation = (
            PaymentOperation.objects.select_for_update(of=("self",))
            .select_related("routing")
            .get(pk=payment_operation_id)
        )
        existing = RefundOperation.objects.filter(operation_id=operation_id).first()
        if existing:
            if (
                existing.payment_operation_id != operation.id
                or existing.amount != amount
                or existing.reason != reason
            ):
                raise DomainError("operation_conflict", "Operation key has different input.", 409)
            if existing.status != "uncertain" or existing.refund_id:
                return existing
            # Claim a same-key retry of the existing reservation. Other requests
            # now see pending and cannot dispatch it concurrently or reserve again.
            existing.status = "pending"
            existing.save(update_fields=["status", "updated_at"])
            refund = existing
        else:
            collected = FinancialSource.objects.filter(
                operation=operation, kind="collection"
            ).first()
            confirmed = sum(
                x.amount for x in FinancialSource.objects.filter(operation=operation, kind="refund")
            )
            pending = sum(
                x.amount
                for x in operation.refund_operations.filter(status__in=["pending", "uncertain"])
            )
            if not collected or confirmed + pending + amount > collected.amount:
                raise DomainError(
                    "refund_unavailable",
                    "Amount exceeds the unreserved refundable collection.",
                    409,
                )
            refund = RefundOperation.objects.create(
                operation_id=operation_id, payment_operation=operation, amount=amount, reason=reason
            )
    try:
        response = pixelflow.client_for(operation.routing).request_refund(
            operation.payment_id, refund.amount, refund.reason, str(refund.operation_id)
        )
    except PixelflowError:
        RefundOperation.objects.filter(pk=refund.id, status="pending", refund_id="").update(
            status="uncertain"
        )
        return RefundOperation.objects.get(pk=refund.id)
    result = response.get("data", response)
    reference = str(result.get("refund_id", result.get("id", "")))
    # Match the same route -> loan -> operation lock order as event application.
    # A refund can be confirmed by webhook before this HTTP response is mapped.
    with transaction.atomic():
        PaymentRoutingProfile.objects.select_for_update().get(pk=operation.routing_id)
        if operation.loan_id:
            Loan.objects.select_for_update().get(pk=operation.loan_id)
        PaymentOperation.objects.select_for_update().get(pk=operation.id)
        current = RefundOperation.objects.select_for_update().get(pk=refund.id)
        current.refund_id = reference
        source = (
            FinancialSource.objects.filter(
                routing_id=operation.routing_id, kind="refund", reference=reference
            ).first()
            if reference
            else None
        )
        if source:
            if source.operation_id != operation.id or source.amount != current.amount:
                current.status = "uncertain"
            else:
                current.status = "confirmed"
        elif not reference:
            current.status = "uncertain"
        current.save(update_fields=["refund_id", "status", "updated_at"])
        return current
