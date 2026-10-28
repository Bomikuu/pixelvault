import pytest
from accounts.models import Member
from accounts.services import register_member
from config.errors import DomainError
from django.utils import timezone
from eligibility.services import check_eligibility
from rest_framework.test import APIClient

pytestmark = pytest.mark.django_db


def test_registration_requires_policy_acceptance():
    with pytest.raises(DomainError):
        register_member(
            email="member@example.test", password="strong-pass-1234", accepted_policy_version=""
        )


def test_dual_role_member_uses_one_session():
    member = register_member(
        email="member@example.test", password="strong-pass-1234", accepted_policy_version="demo-v1"
    )
    client = APIClient()
    response = client.post(
        "/api/v1/auth/sign-in", {"email": member.email, "password": "strong-pass-1234"}
    )
    assert response.status_code == 200
    assert client.get("/api/v1/auth/session").json()["member"]["id"] == str(member.pk)
    assert client.get("/api/v1/auth/session").json()["environment"] == "test"


def test_csrf_required():
    member = Member.objects.create_user(
        username="csrf", email="csrf@example.test", password="strong-pass-1234"
    )
    client = APIClient(enforce_csrf_checks=True)
    client.force_login(member)
    assert client.patch("/api/v1/auth/profile", {"bio": "changed"}).status_code == 403


def test_suspension_preserves_existing_obligation_purposes():
    member = Member.objects.create_user(
        username="suspended", email="suspended@example.test", suspended=True
    )
    assert not check_eligibility(member_id=member.pk, purpose="apply", at=timezone.now()).allowed
    for purpose in ["repay", "view_document", "complain"]:
        assert check_eligibility(member_id=member.pk, purpose=purpose, at=timezone.now()).allowed


def test_public_auth_never_leaks_other_private_member():
    first = Member.objects.create_user(username="first", email="first@example.test")
    Member.objects.create_user(username="second", email="private@example.test")
    client = APIClient()
    client.force_authenticate(first)
    assert "private@example.test" not in str(client.get("/api/v1/auth/session").json())


def test_staff_role_requires_purpose_grant():
    member = Member.objects.create_user(
        username="staff", email="staff@example.test", is_staff=True, staff_role="moderator"
    )
    client = APIClient()
    client.force_authenticate(member)
    assert client.get("/api/v1/admin/verifications").status_code == 403
