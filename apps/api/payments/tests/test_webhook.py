import copy
import time
import uuid

import pytest
from config.errors import DomainError

from payments.inbox import apply_event, receive_webhook
from payments.models import EventInbox, FinancialSource

from .conftest import signed

pytestmark = pytest.mark.django_db


def receive(event, routing):
    body, signature = signed(event)
    return receive_webhook(
        routing_id=routing.id, raw_body=body, signature=signature, event_id_header=event["id"]
    )


@pytest.mark.parametrize("change", ["tamper", "expired", "header"])
def test_signature_raw_bytes_expiry_and_header_id(event, routing, change):
    body, signature = signed(event, int(time.time()) - 500 if change == "expired" else None)
    with pytest.raises(DomainError):
        receive_webhook(
            routing_id=routing.id,
            raw_body=body + (b" " if change == "tamper" else b""),
            signature=signature,
            event_id_header="different" if change == "header" else event["id"],
        )
    assert not FinancialSource.objects.exists()
    assert not EventInbox.objects.exists()


@pytest.mark.parametrize(
    "field,value", [("project_id", "wrong"), ("tenant_id", "wrong"), ("environment", "live")]
)
def test_wrong_route_rejected(event, routing, field, value):
    event[field] = value
    with pytest.raises(DomainError):
        receive(event, routing)
    assert not FinancialSource.objects.exists()


@pytest.mark.parametrize(
    "field,value", [("amount", 1), ("currency", "USD"), ("payable_version", "stale")]
)
def test_wrong_payable_rejected(event, routing, field, value):
    event["data"][field] = value
    try:
        receipt = receive(event, routing)
        assert receipt.state == "rejected"
    except DomainError:
        pass
    assert not FinancialSource.objects.exists()


def test_same_payment_cash_and_success_allocate_once(event, routing, funded):
    cash = copy.deepcopy(event)
    cash["id"] = str(uuid.uuid4())
    cash["type"] = "cash.collected"
    assert receive(cash, routing).state == "evidence_only"
    assert funded.ledger.filter(kind="collection").count() == 0
    assert receive(event, routing).state == "applied"
    receive(event, routing)
    twin = copy.deepcopy(event)
    twin["id"] = str(uuid.uuid4())
    receive(twin, routing)
    assert funded.ledger.filter(kind="collection").count() == 1
    funded.refresh_from_db()
    assert funded.status == "repaid"
    assert funded.settlement_status == "unknown"


def refund_event(event):
    value = copy.deepcopy(event)
    value["id"] = str(uuid.uuid4())
    value["type"] = "refund.succeeded"
    value["data"]["version"] = 2
    value["data"]["refunded_amount"] = 50000
    value["refund"] = {
        "id": str(uuid.uuid4()),
        "amount": 50000,
        "status": "succeeded",
        "succeeded_at": event["created_at"],
    }
    return value


def test_duplicate_refund_different_event_id_reverses_once(event, routing, funded):
    receive(event, routing)
    refund = refund_event(event)
    receive(refund, routing)
    refund["id"] = str(uuid.uuid4())
    receive(refund, routing)
    assert funded.ledger.filter(kind="collection_reversed").count() == 1
    funded.refresh_from_db()
    assert funded.principal_balance == 50000


def test_refund_before_collection_waits_for_recovery(event, routing, operation, funded):
    refund = refund_event(event)
    orphan = receive(refund, routing)
    assert orphan.state == "awaiting_collection"
    assert not FinancialSource.objects.exists()
    receive(event, routing)
    apply_event(inbox_id=orphan.inbox_id)
    assert FinancialSource.objects.count() == 2
    operation.refresh_from_db()
    assert operation.projection_version == 2
    assert operation.projection["refunded_amount"] == 50000
    funded.refresh_from_db()
    assert funded.principal_balance == 50000


def test_event_before_mapping_recovers(event, routing, operation):
    original = operation.payment_id
    operation.payment_id = ""
    operation.save()
    receipt = receive(event, routing)
    assert receipt.state == "awaiting_mapping"
    operation.payment_id = original
    operation.save()
    assert apply_event(inbox_id=receipt.inbox_id).state == "applied"
