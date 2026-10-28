import json
import uuid

import pytest
from config.errors import DomainError
from rest_framework.test import APIClient

from payments.models import PaymentOperation
from payments.operations import begin_checkout

pytestmark = pytest.mark.django_db


def test_exact_checkout_request_and_server_scope(routing, funded, members, httpx_mock):
    payment_id = str(uuid.uuid4())
    httpx_mock.add_response(
        url="http://localhost:8000/api/v1/checkout-sessions",
        method="POST",
        json={
            "id": str(uuid.uuid4()),
            "payment_id": payment_id,
            "checkout_url": "https://pay.example.test/hosted",
            "expires_at": "2026-12-01T00:00:00+00:00",
            "status": "pending",
        },
    )
    key = uuid.uuid4()
    result = begin_checkout(
        loan_id=funded.id, payer_id=members[1].id, operation_id=key, mode="payoff"
    )
    request = httpx_mock.get_request()
    payload = json.loads(request.content)
    operation = PaymentOperation.objects.get(operation_id=key)
    assert payload == {
        "external_id": str(operation.id),
        "version": funded.agreement.hash,
        "amount": 1000000,
        "currency": "PHP",
        "description": "PixelVault test repayment",
        "methods": ["gcash", "card"],
        "success_url": "http://127.0.0.1:5178/payments?checkout=returned",
        "cancel_url": "http://127.0.0.1:5178/payments?checkout=cancelled",
    }
    assert request.headers["Idempotency-Key"] == str(key)
    assert request.headers["Authorization"] == "Bearer synthetic-server-key"
    assert result.payment_id == payment_id
    assert "income" not in request.content.decode()


def test_client_price_or_routing_rejected(funded, members):
    client = APIClient()
    client.force_authenticate(members[1])
    response = client.post(
        f"/api/v1/loans/{funded.id}/checkout",
        {"amount": 1, "routing_id": str(uuid.uuid4()), "operation_id": str(uuid.uuid4())},
        format="json",
    )
    assert response.status_code == 400
    assert not PaymentOperation.objects.exists()


def test_pending_collectible_blocks_parallel_checkout(operation, funded, members):
    with pytest.raises(DomainError) as error:
        begin_checkout(loan_id=funded.id, payer_id=members[1].id, operation_id=uuid.uuid4())
    assert error.value.detail["code"] == "checkout_pending"


def test_timeout_reuses_original_key(routing, funded, members, httpx_mock):
    import httpx

    httpx_mock.add_exception(
        httpx.ReadTimeout("synthetic timeout"), url="http://localhost:8000/api/v1/checkout-sessions"
    )
    httpx_mock.add_response(
        url="http://localhost:8000/api/v1/checkout-sessions",
        json={
            "id": str(uuid.uuid4()),
            "payment_id": str(uuid.uuid4()),
            "checkout_url": "https://pay.example.test/hosted",
            "status": "pending",
        },
    )
    key = uuid.uuid4()
    with pytest.raises(DomainError):
        begin_checkout(loan_id=funded.id, payer_id=members[1].id, operation_id=key, mode="payoff")
    assert PaymentOperation.objects.get().status == "uncertain"
    begin_checkout(loan_id=funded.id, payer_id=members[1].id, operation_id=key, mode="payoff")
    assert PaymentOperation.objects.count() == 1
    assert {x.headers["Idempotency-Key"] for x in httpx_mock.get_requests()} == {str(key)}
