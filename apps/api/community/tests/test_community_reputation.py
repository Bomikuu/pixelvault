import uuid

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from community.awards import evaluate_awards
from community.models import Award, Contribution, ProfileSettings
from community.profiles import public_identity, public_profile
from community.reputation import REPUTATION_RULES, community_facts, reputation_details

pytestmark = pytest.mark.django_db


def contributions(member, count, *, status="approved"):
    return [
        Contribution.objects.create(
            member=member,
            title=f"Learning note {index}",
            body=f"Distinct educational note {index}",
            status=status,
        )
        for index in range(count)
    ]


def client_for(member):
    client = APIClient()
    client.force_authenticate(member)
    return client


def opt_in(member, *, visible=True):
    return ProfileSettings.objects.create(
        member=member, leaderboard_opt_in=True, show_reputation=visible
    )


@pytest.mark.parametrize(
    "literacy,count,points,level",
    [
        (False, 0, 0, "Newcomer"),
        (False, 1, 50, "Newcomer"),
        (True, 0, 100, "Prepared"),
        (True, 2, 200, "Prepared"),
        (True, 3, 250, "Contributor"),
        (True, 7, 450, "Contributor"),
        (True, 8, 500, "Guide"),
        (True, 17, 950, "Guide"),
        (True, 18, 1000, "Luminary"),
        (True, 25, 1100, "Luminary"),
        (False, 25, 1000, "Luminary"),
    ],
)
def test_authoritative_learning_points_thresholds_and_cap(members, literacy, count, points, level):
    member = members[1]
    member.literacy_completed = literacy
    member.save(update_fields=["literacy_completed"])
    contributions(member, count)
    facts = community_facts(member)
    assert facts["points"] == points
    assert facts["level"] == level
    assert facts["approved_contributions"] == count


def test_canonical_duplicates_and_unapproved_contributions_add_no_points(members):
    member = members[1]
    contributions(member, 1)
    for body, status in [
        ("  DISTINCT   educational\n note 0  ", "approved"),
        ("Another pending note", "pending"),
        ("Another rejected note", "rejected"),
    ]:
        Contribution.objects.create(member=member, title="Variant", body=body, status=status)
    assert community_facts(member)["points"] == 50
    assert community_facts(member)["approved_contributions"] == 1


def test_lending_activity_gives_no_community_points_or_public_financial_penalty(loan, members):
    for member in members[:2]:
        assert community_facts(member)["points"] == 0
    loan.status = "closed_with_loss"
    loan.principal_balance = 1000000
    loan.save()
    identity = public_identity(members[1])
    assert identity["reputation"]["points"] == 0
    assert "closed_with_loss" not in str(identity)
    assert "principal" not in str(identity)


def test_authenticated_details_explain_progress_frames_and_default_privacy(members):
    member = members[1]
    member.literacy_completed = True
    member.save(update_fields=["literacy_completed"])
    contributions(member, 2)
    response = client_for(member).get("/api/v1/community/reputation")
    assert response.status_code == 200
    data = response.json()
    assert data["reputation"] == {
        "points": 200,
        "level": "Prepared",
        "frame": "plain",
        "flair": None,
        "show_points": True,
    }
    assert data["rules"] == REPUTATION_RULES
    assert data["progress"] == {"next_level": "Contributor", "points_to_next": 50}
    assert data["breakdown"] == {
        "literacy_points": 100,
        "contribution_points": 100,
        "approved_contributions": 2,
    }
    assert data["settings"] == {
        "avatar_frame": "plain",
        "avatar_flair_id": None,
        "show_reputation": True,
        "leaderboard_opt_in": False,
    }
    assert [frame["key"] for frame in data["frames"] if frame["unlocked"]] == ["plain", "blue"]
    assert APIClient().get("/api/v1/community/reputation").status_code == 403


def test_max_level_has_no_fake_additional_progress(members):
    member = members[1]
    contributions(member, 20)
    assert reputation_details(member=member)["progress"] == {
        "next_level": None,
        "points_to_next": 0,
    }


def test_unlocked_frame_and_own_shareable_flair_persist_and_clear(members):
    member = members[1]
    member.literacy_completed = True
    member.save(update_fields=["literacy_completed"])
    evaluate_awards(member_id=member.id)
    award = Award.objects.get(member=member, key="bright_start")
    client = client_for(member)
    response = client.patch(
        "/api/v1/community/profile",
        {"avatar_frame": "blue", "avatar_flair_id": str(award.id), "leaderboard_opt_in": True},
        format="json",
    )
    assert response.status_code == 200
    assert response.json()["reputation"]["frame"] == "blue"
    assert response.json()["reputation"]["flair"]["key"] == "bright_start"
    assert "evidence" not in str(response.json()["reputation"])
    preferences = ProfileSettings.objects.get(member=member)
    assert preferences.avatar_frame == "blue"
    assert preferences.avatar_flair_id == award.id
    assert preferences.leaderboard_opt_in
    cleared = client.patch(
        "/api/v1/community/profile",
        {"avatar_frame": "plain", "avatar_flair_id": None, "leaderboard_opt_in": False},
        format="json",
    )
    assert cleared.status_code == 200
    assert cleared.json()["reputation"]["flair"] is None
    preferences.refresh_from_db()
    assert preferences.avatar_flair_id is None
    assert not preferences.leaderboard_opt_in


@pytest.mark.parametrize("frame,status", [("gold", 403), ("unlisted", 400), ([], 400), (None, 400)])
def test_invalid_or_locked_frame_rolls_back_other_profile_changes(members, frame, status):
    member = members[1]
    original = member.display_name
    response = client_for(member).patch(
        "/api/v1/community/profile",
        {"avatar_frame": frame, "display_name": "Do not persist"},
        format="json",
    )
    assert response.status_code == status
    member.refresh_from_db()
    assert member.display_name == original
    assert not ProfileSettings.objects.filter(member=member).exists()


@pytest.mark.parametrize(
    "kind", ["foreign", "private", "ineligible", "stale", "unknown", "malformed"]
)
def test_flair_rejects_foreign_private_ineligible_stale_or_invalid_awards(members, kind):
    member = members[1]
    award = Award.objects.create(
        member=members[0] if kind == "foreign" else member,
        key="fresh_start" if kind == "private" else "good_neighbor",
        eligible=kind != "ineligible",
        private=kind == "private",
        earned_at=timezone.now(),
    )
    if kind in {"foreign", "ineligible"}:
        contributions(award.member, 1)
    flair_id = (
        "invalid" if kind == "malformed" else str(uuid.uuid4() if kind == "unknown" else award.id)
    )
    response = client_for(member).patch(
        "/api/v1/community/profile", {"avatar_flair_id": flair_id}, format="json"
    )
    assert response.status_code == 400
    assert response.json()["code"] == "invalid_flair"
    assert not ProfileSettings.objects.filter(member=member).exists()


@pytest.mark.parametrize("field", ["show_reputation", "leaderboard_opt_in"])
@pytest.mark.parametrize("value", ["true", 1, None, [], {}])
def test_visibility_settings_require_actual_booleans(members, field, value):
    response = client_for(members[1]).patch(
        "/api/v1/community/profile", {field: value}, format="json"
    )
    assert response.status_code == 400
    assert response.json()["code"] == "invalid_preferences"


def test_evidence_revocation_immediately_hides_frame_and_flair_before_worker(members):
    member = members[1]
    member.literacy_completed = True
    member.save(update_fields=["literacy_completed"])
    records = contributions(member, 3)
    evaluate_awards(member_id=member.id)
    award = Award.objects.get(member=member, key="shared_wisdom")
    ProfileSettings.objects.create(member=member, avatar_frame="leaf", avatar_flair_id=award.id)
    assert public_profile(handle=member.username)["reputation"]["frame"] == "leaf"
    records[-1].status = "rejected"
    records[-1].save(update_fields=["status"])
    reputation = public_profile(handle=member.username)["reputation"]
    assert reputation == {
        "points": 200,
        "level": "Prepared",
        "frame": "plain",
        "flair": None,
        "show_points": True,
    }
    award.refresh_from_db()
    assert award.eligible  # Source facts protect public rendering before outbox evaluation.


@pytest.mark.parametrize("correction", ["rejected", "expired", "literacy"])
def test_first_chapter_shelf_and_flair_hide_stale_onboarding_without_private_reasons(
    members, correction
):
    from datetime import timedelta

    from verification.models import VerificationCase

    member = members[1]
    member.literacy_completed = True
    member.save(update_fields=["literacy_completed"])
    for kind in ("identity", "income", "contact", "funding_account"):
        VerificationCase.objects.create(member=member, kind=kind, status="approved")
    evaluate_awards(member_id=member.id)
    award = Award.objects.get(member=member, key="first_chapter")
    ProfileSettings.objects.create(
        member=member,
        public_award_ids=[str(award.id)],
        avatar_flair_id=award.id,
    )
    before = public_profile(handle=member.username)
    assert before["badges"][0]["key"] == "first_chapter"
    assert before["reputation"]["flair"]["key"] == "first_chapter"

    if correction == "literacy":
        member.literacy_completed = False
        member.save(update_fields=["literacy_completed"])
    else:
        VerificationCase.objects.create(
            member=member,
            kind="identity",
            status="rejected" if correction == "rejected" else "approved",
            expires_at=timezone.now() - timedelta(seconds=1) if correction == "expired" else None,
            notes="Private synthetic review detail",
        )
    after = public_profile(handle=member.username)
    assert after["badges"] == []
    assert after["reputation"]["flair"] is None
    assert "Private synthetic review detail" not in str(after)
    assert "rejected" not in str(after)
    assert "expires_at" not in str(after)
    award.refresh_from_db()
    assert award.eligible  # No worker or history mutation was needed to hide the claim.


def test_hidden_points_are_not_exposed_publicly_or_in_leaderboard_but_own_account_sees_them(
    members,
):
    member = members[1]
    member.literacy_completed = True
    member.save(update_fields=["literacy_completed"])
    contributions(member, 3)
    opt_in(member, visible=False)
    public = public_profile(handle=member.username)["reputation"]
    assert public["points"] == 0
    assert public["show_points"] is False
    assert public["level"] == "Contributor"
    client = client_for(member)
    assert client.get("/api/v1/community/reputation").json()["reputation"]["points"] == 250
    own_session = client.get("/api/v1/auth/session").json()["member"]["community_reputation"]
    assert own_session["points"] == 250 and own_session["show_points"] is False
    assert APIClient().get("/api/v1/community/leaderboard").json()["entries"] == []


def test_leaderboard_is_explicit_opt_in_excludes_inactive_and_suspended_and_exposes_no_private_data(
    members,
):
    from accounts.models import Member

    for member in members:
        contributions(member, 1)
    opt_in(members[0])
    opt_in(members[1])
    members[1].suspended = True
    members[1].save(update_fields=["suspended"])
    inactive = Member.objects.create_user(
        username="inactive", email="inactive@example.test", is_active=False
    )
    opt_in(inactive)
    data = APIClient().get("/api/v1/community/leaderboard").json()
    assert len(data["entries"]) == 1
    assert data["entries"][0]["handle"] == members[0].username
    assert set(data["entries"][0]) == {
        "rank",
        "handle",
        "display_name",
        "avatar_key",
        "photo_url",
        "reputation",
    }
    assert data["rules"] == REPUTATION_RULES
    assert "Dense ranks" in data["notice"]
    assert all(member.email not in str(data) for member in members)
    assert "staff_role" not in str(data)
    assert "evidence" not in str(data)


def test_leaderboard_dense_ties_and_signed_pagination_are_deterministic(members):
    for member in members:
        opt_in(member)
    contributions(members[0], 2)
    contributions(members[1], 2)
    contributions(members[2], 1)
    expected_ties = sorted(members[:2], key=lambda member: str(member.id))
    client = APIClient()
    first = client.get("/api/v1/community/leaderboard", {"limit": 1}).json()
    second = client.get(
        "/api/v1/community/leaderboard", {"limit": 1, "cursor": first["next_cursor"]}
    ).json()
    third = client.get(
        "/api/v1/community/leaderboard", {"limit": 1, "cursor": second["next_cursor"]}
    ).json()
    assert first["entries"][0]["handle"] == expected_ties[0].username
    assert second["entries"][0]["handle"] == expected_ties[1].username
    assert [
        first["entries"][0]["rank"],
        second["entries"][0]["rank"],
        third["entries"][0]["rank"],
    ] == [1, 1, 2]
    assert third["next_cursor"] is None
    assert (
        client.get("/api/v1/community/leaderboard", {"limit": 1}).json()["entries"]
        == first["entries"]
    )
    tampered = first["next_cursor"] + "tampered"
    assert (
        client.get("/api/v1/community/leaderboard", {"limit": 1, "cursor": tampered}).status_code
        == 400
    )
    assert (
        client.get(
            "/api/v1/community/leaderboard", {"limit": 2, "cursor": first["next_cursor"]}
        ).status_code
        == 400
    )


def test_leaderboard_requires_restart_if_points_or_participants_change_between_pages(members):
    for member in members:
        opt_in(member)
    client = APIClient()
    first = client.get("/api/v1/community/leaderboard", {"limit": 1}).json()
    contributions(members[2], 1)
    changed = client.get(
        "/api/v1/community/leaderboard", {"limit": 1, "cursor": first["next_cursor"]}
    )
    assert changed.status_code == 409
    assert changed.json()["code"] == "leaderboard_changed"


@pytest.mark.parametrize("limit", ["0", "51", "abc", "-1", "1.5"])
def test_leaderboard_limit_is_bounded(members, limit):
    assert APIClient().get("/api/v1/community/leaderboard", {"limit": limit}).status_code == 400


def test_public_flair_selection_does_not_change_three_badge_shelf_limit(members):
    member = members[1]
    contributions(member, 10)
    evaluate_awards(member_id=member.id)
    awards = list(Award.objects.filter(member=member))
    assert len(awards) == 4
    response = client_for(member).patch(
        "/api/v1/community/profile",
        {
            "public_award_ids": [str(award.id) for award in awards],
            "avatar_flair_id": str(awards[0].id),
        },
        format="json",
    )
    assert response.status_code == 400
    assert not ProfileSettings.objects.filter(member=member).exists()
