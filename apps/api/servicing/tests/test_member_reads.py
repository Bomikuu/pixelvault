import pytest
from rest_framework.test import APIClient

pytestmark = pytest.mark.django_db


def test_other_member_cannot_read_loan_receipt(funded, members):
    client = APIClient()
    client.force_authenticate(members[2])
    for suffix in ("", "/timeline", "/payments", "/documents"):
        assert client.get(f"/api/v1/loans/{funded.id}{suffix}").status_code == 404


def test_people_only_actual_associations(funded, members):
    client = APIClient()
    client.force_authenticate(members[0])
    assert [x["id"] for x in client.get("/api/v1/people").data] == [str(members[1].id)]


def test_timeline_excludes_private_metadata(funded, members):
    client = APIClient()
    client.force_authenticate(members[0])
    result = client.get(f"/api/v1/loans/{funded.id}/timeline")
    assert result.status_code == 200
    assert "metadata" not in str(result.data)
    projection = client.get(f"/api/v1/loans/{funded.id}").data
    assert projection["settlement_status"] == "unknown"


def test_collection_acknowledgment_private_and_downloadable(funded, members):
    from django.utils import timezone

    from servicing.allocation import record_collection

    record_collection(
        loan_id=funded.id, amount=10000, effective_at=timezone.now(), source_key="receipt-fixture"
    )
    client = APIClient()
    client.force_authenticate(members[1])
    listing = client.get(f"/api/v1/loans/{funded.id}/documents").data
    receipt = next(item for item in listing if item["kind"] == "receipt")
    response = client.get(receipt["url"])
    assert response.status_code == 200 and response.content.startswith(b"%PDF")
    assert response["Cache-Control"] == "private, no-store"
    client.force_authenticate(members[2])
    assert client.get(receipt["url"]).status_code == 404
