import pytest
from accounts.models import Member
from rest_framework.test import APIClient
from verification.models import VerificationCase

pytestmark = pytest.mark.django_db


def test_identity_does_not_create_registration_or_legal_authority():
    member = Member.objects.create_user(username="individual", email="individual@example.test")
    VerificationCase.objects.create(member=member, kind="identity", status="approved")
    client = APIClient()
    client.force_authenticate(member)
    payload = client.get("/api/v1/lender-registration").json()
    assert payload["status"] == "not_submitted"
    assert payload["legal_authorization"] is False
    response = client.post(
        "/api/v1/lender-registration",
        {"authority": "Example review authority", "evidence_ref": "fictional-review-123"},
    )
    assert response.json()["status"] == "submitted"
    assert response.json()["legal_authorization"] is False
