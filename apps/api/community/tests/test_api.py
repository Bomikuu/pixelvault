import uuid

import pytest
from rest_framework.test import APIClient

pytestmark = pytest.mark.django_db


def test_public_profile_uuid_and_discovery_contract(offer, members):
    client = APIClient()
    profile = client.get(f"/api/v1/community/profiles/{members[0].id}")
    assert profile.status_code == 200
    assert profile.json()["handle"] == members[0].username
    data = client.get("/api/v1/community/discovery").json()
    assert data["offers"][0]["area"]["approximate"] is True
    assert "declared_available_amount" in data["offers"][0]


def test_profile_edit_is_allowlisted_atomic(members):
    client = APIClient()
    client.force_authenticate(members[0])
    response = client.patch(
        "/api/v1/community/profile",
        {"display_name": "Unexpected", "public_award_ids": [str(uuid.uuid4())]},
        format="json",
    )
    assert response.status_code == 400
    members[0].refresh_from_db()
    assert members[0].display_name != "Unexpected"
    assert (
        client.patch("/api/v1/community/profile", {"suspended": False}, format="json").status_code
        == 400
    )


def test_case_and_report_endpoints_are_scoped(members):
    client = APIClient()
    client.force_authenticate(members[1])
    response = client.post(
        "/api/v1/cases",
        {"kind": "complaint", "body": "Synthetic complaint", "operation_id": str(uuid.uuid4())},
        format="json",
    )
    assert response.status_code == 201
    case_id = response.json()["id"]
    client.force_authenticate(members[2])
    assert client.get(f"/api/v1/cases/{case_id}").status_code == 404
    assert client.get("/api/v1/reporting/member?actor_id=untrusted").status_code == 400
    assert client.get("/api/v1/admin/reporting").status_code == 403


def test_staff_case_detail_is_redacted_until_assigned(loan, members):
    from accounts.models import Member
    from cases.services import open_case

    case = open_case(
        actor_id=members[1].id,
        loan_id=loan.id,
        kind="complaint",
        body="Private synthetic complaint",
        operation_id=uuid.uuid4(),
    )
    staff = Member.objects.create_user(
        username="support-api",
        email="support-api@example.test",
        password=None,
        is_staff=True,
        staff_role="support",
    )
    client = APIClient()
    client.force_authenticate(staff)
    redacted = client.get(f"/api/v1/admin/cases/{case.id}")
    assert redacted.status_code == 200
    assert "body" not in redacted.json()
    assert "loan_id" not in redacted.json()
    assert (
        client.post(f"/api/v1/admin/cases/{case.id}/assign", {}, format="json").status_code == 200
    )
    assert client.get(f"/api/v1/admin/cases/{case.id}").json()["body"] == case.body


def test_private_repayment_summary_requires_existing_relationship(loan, members):
    client = APIClient()
    client.force_authenticate(members[0])
    response = client.get(
        f"/api/v1/community/repayment-summary/{members[1].id}?purpose=existing_relationship"
    )
    assert response.status_code == 200
    assert response.json()["loan_count"] == 1
    client.force_authenticate(members[2])
    assert (
        client.get(
            f"/api/v1/community/repayment-summary/{members[1].id}?purpose=existing_relationship"
        ).status_code
        == 404
    )
