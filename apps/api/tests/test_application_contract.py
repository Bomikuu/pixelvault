import pytest
from accounts.models import Member
from django.core.management import call_command
from marketplace.models import LendingOffer
from rest_framework.test import APIClient
from servicing.models import Loan

pytestmark = pytest.mark.django_db


def test_seeded_application_reads_and_private_public_boundaries():
    call_command("seed_demo", verbosity=0)
    before = LendingOffer.objects.count()
    call_command("seed_demo", verbosity=0)
    assert LendingOffer.objects.count() == before == 5
    client = APIClient()
    offers = client.get("/api/v1/community/discovery")
    assert offers.status_code == 200
    maya = Member.objects.get(email="maya@pixelvault.test")
    client.force_authenticate(maya)
    for url in [
        "/api/v1/loans",
        "/api/v1/applications",
        "/api/v1/documents",
        "/api/v1/loan-documents",
        "/api/v1/people",
        "/api/v1/verification",
        "/api/v1/lender-registration",
        "/api/v1/community/awards",
        "/api/v1/community/threads",
        "/api/v1/cases",
        "/api/v1/reporting/member",
    ]:
        response = client.get(url)
        assert response.status_code == 200, (url, response.status_code, str(response.data))
    public = client.get(f"/api/v1/community/profiles/{maya.pk}")
    assert public.status_code == 200
    assert "maya@pixelvault.test" not in str(public.data)
    assert "principal_balance" not in public.data
    loan = Loan.objects.filter(borrower=maya, status="active").first()
    assert loan is not None and loan.settlement_status == "unknown"
    assert client.get(f"/api/v1/loans/{loan.pk}").status_code == 200
    assert client.get(f"/api/v1/agreements/{loan.agreement_id}/document").content.startswith(
        b"%PDF-"
    )
    admin = Member.objects.get(email="admin@pixelvault.test")
    client.force_authenticate(admin)
    for url in [
        "/api/v1/admin/verifications",
        "/api/v1/admin/registrations",
        "/api/v1/admin/audit",
        "/api/v1/admin/policies",
        "/api/v1/admin/templates",
        "/api/v1/admin/reporting",
        "/api/v1/admin/commissions",
        "/api/v1/admin/reconciliation",
        "/api/v1/admin/cases",
    ]:
        response = client.get(url)
        assert response.status_code == 200, (url, response.status_code, str(response.data))


def test_registration_public_handle_is_not_private_email():
    from accounts.services import register_member

    member = register_member(
        email="private-person@example.test",
        password="StrongPassword!123",
        accepted_policy_version="demo-v1",
    )
    assert "@" not in member.username
    client = APIClient()
    profile = client.get(f"/api/v1/community/profiles/{member.pk}")
    assert profile.status_code == 200
    assert "private-person@example.test" not in str(profile.data)


def test_live_seed_is_rejected(settings):
    from django.core.management.base import CommandError

    settings.ENVIRONMENT = "live"
    with pytest.raises(CommandError):
        call_command("seed_demo")
