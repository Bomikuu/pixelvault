import uuid

import pytest
from config.errors import DomainError
from rest_framework.test import APIClient

from marketplace.applications import apply_to_offer
from marketplace.models import LoanApplication

pytestmark = pytest.mark.django_db


def test_applicants_cannot_read_each_other(application, members):
    client = APIClient()
    client.force_authenticate(members[2])
    assert client.get(f"/api/v1/applications/{application.id}").status_code == 404
    own = client.get("/api/v1/applications")
    assert own.data == []


def test_lender_sees_only_consent_scoped_summary(application, members):
    client = APIClient()
    client.force_authenticate(members[0])
    data = client.get(f"/api/v1/applications/{application.id}").data
    assert data["summary"] == {"employment_type": "freelancer"}
    assert "private_document" not in str(data)


def test_self_loan_rejected(offer, members):
    with pytest.raises(DomainError, match="cannot apply"):
        apply_to_offer(
            borrower_id=members[0].id,
            offer_id=offer.id,
            principal=1000000,
            operation_id=uuid.uuid4(),
        )


def test_duplicate_active_application_rejected(application, members):
    with pytest.raises(DomainError):
        apply_to_offer(
            borrower_id=members[1].id,
            offer_id=application.offer_id,
            principal=1000000,
            operation_id=uuid.uuid4(),
        )


def test_client_amount_is_not_trusted(offer, members):
    client = APIClient()
    client.force_authenticate(members[1])
    response = client.post(
        f"/api/v1/offers/{offer.id}/applications",
        {"principal": 1000000, "annual_rate_bps": 0, "operation_id": str(uuid.uuid4())},
        format="json",
    )
    assert response.status_code == 400
    assert not LoanApplication.objects.exists()


def test_same_operation_returns_original(offer, members):
    key = uuid.uuid4()
    args = dict(borrower_id=members[1].id, offer_id=offer.id, principal=1000000, operation_id=key)
    assert apply_to_offer(**args).id == apply_to_offer(**args).id


def test_changed_payload_same_key_returns_409(offer, members):
    key = uuid.uuid4()
    args = dict(borrower_id=members[1].id, offer_id=offer.id, principal=1000000, operation_id=key)
    apply_to_offer(**args)
    with pytest.raises(DomainError) as error:
        apply_to_offer(**(args | {"principal": 500000}))
    assert error.value.status_code == 409


def test_lender_decline_is_private_and_does_not_create_financial_fact(application, members):
    from servicing.models import LedgerEntry

    client = APIClient()
    client.force_authenticate(members[0])
    response = client.post(f"/api/v1/applications/{application.id}/decline", {}, format="json")
    assert response.status_code == 200
    assert response.data["status"] == "declined"
    assert response.data["principal"] == 1000000
    assert response.data["agreement_id"] is None
    assert not LedgerEntry.objects.exists()
    client.force_authenticate(members[2])
    assert client.get(f"/api/v1/applications/{application.id}").status_code == 404
