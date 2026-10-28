import copy
import uuid
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier

import pytest
from config.errors import DomainError
from django.db import close_old_connections

from payments.contracts import CheckoutLink
from payments.inbox import receive_webhook
from payments.models import FinancialSource, PaymentOperation
from payments.operations import begin_checkout

from .conftest import signed

pytestmark = pytest.mark.django_db(transaction=True)


def test_concurrent_deliveries_allocate_once(event, routing, funded):
    barrier = Barrier(2)

    def deliver(_):
        close_old_connections()
        twin = copy.deepcopy(event)
        twin["id"] = str(uuid.uuid4())
        body, signature = signed(twin)
        barrier.wait(timeout=10)
        try:
            return receive_webhook(
                routing_id=routing.id,
                raw_body=body,
                signature=signature,
                event_id_header=twin["id"],
            ).state
        finally:
            close_old_connections()

    with ThreadPoolExecutor(max_workers=2) as executor:
        results = list(executor.map(deliver, range(2)))
    assert results == ["applied", "applied"]
    assert FinancialSource.objects.count() == 1
    assert funded.ledger.filter(kind="collection").count() == 1


def test_concurrent_checkout_reserves_one_collectible(routing, funded, members, monkeypatch):
    monkeypatch.setattr(
        "payments.pixelflow.create_checkout",
        lambda **kwargs: CheckoutLink(str(uuid.uuid4()), "https://pay.example.test/hosted", None),
    )
    barrier = Barrier(2)

    def checkout(_):
        close_old_connections()
        barrier.wait(timeout=10)
        try:
            return begin_checkout(
                loan_id=funded.id, payer_id=members[1].id, operation_id=uuid.uuid4()
            ).status
        except DomainError:
            return "blocked"
        finally:
            close_old_connections()

    with ThreadPoolExecutor(max_workers=2) as executor:
        results = list(executor.map(checkout, range(2)))
    assert results.count("blocked") == 1
    assert PaymentOperation.objects.count() == 1


def test_provider_call_occurs_outside_financial_transaction(routing, funded, members, monkeypatch):
    from django.db import connection

    seen = []

    def provider(**kwargs):
        seen.append(connection.in_atomic_block)
        assert PaymentOperation.objects.filter(operation_id=kwargs["operation_id"]).exists()
        return CheckoutLink(str(uuid.uuid4()), "https://pay.example.test/hosted", None)

    monkeypatch.setattr("payments.pixelflow.create_checkout", provider)
    begin_checkout(loan_id=funded.id, payer_id=members[1].id, operation_id=uuid.uuid4())
    assert seen == [False]
