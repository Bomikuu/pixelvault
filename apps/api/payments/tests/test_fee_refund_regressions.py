import copy
import uuid
from concurrent.futures import ThreadPoolExecutor
from types import SimpleNamespace

import pytest
from django.db import close_old_connections, connection
from django.utils import timezone
from servicing.allocation import record_collection

from payments.inbox import apply_event, persist_event
from payments.models import (
    FinancialSource,
    PaymentOperation,
    PaymentRoutingProfile,
    RefundOperation,
)
from payments.operations import begin_commission_checkout, request_refund

pytestmark = pytest.mark.django_db


def test_fee_checkout_after_partial_refund_collects_remaining(
    funded, members, routing, monkeypatch
):
    accrual = funded.commission
    accrual.collected_amount = 15000
    accrual.status = "pending"
    accrual.save()
    PaymentRoutingProfile.objects.create(
        name="Synthetic fee",
        project_id="fee",
        tenant_id="fee",
        environment="test",
        purpose="platform_fee",
        approved=True,
        evidence_reference="Synthetic review fixture",
    )
    monkeypatch.setattr(
        "payments.pixelflow.create_checkout",
        lambda **kwargs: SimpleNamespace(
            payment_id=str(uuid.uuid4()), checkout_url="https://example.test/pay", expires_at=None
        ),
    )
    key = uuid.uuid4()
    begin_commission_checkout(accrual_id=accrual.id, payer_id=members[0].id, operation_id=key)
    assert PaymentOperation.objects.get(operation_id=key).amount == 5000


@pytest.mark.django_db(transaction=True)
def test_refund_webhook_before_response_resolves_reserved_refund(
    operation, routing, funded, event, monkeypatch
):
    effective = timezone.now()
    record_collection(
        loan_id=funded.id,
        amount=operation.amount,
        effective_at=effective,
        source_key=f"pixelflow:{routing.id}:collection:{operation.payment_id}",
    )
    FinancialSource.objects.create(
        routing=routing,
        kind="collection",
        reference=operation.payment_id,
        operation=operation,
        amount=operation.amount,
        effective_at=effective,
    )
    reference = str(uuid.uuid4())
    refund_event = copy.deepcopy(event)
    refund_event["type"] = "refund.succeeded"
    refund_event["data"]["version"] = 2
    refund_event["refund"] = {
        "id": reference,
        "amount": 500000,
        "succeeded_at": timezone.now().isoformat(),
    }

    class Client:
        def request_refund(self, *args):
            assert not connection.in_atomic_block

            def deliver():
                close_old_connections()
                try:
                    inbox = persist_event(routing=routing, event=refund_event)
                    return apply_event(inbox_id=inbox.id).state
                finally:
                    close_old_connections()

            with ThreadPoolExecutor(max_workers=1) as executor:
                assert executor.submit(deliver).result(timeout=10) == "applied"
            return {"id": reference}

    monkeypatch.setattr("payments.pixelflow.client_for", lambda route: Client())
    key = uuid.uuid4()
    refund = request_refund(
        payment_operation_id=operation.id,
        amount=500000,
        reason="Synthetic early confirmation",
        operation_id=key,
    )
    assert refund.status == "confirmed"
    assert refund.refund_id == reference
    assert not RefundOperation.objects.filter(status__in=["pending", "uncertain"]).exists()
    assert (
        request_refund(
            payment_operation_id=operation.id,
            amount=500000,
            reason="Synthetic early confirmation",
            operation_id=key,
        ).id
        == refund.id
    )
    assert FinancialSource.objects.filter(kind="refund").count() == 1
    assert funded.ledger.filter(kind="collection_reversed").count() == 1


@pytest.mark.django_db(transaction=True)
def test_refund_timeout_retries_persisted_payload_and_key_once(
    operation, routing, funded, httpx_mock
):
    import json

    import httpx
    from config.errors import DomainError

    effective = timezone.now()
    record_collection(
        loan_id=funded.id,
        amount=operation.amount,
        effective_at=effective,
        source_key=f"pixelflow:{routing.id}:collection:{operation.payment_id}",
    )
    FinancialSource.objects.create(
        routing=routing,
        kind="collection",
        reference=operation.payment_id,
        operation=operation,
        amount=operation.amount,
        effective_at=effective,
    )
    endpoint = f"http://localhost:8000/api/v1/payments/{operation.payment_id}/refunds"
    httpx_mock.add_exception(
        httpx.ConnectTimeout("Synthetic failure before provider receives request"),
        url=endpoint,
        method="POST",
    )
    reference = str(uuid.uuid4())

    def provider(request):
        assert not connection.in_atomic_block
        assert RefundOperation.objects.count() == 1
        return httpx.Response(200, json={"id": reference})

    httpx_mock.add_callback(provider, url=endpoint, method="POST")
    key = uuid.uuid4()
    kwargs = dict(
        payment_operation_id=operation.id,
        amount=500000,
        reason="Synthetic same-key recovery",
        operation_id=key,
    )
    first = request_refund(**kwargs)
    assert first.status == "uncertain" and first.refund_id == ""
    recovered = request_refund(**kwargs)
    assert recovered.id == first.id and recovered.refund_id == reference
    assert recovered.status == "pending"
    assert RefundOperation.objects.count() == 1
    assert {request.headers["Idempotency-Key"] for request in httpx_mock.get_requests()} == {
        str(key)
    }
    assert [json.loads(request.content) for request in httpx_mock.get_requests()] == [
        {"amount": 500000, "reason": "Synthetic same-key recovery"}
    ] * 2
    assert request_refund(**kwargs).id == recovered.id
    assert len(httpx_mock.get_requests()) == 2
    with pytest.raises(DomainError) as error:
        request_refund(**(kwargs | {"amount": 400000}))
    assert error.value.status_code == 409
