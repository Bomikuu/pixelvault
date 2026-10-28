import uuid

import pytest
from config.errors import DomainError
from rest_framework.test import APIClient

from payments.contracts import CheckoutLink
from payments.models import PaymentOperation
from payments.operations import begin_checkout

pytestmark = pytest.mark.django_db


def test_preview_distinguishes_installment_payoff_and_partial(funded, members):
    client = APIClient()
    client.force_authenticate(members[1])
    installment = client.get(f"/api/v1/loans/{funded.id}/payment-preview").data
    payoff = client.get(f"/api/v1/loans/{funded.id}/payment-preview?mode=payoff").data
    partial = client.get(
        f"/api/v1/loans/{funded.id}/payment-preview?mode=partial&amount=10000"
    ).data
    assert installment["amount"] == funded.agreement.disclosure["schedule"][0]["total"]
    assert payoff["amount"] == 1000000
    assert partial["amount"] == 10000
    assert installment["amount"] < payoff["amount"]
    assert "No unearned future interest" in partial["allocation_note"]


def test_partial_checkout_uses_validated_amount(routing, funded, members, monkeypatch):
    received = []

    def create_checkout(**kwargs):
        received.append(kwargs["payable"])
        return CheckoutLink(str(uuid.uuid4()), "https://pay.example.test/hosted", None)

    monkeypatch.setattr("payments.pixelflow.create_checkout", create_checkout)
    begin_checkout(
        loan_id=funded.id,
        payer_id=members[1].id,
        operation_id=uuid.uuid4(),
        mode="partial",
        requested_amount=10000,
    )
    assert received[0].amount == 10000
    assert PaymentOperation.objects.get().amount == 10000


@pytest.mark.parametrize("amount", [True, 1.5, 0, -1, 1000001, 9007199254740992])
def test_partial_rejects_unsafe_or_excess_amount(routing, funded, members, amount):
    with pytest.raises(DomainError):
        begin_checkout(
            loan_id=funded.id,
            payer_id=members[1].id,
            operation_id=uuid.uuid4(),
            mode="partial",
            requested_amount=amount,
        )
    assert not PaymentOperation.objects.exists()


def test_changed_payment_request_same_operation_rejected(routing, funded, members, monkeypatch):
    monkeypatch.setattr(
        "payments.pixelflow.create_checkout",
        lambda **kwargs: CheckoutLink(str(uuid.uuid4()), "https://pay.example.test/hosted", None),
    )
    key = uuid.uuid4()
    begin_checkout(
        loan_id=funded.id,
        payer_id=members[1].id,
        operation_id=key,
        mode="partial",
        requested_amount=10000,
    )
    with pytest.raises(DomainError) as error:
        begin_checkout(
            loan_id=funded.id,
            payer_id=members[1].id,
            operation_id=key,
            mode="partial",
            requested_amount=20000,
        )
    assert error.value.status_code == 409
