# ruff: noqa: F401, F811
import hashlib
import hmac
import json
import time
import uuid

import pytest
from django.utils import timezone
from servicing.tests.conftest import application, eligible, funded, loan, members, offer, terms

from payments.models import PaymentOperation, PaymentRoutingProfile


@pytest.fixture
def routing(funded, members, monkeypatch):
    monkeypatch.setenv("PIXELVAULT_TEST_KEY", "synthetic-server-key")
    monkeypatch.setenv("PIXELVAULT_TEST_WEBHOOK", "synthetic-signature-key")
    return PaymentRoutingProfile.objects.create(
        name="Synthetic individual repayment",
        project_id="project-test",
        tenant_id="tenant-test",
        environment="test",
        purpose="repayment",
        lender=members[0],
        credential_env="PIXELVAULT_TEST_KEY",
        webhook_secret_env="PIXELVAULT_TEST_WEBHOOK",
        base_url="http://localhost:8000/api/v1",
        approved=True,
        evidence_reference="synthetic fixture, no live approval",
    )


@pytest.fixture
def operation(routing, funded, members):
    identifier = uuid.uuid4()
    return PaymentOperation.objects.create(
        id=identifier,
        operation_id=uuid.uuid4(),
        loan=funded,
        routing=routing,
        payer=members[1],
        kind="repayment",
        amount=1000000,
        payable_version=funded.agreement.hash,
        external_id=str(identifier),
        status="awaiting_payment",
        payment_id=str(uuid.uuid4()),
        payload_hash="fixture",
    )


@pytest.fixture
def event(operation, routing):
    now = timezone.now().isoformat()
    return {
        "id": str(uuid.uuid4()),
        "type": "payment.succeeded",
        "api_version": "2026-10-24",
        "created_at": now,
        "project_id": routing.project_id,
        "tenant_id": routing.tenant_id,
        "environment": "test",
        "data": {
            "id": operation.payment_id,
            "external_id": operation.external_id,
            "payable_version": operation.payable_version,
            "amount": operation.amount,
            "currency": "PHP",
            "method": "gcash",
            "status": "succeeded",
            "version": 1,
            "refunded_amount": 0,
            "reserved_refund_amount": 0,
            "refundable_amount": operation.amount,
            "settlement_status": "unknown",
            "reconciliation_required": False,
            "created_at": now,
            "paid_at": now,
        },
    }


def signed(event, timestamp=None):
    body = json.dumps(event, separators=(",", ":")).encode()
    stamp = str(int(time.time()) if timestamp is None else timestamp)
    message = event["id"].encode() + b"." + stamp.encode() + b"." + body
    digest = hmac.new(b"synthetic-signature-key", message, hashlib.sha256).hexdigest()
    return body, f"t={stamp},v1={digest}"
