import pytest
from config.errors import DomainError
from django.utils import timezone

from community.locations import coarse_area
from community.models import Award
from community.profiles import public_profile, set_public_badges
from community.search import search_offers

pytestmark = pytest.mark.django_db


def test_profile_allowlist_excludes_legal_identity_income_and_debt(members):
    lender = members[0]
    data = public_profile(handle=lender.username)
    assert set(data) == {
        "id",
        "handle",
        "display_name",
        "avatar_key",
        "reputation",
        "bio",
        "area",
        "community_level",
        "badges",
        "reviews",
    }
    assert lender.email not in str(data)
    assert public_profile(handle=str(lender.id))["handle"] == lender.username


def test_only_published_available_offers_listed(offer):
    assert len(search_offers()["offers"]) == 1
    offer.status = "draft"
    offer.save()
    assert search_offers()["offers"] == []


def test_markers_are_area_centroids_not_member_homes(offer):
    offer.lender.area = "Makati"
    offer.lender.save()
    data = search_offers()["offers"][0]
    assert data["area"] == coarse_area(area_code=offer.area)
    assert data["area"]["approximate"]
    assert "private_document" not in str(data)


def test_precise_location_filters_are_rejected(offer):
    with pytest.raises(DomainError):
        search_offers(filters={"latitude": "14.23456"})


def test_uncomparable_cost_is_labeled_not_ranked_as_zero(offer):
    data = search_offers(filters={"sort": "cost"})
    assert not data["cost_sort_available"]
    assert data["offers"][0]["comparison"] == "per_offer_example"
    assert data["offers"][0]["cost_example"]["total_repayment"] > 0


def test_public_badge_selection_maximum_three(members):
    from verification.models import VerificationCase

    members[0].literacy_completed = True
    members[0].save(update_fields=["literacy_completed"])
    for kind in ("identity", "income", "contact", "funding_account"):
        VerificationCase.objects.create(member=members[0], kind=kind, status="approved")
    awards = [
        Award.objects.create(member=members[0], key=key, earned_at=timezone.now())
        for key in ("first_chapter", "helping_hand", "clockwork", "full_circle")
    ]
    with pytest.raises(DomainError):
        set_public_badges(member_id=members[0].id, award_ids=[award.id for award in awards])
    set_public_badges(member_id=members[0].id, award_ids=[awards[0].id])
    data = public_profile(handle=members[0].username)
    assert data["badges"][0]["key"] == "first_chapter"
    assert "evidence" not in str(data)
    awards[0].eligible = False
    awards[0].save()
    assert public_profile(handle=members[0].username)["badges"] == []


def test_public_profile_never_falls_back_to_private_email_or_exact_address(members):
    member = members[0]
    member.username = member.email
    member.display_name = ""
    member.area = "123 Synthetic Home Street, 14.123456,121.123456"
    member.save()
    data = public_profile(handle=str(member.id))
    assert data["handle"] == str(member.id)
    assert member.email not in str(data)
    assert "Synthetic Home Street" not in str(data)
    assert data["area"] == ""
