import pytest
from config.errors import DomainError
from django.utils import timezone
from rest_framework.test import APIClient
from verification.models import VerificationCase

from community.awards import evaluate_awards
from community.models import Award, AwardCorrection, Contribution
from community.profiles import public_profile, set_public_badges

pytestmark = pytest.mark.django_db

CONTRIBUTION_THRESHOLDS = {
    "good_neighbor": 1,
    "shared_wisdom": 3,
    "helping_hand": 5,
    "community_guide": 10,
}


def add_contributions(member, count):
    return [
        Contribution.objects.create(
            member=member,
            title=f"Educational note {index}",
            body=f"Distinct educational example {index}",
            status="approved",
        )
        for index in range(count)
    ]


def test_bright_start_requires_completed_literacy_and_no_verification_or_loan(members):
    member = members[1]
    assert evaluate_awards(member_id=member.id)["changed_award_ids"] == []
    member.literacy_completed = True
    member.save(update_fields=["literacy_completed"])
    first = evaluate_awards(member_id=member.id)
    award = Award.objects.get(member=member)
    assert award.key == "bright_start"
    assert award.eligible and not award.private
    assert award.evidence == [str(member.id)]
    assert first["changed_award_ids"] == [str(award.id)]
    assert not VerificationCase.objects.filter(member=member).exists()
    assert evaluate_awards(member_id=member.id)["changed_award_ids"] == []


@pytest.mark.parametrize("count", [0, 1, 2, 3, 4, 5, 9, 10, 11])
def test_distinct_approved_contribution_thresholds(members, count):
    member = members[1]
    approved = add_contributions(member, count)
    # Pending and rejected work never counts. Neither do approved copies whose
    # only differences are case or repeated whitespace.
    for status in ("pending", "rejected"):
        Contribution.objects.create(
            member=member, title=status, body=f"Unapproved {status} work", status=status
        )
    if approved:
        Contribution.objects.create(
            member=member,
            title="Duplicate with formatting changes",
            body="  DISTINCT   educational\n example  0  ",
            status="approved",
        )
    evaluate_awards(member_id=member.id)
    earned = {key for key, threshold in CONTRIBUTION_THRESHOLDS.items() if count >= threshold}
    assert set(Award.objects.filter(member=member).values_list("key", flat=True)) == earned
    for award in Award.objects.filter(member=member):
        assert award.eligible and not award.private
        assert len(award.evidence) == count
        assert len(set(award.evidence)) == count
    assert evaluate_awards(member_id=member.id)["changed_award_ids"] == []


@pytest.mark.parametrize("key,threshold", CONTRIBUTION_THRESHOLDS.items())
def test_moderation_revocation_hides_educational_badge_before_worker_and_preserves_history(
    members, key, threshold
):
    member = members[1]
    contributions = add_contributions(member, threshold)
    evaluate_awards(member_id=member.id)
    award = Award.objects.get(member=member, key=key)
    earned_at = award.earned_at
    set_public_badges(member_id=member.id, award_ids=[award.id])
    assert [row["key"] for row in public_profile(handle=member.username)["badges"]] == [key]

    revoked = contributions[-1]
    revoked.status = "rejected"
    revoked.version += 1
    revoked.save(update_fields=["status", "version"])
    public = public_profile(handle=member.username)
    assert public["badges"] == []
    assert "moderation_reason" not in public
    assert "rejected" not in str(public)
    award.refresh_from_db()
    assert award.eligible  # Public reads do not mutate private history.
    assert not AwardCorrection.objects.filter(award=award).exists()

    evaluate_awards(member_id=member.id)
    award.refresh_from_db()
    assert not award.eligible
    assert AwardCorrection.objects.filter(award=award, eligible=False).count() == 1
    assert evaluate_awards(member_id=member.id)["changed_award_ids"] == []
    assert AwardCorrection.objects.filter(award=award).count() == 1

    revoked.status = "approved"
    revoked.version += 1
    revoked.save(update_fields=["status", "version"])
    evaluate_awards(member_id=member.id)
    award.refresh_from_db()
    assert award.eligible and award.earned_at == earned_at
    assert AwardCorrection.objects.filter(award=award).count() == 2
    assert [row["key"] for row in public_profile(handle=member.username)["badges"]] == [key]


def test_literacy_correction_immediately_hides_bright_start(members):
    member = members[1]
    member.literacy_completed = True
    member.save(update_fields=["literacy_completed"])
    evaluate_awards(member_id=member.id)
    award = Award.objects.get(member=member, key="bright_start")
    set_public_badges(member_id=member.id, award_ids=[award.id])
    assert len(public_profile(handle=member.username)["badges"]) == 1
    member.literacy_completed = False
    member.save(update_fields=["literacy_completed"])
    assert public_profile(handle=member.username)["badges"] == []
    evaluate_awards(member_id=member.id)
    award.refresh_from_db()
    assert not award.eligible


def test_educational_badges_remain_optional_limit_three_and_fresh_start_stays_private(members):
    member = members[1]
    member.literacy_completed = True
    member.save(update_fields=["literacy_completed"])
    add_contributions(member, 10)
    evaluate_awards(member_id=member.id)
    assert public_profile(handle=member.username)["badges"] == []
    selected = list(
        Award.objects.filter(
            member=member, key__in=["bright_start", "good_neighbor", "shared_wisdom"]
        )
    )
    set_public_badges(member_id=member.id, award_ids=[award.id for award in selected])
    assert len(public_profile(handle=member.username)["badges"]) == 3
    fourth = Award.objects.get(member=member, key="community_guide")
    with pytest.raises(DomainError, match="at most three"):
        set_public_badges(member_id=member.id, award_ids=[a.id for a in selected] + [fourth.id])
    private = Award.objects.create(
        member=member, key="fresh_start", private=True, earned_at=timezone.now()
    )
    with pytest.raises(DomainError, match="shareable"):
        set_public_badges(member_id=member.id, award_ids=[private.id])
    public = public_profile(handle=member.username)
    assert all(row["key"] != "fresh_start" for row in public["badges"])
    assert "evidence" not in str(public)


def test_catalog_includes_named_educational_awards_without_member_evidence(members):
    response = APIClient().get("/api/v1/community/achievement-catalog")
    assert response.status_code == 200
    catalog = {row["key"]: row for row in response.json()["catalog"]}
    assert len(catalog) == 10
    for key, name in {
        "bright_start": "Bright Start",
        "good_neighbor": "Good Neighbor",
        "shared_wisdom": "Shared Wisdom",
        "community_guide": "Community Guide",
    }.items():
        assert catalog[key]["name"] == name
        assert catalog[key]["criteria"]
        assert catalog[key]["private"] is False
        assert set(catalog[key]) == {"key", "name", "criteria", "private"}
    assert catalog["fresh_start"]["private"] is True
    assert members[1].email not in str(response.json())
