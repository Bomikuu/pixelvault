import os
from datetime import datetime

from config.errors import DomainError
from django.db import transaction
from django.utils import timezone
from marketplace.offers import fingerprint
from servicing.allocation import record_collection, reverse_collection
from servicing.models import CommissionAccrual, Loan

from .contracts import ApplyResult, InboxReceipt
from .models import (
    EventInbox,
    FinancialSource,
    PaymentOperation,
    PaymentRoutingProfile,
    RefundOperation,
)
from .vendor_sdk.webhooks import verify_webhook


def validate_scope(routing, event):
    if routing.environment != "test" or not routing.approved:
        raise DomainError(
            "routing_unapproved", "Event route is not approved for test collection.", 403
        )
    if (
        event.get("api_version") != "2026-10-24"
        or event.get("project_id") != routing.project_id
        or event.get("tenant_id") != routing.tenant_id
        or event.get("environment") != routing.environment
    ):
        raise DomainError("event_scope", "Event scope does not match its server-owned route.", 400)
    data = event.get("data", {})
    if (
        type(data.get("amount")) is not int
        or data["amount"] <= 0
        or data.get("currency") != "PHP"
        or type(data.get("version")) is not int
        or data["version"] < 1
    ):
        raise DomainError("event_contract", "Event amount, currency or version is invalid.", 400)


def persist_event(*, routing, event):
    validate_scope(routing, event)
    digest = fingerprint(event)
    with transaction.atomic():
        # The route lock serializes first deliveries without relying on a catch of
        # an IntegrityError inside a poisoned financial transaction.
        PaymentRoutingProfile.objects.select_for_update().get(pk=routing.id)
        existing = EventInbox.objects.filter(routing=routing, event_id=event["id"]).first()
        if existing:
            if existing.payload_hash != digest:
                raise DomainError("event_conflict", "Event identity has changed payload.", 409)
            return existing
        return EventInbox.objects.create(
            routing=routing, event_id=event["id"], payload=event, payload_hash=digest
        )


def receive_webhook(*, routing_id, raw_body, signature, event_id_header):
    from django.shortcuts import get_object_or_404

    routing = get_object_or_404(PaymentRoutingProfile, pk=routing_id)
    secret = os.environ.get(routing.webhook_secret_env, "")
    if not secret or not event_id_header:
        raise DomainError(
            "invalid_signature", "Webhook authentication is unavailable or missing.", 400
        )
    try:
        event = verify_webhook(raw_body, signature, secret, event_id=event_id_header)
    except ValueError:
        raise DomainError(
            "invalid_signature", "Invalid, expired or mismatched event signature.", 400
        ) from None
    inbox = persist_event(routing=routing, event=event)
    result = apply_event(inbox_id=inbox.id)
    return InboxReceipt(str(inbox.id), result.state)


def parse_effective(value):
    try:
        effective = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except (ValueError, AttributeError):
        raise DomainError(
            "event_time", "A confirmed event needs an authoritative effective timestamp."
        ) from None
    if timezone.is_naive(effective) or effective > timezone.now() + __import__(
        "datetime"
    ).timedelta(minutes=5):
        raise DomainError("event_time", "Invalid authoritative timestamp.")
    return effective


def _apply_event(*, inbox_id):
    preliminary = EventInbox.objects.select_related("routing").get(pk=inbox_id)
    data = preliminary.payload["data"]
    with transaction.atomic():
        # All application paths take route -> loan -> operation -> inbox locks.
        routing = PaymentRoutingProfile.objects.select_for_update().get(pk=preliminary.routing_id)
        validate_scope(routing, preliminary.payload)
        mapped = PaymentOperation.objects.filter(
            routing=routing, payment_id=str(data.get("id", ""))
        ).first()
        if mapped and mapped.loan_id:
            Loan.objects.select_for_update().get(pk=mapped.loan_id)
        operation = (
            PaymentOperation.objects.select_for_update().filter(pk=mapped.pk).first()
            if mapped
            else None
        )
        inbox = EventInbox.objects.select_for_update().get(pk=inbox_id)
        if inbox.state in {"applied", "evidence_only", "rejected", "reconciliation_required"}:
            return ApplyResult(str(inbox.id), inbox.state)
        inbox.attempts += 1
        if operation is None:
            inbox.state = "awaiting_mapping"
            inbox.save()
            return ApplyResult(str(inbox.id), inbox.state)
        if (
            str(data.get("external_id")) != operation.external_id
            or data.get("amount") != operation.amount
            or data.get("currency") != operation.currency
            or data.get("payable_version") != operation.payable_version
        ):
            inbox.state, inbox.reason = (
                "rejected",
                "Mapped payable fields do not match immutable server snapshot.",
            )
            inbox.save()
            return ApplyResult(str(inbox.id), inbox.state)
        if data["version"] > operation.projection_version:
            operation.projection_version = data["version"]
            operation.projection = data
        event_type = inbox.payload["type"]
        collection = FinancialSource.objects.filter(
            routing=routing, kind="collection", reference=operation.payment_id
        ).first()
        if event_type == "payment.succeeded":
            if not collection:
                effective = parse_effective(data.get("paid_at"))
                if operation.kind == "repayment":
                    record_collection(
                        loan_id=operation.loan_id,
                        amount=operation.amount,
                        effective_at=effective,
                        source_key=f"pixelflow:{routing.id}:collection:{operation.payment_id}",
                    )
                elif operation.kind == "platform_fee":
                    accrual = CommissionAccrual.objects.select_for_update().get(
                        pk=operation.commission_id
                    )
                    if (
                        accrual.status == "reversed"
                        or accrual.collected_amount + operation.amount > accrual.amount
                    ):
                        raise DomainError(
                            "commission_conflict",
                            "Fee collection exceeds the unreversed accrual.",
                            409,
                        )
                    accrual.collected_amount += operation.amount
                    accrual.status = "collected"
                    accrual.save()
                else:
                    raise DomainError("payable_purpose", "Unsupported payable purpose.")
                FinancialSource.objects.create(
                    routing=routing,
                    kind="collection",
                    reference=operation.payment_id,
                    operation=operation,
                    amount=operation.amount,
                    effective_at=effective,
                )
            # Never infer lender settlement from collection. Its field stays unknown.
            if operation.status != "refunded":
                operation.status = "succeeded"
            inbox.state = "applied"
        elif event_type in {"refund.succeeded", "payment.refunded"}:
            refund = inbox.payload.get("refund", {})
            reference, amount = str(refund.get("id", "")), refund.get("amount")
            if not reference or type(amount) is not int or amount <= 0 or amount > operation.amount:
                raise DomainError("refund_contract", "Invalid immutable refund identity or amount.")
            existing = FinancialSource.objects.filter(
                routing=routing, kind="refund", reference=reference
            ).first()
            if existing and (existing.operation_id != operation.id or existing.amount != amount):
                raise DomainError(
                    "refund_conflict", "Refund identity conflicts with prior evidence.", 409
                )
            if not existing:
                if not collection:
                    inbox.state = "awaiting_collection"
                    operation.save()
                    inbox.save()
                    return ApplyResult(str(inbox.id), inbox.state)
                effective = parse_effective(
                    refund.get("succeeded_at")
                    or refund.get("updated_at")
                    or inbox.payload.get("created_at")
                )
                refunded = sum(
                    x.amount
                    for x in FinancialSource.objects.filter(operation=operation, kind="refund")
                )
                if refunded + amount > collection.amount:
                    raise DomainError(
                        "refund_exceeds_collection", "Refund exceeds original collection.", 409
                    )
                if operation.kind == "repayment":
                    reverse_collection(
                        source_key=f"pixelflow:{routing.id}:collection:{operation.payment_id}",
                        refund_key=f"pixelflow:{routing.id}:refund:{reference}",
                        amount=amount,
                        effective_at=effective,
                    )
                else:
                    accrual = CommissionAccrual.objects.select_for_update().get(
                        pk=operation.commission_id
                    )
                    accrual.collected_amount -= amount
                    if accrual.status != "reversed":
                        accrual.status = "pending"
                    accrual.save()
                FinancialSource.objects.create(
                    routing=routing,
                    kind="refund",
                    reference=reference,
                    operation=operation,
                    amount=amount,
                    effective_at=effective,
                    original_reference=operation.payment_id,
                )
                RefundOperation.objects.filter(
                    payment_operation=operation, refund_id=reference
                ).update(status="confirmed")
                operation.status = (
                    "refunded" if refunded + amount == operation.amount else "succeeded"
                )
            inbox.state = "applied"
        elif event_type == "cash.collected":
            inbox.state = "evidence_only"
        elif event_type in {"payment.failed", "payment.cancelled", "payment.expired"}:
            if not collection and data["version"] >= operation.projection_version:
                operation.status = "failed"
            inbox.state = "evidence_only"
        else:
            inbox.state = "evidence_only"
        operation.save()
        inbox.save()
    return ApplyResult(str(inbox.id), inbox.state)


def apply_event(*, inbox_id):
    try:
        return _apply_event(inbox_id=inbox_id)
    except DomainError as error:
        code = str(error.detail.get("code", "financial_review_required"))
        needs_review = code in {
            "historical_reconciliation_required",
            "overpayment",
            "commission_conflict",
            "refund_exceeds_collection",
            "refund_conflict",
            "collection_conflict",
            "not_disbursed",
        }
        state = "reconciliation_required" if needs_review else "rejected"
        EventInbox.objects.filter(pk=inbox_id).update(state=state, reason=code[:300])
        return ApplyResult(str(inbox_id), state)
