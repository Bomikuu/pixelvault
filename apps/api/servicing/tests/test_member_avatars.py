import pytest
from accounts.models import Member
from rest_framework.test import APIClient

from servicing.projections import member_summary

pytestmark = pytest.mark.django_db


@pytest.mark.parametrize("avatar_key", ["", "old-unknown", "https://x.test/a"])
def test_member_summary_omits_unrecognized_avatar_reference(avatar_key):
    member = Member.objects.create_user(
        username="private@example.test", email="private@example.test", avatar_key=avatar_key
    )
    summary = member_summary(member)
    assert summary["avatar_key"] == ""
    assert member.email not in str(summary)


def test_participant_summaries_preserve_selected_avatar_across_financial_routes(
    loan, offer, application, members
):
    lender, borrower = members[:2]
    lender.avatar_key = "keeper"
    lender.username = lender.email
    lender.display_name = ""
    lender.save(update_fields=["avatar_key", "username", "display_name"])
    borrower.avatar_key = "explorer"
    borrower.save(update_fields=["avatar_key"])
    assert member_summary(lender)["avatar_key"] == "keeper"

    client = APIClient()
    client.force_authenticate(borrower)
    paths = [
        f"/api/v1/offers/{offer.id}",
        f"/api/v1/applications/{application.id}",
        f"/api/v1/loans/{loan.id}",
        f"/api/v1/agreements/{loan.agreement_id}",
    ]
    for path in paths:
        response = client.get(path)
        assert response.status_code == 200, (path, response.json())
        body = response.json()
        assert body["lender"]["avatar_key"] == "keeper", path
        if "borrower" in body:
            assert body["borrower"]["avatar_key"] == "explorer", path
        assert lender.email not in str(body), path
        assert borrower.email not in str(body), path
