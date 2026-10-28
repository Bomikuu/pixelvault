import uuid

import pytest
from accounts.models import AVATAR_KEYS, Member
from accounts.services import register_member
from rest_framework.test import APIClient

pytestmark = pytest.mark.django_db


@pytest.fixture
def member():
    return Member.objects.create_user(
        username="avatar-member",
        email="avatar@example.test",
        password="strong-pass-1234",
        bio="Original biography",
    )


@pytest.fixture
def client(member):
    api = APIClient()
    api.force_authenticate(member)
    return api


@pytest.mark.parametrize("avatar_key", sorted(AVATAR_KEYS))
def test_preset_selection_persists_and_is_public(client, member, avatar_key):
    response = client.patch("/api/v1/auth/profile", {"avatar_key": avatar_key}, format="json")
    assert response.status_code == 200
    assert response.json()["avatar_key"] == avatar_key
    member.refresh_from_db()
    assert member.avatar_key == avatar_key
    assert client.get("/api/v1/auth/session").json()["member"]["avatar_key"] == avatar_key

    public = APIClient().get(f"/api/v1/community/profiles/{member.username}")
    assert public.status_code == 200
    assert public.json()["avatar_key"] == avatar_key
    assert member.email not in str(public.json())


@pytest.mark.parametrize(
    "avatar_key",
    ["", "unlisted", "https://example.test/avatar.svg", "<svg />", None, [], {}, True, 1],
)
def test_invalid_avatar_cannot_mutate_other_profile_fields(client, member, avatar_key):
    response = client.patch(
        "/api/v1/auth/profile",
        {"avatar_key": avatar_key, "bio": "Must not be saved"},
        format="json",
    )
    assert response.status_code == 400
    member.refresh_from_db()
    assert member.avatar_key == "sprout"
    assert member.bio == "Original biography"


def test_avatar_is_present_after_real_sign_in(member):
    member.avatar_key = "keeper"
    member.save(update_fields=["avatar_key"])
    client = APIClient()
    response = client.post(
        "/api/v1/auth/sign-in",
        {"email": member.email, "password": "strong-pass-1234"},
        format="json",
    )
    assert response.status_code == 200
    assert response.json()["member"]["avatar_key"] == "keeper"
    assert client.get("/api/v1/auth/session").json()["member"]["avatar_key"] == "keeper"


def test_registration_defaults_to_sprout():
    member = register_member(
        email="new-avatar@example.test",
        password="strong-pass-1234",
        accepted_policy_version="demo-v1",
    )
    assert member.avatar_key == "sprout"


def test_profile_route_cannot_target_another_member(client, member):
    other = Member.objects.create_user(username="other-avatar", email="other@example.test")
    rejected = client.patch(
        "/api/v1/auth/profile",
        {"member_id": str(other.id), "avatar_key": "explorer"},
        format="json",
    )
    assert rejected.status_code == 400
    other.refresh_from_db()
    assert other.avatar_key == "sprout"
    response = client.patch("/api/v1/auth/profile", {"avatar_key": "navigator"}, format="json")
    assert response.status_code == 200
    member.refresh_from_db()
    other.refresh_from_db()
    assert member.avatar_key == "navigator"
    assert other.avatar_key == "sprout"


def test_avatar_changes_require_authentication():
    assert (
        APIClient()
        .patch("/api/v1/auth/profile", {"avatar_key": "reader"}, format="json")
        .status_code
        == 403
    )


def test_community_profile_route_uses_same_avatar_validation(client, member):
    response = client.patch("/api/v1/community/profile", {"avatar_key": "reader"}, format="json")
    assert response.status_code == 200
    member.refresh_from_db()
    assert member.avatar_key == "reader"
    rejected = client.patch(
        "/api/v1/community/profile",
        {"avatar_key": "https://example.test/avatar.png", "bio": "Must not be saved"},
        format="json",
    )
    assert rejected.status_code == 400
    member.refresh_from_db()
    assert member.avatar_key == "reader"
    assert member.bio == "Original biography"


def test_public_achievement_catalog_has_no_member_state(client, member):
    from community.profiles import BADGES

    public_response = APIClient().get("/api/v1/community/achievement-catalog")
    assert public_response.status_code == 200
    public = public_response.json()
    assert set(public) == {"catalog"}
    assert {entry["key"] for entry in public["catalog"]} == set(BADGES)
    for entry in public["catalog"]:
        assert set(entry) == {"key", "name", "criteria", "private"}
        assert entry["private"] is (entry["key"] == "fresh_start")
    assert str(member.id) not in str(public)
    assert member.email not in str(public)
    own = client.get("/api/v1/community/awards")
    assert own.status_code == 200
    assert own.json()["catalog"] == public["catalog"]


def test_thread_avatar_is_a_preset_without_private_identity(client, member):
    from community.models import Thread

    other = Member.objects.create_user(
        username="private-avatar@example.test",
        email="private-avatar@example.test",
        avatar_key="connector",
    )
    thread = Thread.objects.create(application_id=uuid.uuid4())
    thread.participants.set([member, other])
    response = client.get("/api/v1/community/threads")
    assert response.status_code == 200
    row = response.json()["threads"][0]
    assert row["other_avatar_key"] == "connector"
    assert row["other_handle"] == str(other.id)
    assert other.email not in str(row)
