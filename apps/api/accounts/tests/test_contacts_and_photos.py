import io
import uuid

import pytest
from accounts.models import Member
from accounts.services import normalize_phone, register_member
from config.errors import DomainError
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image
from rest_framework.test import APIClient
from verification.models import VerificationCase

pytestmark = pytest.mark.django_db


@pytest.fixture
def member():
    return Member.objects.create_user(
        username="profile-person",
        email="profile@example.test",
        password="strong-pass-1234",
        display_name="Profile Person",
    )


@pytest.fixture
def client(member):
    api = APIClient()
    api.force_authenticate(member)
    return api


def upload_image(*, size=(256, 256), format="PNG", metadata=False, animated=False):
    data = io.BytesIO()
    image = Image.new("RGB", size, "cornflowerblue")
    options = {}
    if metadata:
        exif = Image.Exif()
        exif[0x010E] = "private-owner-metadata"
        options.update(exif=exif, icc_profile=b"private-icc-profile")
    if animated:
        options.update(
            save_all=True, append_images=[Image.new("RGB", size, "red")], duration=100, loop=0
        )
    image.save(data, format=format, **options)
    return SimpleUploadedFile(
        "profile-image", data.getvalue(), content_type=f"image/{format.lower()}"
    )


@pytest.mark.parametrize("raw", ["0917 123 4567", "+63 (917) 123-4567", "639171234567"])
def test_philippine_mobile_normalizes_to_e164(raw):
    assert normalize_phone(raw) == "+639171234567"


@pytest.mark.parametrize(
    "raw",
    [
        "",
        None,
        9171234567,
        "+12025550123",
        "021234567",
        "+63917123456",
        "091712345678",
        "0917PRIVATE",
        "+639١٧١٢٣٤٥٦٧",
    ],
)
def test_mobile_rejects_invalid_foreign_or_nontext_values(raw):
    with pytest.raises(DomainError):
        normalize_phone(raw)


def test_registration_phone_is_private_and_existing_service_callers_remain_supported():
    member = register_member(
        email="phone-registration@example.test",
        password="strong-pass-1234",
        accepted_policy_version="demo-v1",
        phone="0917 123 4567",
    )
    assert member.mobile_number == "+639171234567"
    public = APIClient().get(f"/api/v1/community/profiles/{member.username}").json()
    assert member.email not in str(public)
    assert member.mobile_number not in str(public)
    assert "setup_completeness" not in public
    assert (
        register_member(
            email="legacy-registration@example.test",
            password="strong-pass-1234",
            accepted_policy_version="demo-v1",
        ).mobile_number
        == ""
    )


def test_contact_changes_are_owned_normalized_and_invalidate_previous_evidence(client, member):
    VerificationCase.objects.create(member=member, kind="contact", status="approved")
    assert client.get("/api/v1/auth/contacts").json()["verification"]["current"]
    response = client.patch(
        "/api/v1/auth/contacts",
        {"email": " NEW@example.test ", "mobile_number": "0917-123-4567"},
        format="json",
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "new@example.test"
    assert data["mobile_number"] == "+639171234567"
    assert not data["email_verified"] and not data["mobile_verified"]
    assert not data["delivery_available"]
    assert data["verification"]["status"] == "needs_information"
    assert data["verification"]["current"] is False
    count = VerificationCase.objects.filter(member=member, kind="contact").count()
    assert count == 2
    client.patch("/api/v1/auth/contacts", {"email": "new@example.test"}, format="json")
    assert VerificationCase.objects.filter(member=member, kind="contact").count() == count
    member.refresh_from_db()
    assert member.email == "new@example.test"


def test_contact_rejects_targeting_other_member_and_duplicate_email_without_partial_changes(
    client, member
):
    other = Member.objects.create_user(username="other-contact", email="other@example.test")
    assert (
        client.patch(
            "/api/v1/auth/contacts",
            {"member_id": str(other.id), "mobile_number": "09171234567"},
            format="json",
        ).status_code
        == 400
    )
    assert (
        client.patch(
            "/api/v1/auth/contacts",
            {"email": other.email, "mobile_number": "09171234567"},
            format="json",
        ).status_code
        == 409
    )
    member.refresh_from_db()
    assert member.mobile_number == ""
    assert member.email == "profile@example.test"
    assert APIClient().get("/api/v1/auth/contacts").status_code == 403


def test_photo_is_reencoded_strips_metadata_and_only_current_url_is_served(client, member):
    response = client.post(
        "/api/v1/auth/profile/photo",
        {"photo": upload_image(format="JPEG", metadata=True)},
        format="multipart",
    )
    assert response.status_code == 201
    data = response.json()
    assert data["photo_mode"] == "photo" and data["has_photo"]
    url = data["photo_url"]
    assert url.startswith("/api/v1/community/photos/")
    assert data["stored_photo_url"] == url
    content = APIClient().get(url)
    assert content.status_code == 200
    assert content["Content-Type"] == "image/jpeg"
    assert content["X-Content-Type-Options"] == "nosniff"
    assert "no-store" in content["Cache-Control"]
    assert b"private-owner-metadata" not in content.content
    assert b"private-icc-profile" not in content.content
    with Image.open(io.BytesIO(content.content)) as safe:
        assert not safe.getexif()
        assert "icc_profile" not in safe.info
    public = APIClient().get(f"/api/v1/community/profiles/{member.username}").json()
    assert public["photo_url"] == url
    assert "stored_photo_url" not in public
    replaced = client.post(
        "/api/v1/auth/profile/photo", {"photo": upload_image()}, format="multipart"
    )
    assert replaced.status_code == 201
    assert replaced.json()["photo_url"] != url
    assert APIClient().get(url).status_code == 404


def test_avatar_mode_retains_private_owner_preview_and_delete_removes_all_bytes(client, member):
    url = client.post(
        "/api/v1/auth/profile/photo", {"photo": upload_image()}, format="multipart"
    ).json()["photo_url"]
    changed = client.patch("/api/v1/auth/profile", {"avatar_key": "keeper"}, format="json")
    assert changed.status_code == 200
    assert changed.json()["photo_mode"] == "avatar"
    assert changed.json()["photo_url"] is None
    assert changed.json()["stored_photo_url"] == url
    assert APIClient().get(url).status_code == 404
    assert client.get(url).status_code == 200
    other = APIClient()
    other.force_authenticate(
        Member.objects.create_user(username="other-photo", email="other-photo@example.test")
    )
    assert other.get(url).status_code == 404
    assert (
        client.patch("/api/v1/community/profile", {"photo_mode": "photo"}, format="json").json()[
            "photo_url"
        ]
        == url
    )
    deleted = client.delete("/api/v1/auth/profile/photo")
    assert deleted.status_code == 200
    assert deleted.json()["photo_url"] is None
    assert deleted.json()["stored_photo_url"] is None
    assert not deleted.json()["has_photo"]
    member.refresh_from_db()
    assert not member.profile_photo and member.profile_photo_id is None
    assert client.get(url).status_code == 404
    assert (
        client.patch("/api/v1/auth/profile", {"photo_mode": "photo"}, format="json").status_code
        == 400
    )


@pytest.mark.parametrize(
    "image",
    [
        lambda: upload_image(size=(127, 128)),
        lambda: upload_image(size=(4097, 128)),
        lambda: upload_image(animated=True),
        lambda: SimpleUploadedFile(
            "fake.svg", b'<svg xmlns="http://www.w3.org/2000/svg"/>', content_type="image/svg+xml"
        ),
        lambda: SimpleUploadedFile(
            "huge.png", b"X" * (3 * 1024 * 1024 + 1), content_type="image/png"
        ),
    ],
)
def test_unsafe_photos_are_rejected_without_mutating_profile(client, member, image):
    response = client.post("/api/v1/auth/profile/photo", {"photo": image()}, format="multipart")
    assert response.status_code == 400
    assert response.json()["code"] == "INVALID_PHOTO"
    member.refresh_from_db()
    assert member.profile_photo_id is None and not member.profile_photo


def test_photo_upload_and_removal_require_ownership_and_active_visibility(client, member):
    assert (
        APIClient()
        .post("/api/v1/auth/profile/photo", {"photo": upload_image()}, format="multipart")
        .status_code
        == 403
    )
    assert APIClient().delete("/api/v1/auth/profile/photo").status_code == 403
    assert (
        client.post(
            "/api/v1/auth/profile/photo",
            {"photo": upload_image(), "member_id": str(uuid.uuid4())},
            format="multipart",
        ).status_code
        == 400
    )
    url = client.post(
        "/api/v1/auth/profile/photo", {"photo": upload_image()}, format="multipart"
    ).json()["photo_url"]
    member.suspended = True
    member.save(update_fields=["suspended"])
    assert APIClient().get(url).status_code == 404


def test_own_setup_progress_is_private_and_does_not_create_points(client, member):
    own = client.get("/api/v1/community/profile").json()
    assert own["setup_completeness"]["total"] == 8
    assert own["setup_completeness"]["completed"] < own["setup_completeness"]["total"]
    assert own["reputation"]["points"] == 0
    contact_steps = [
        step for step in own["setup_completeness"]["steps"] if step["key"] in {"email", "mobile"}
    ]
    assert {step["href"] for step in contact_steps} == {"/profile/contacts"}
    public = APIClient().get(f"/api/v1/community/profiles/{member.username}").json()
    assert "setup_completeness" not in public
    assert "has_photo" not in public
    assert "mobile_number" not in public
