import uuid
from datetime import timedelta

import pytest
from config.errors import DomainError
from django.utils import timezone
from marketplace.applications import apply_to_offer
from marketplace.models import LoanApplication
from marketplace.serializers import application_data
from rest_framework.test import APIClient
from verification.models import VerificationCase

from connections.models import CoBorrowerInvitation
from connections.services import claim_for, create_invitation, decide_invitation, invitation_data

pytestmark = pytest.mark.django_db


def invitation(members, **overrides):
    return create_invitation(
        actor_id=members[1].id,
        data={
            "display_name": "Other Person",
            "email": members[2].email,
            "mobile_number": "09170000001",
            "facebook_url": "https://facebook.com/fictional.person",
            "relationship": "friend",
            "permission_confirmed": True,
            "operation_id": str(uuid.uuid4()),
            **overrides,
        },
    )


def verified(member):
    member.mobile_number = "+639170000002"
    member.save(update_fields=["mobile_number"])
    for kind in ("identity", "contact"):
        VerificationCase.objects.create(
            member=member,
            kind=kind,
            status="approved",
            expires_at=timezone.now() + timedelta(days=10),
        )


def accepted(members):
    row = invitation(members)
    verified(members[2])
    return decide_invitation(
        actor_id=members[2].id,
        invitation_id=row.id,
        data={
            "decision": "accept",
            "expected_version": 1,
            "consent": True,
            "facebook_url": "https://facebook.com/own.fictional.profile",
        },
    )


def test_pending_invitation_is_private_idempotent_and_does_not_contact_anyone(members):
    operation = str(uuid.uuid4())
    row = invitation(members, operation_id=operation)
    assert invitation(members, operation_id=operation).id == row.id
    owner = invitation_data(row, actor=members[1])
    assert owner["status"] == "pending" and owner["ready_for_application"] is False
    assert owner["mobile_number"] == "+639170000001"
    token = owner["invitation_path"].rsplit("/", 1)[1]
    _, claimed = claim_for(actor_id=members[2].id, token=token)
    assert claimed.id == row.id
    with pytest.raises(DomainError) as exc:
        claim_for(actor_id=members[0].id, token=token)
    assert exc.value.status_code == 404
    with pytest.raises(DomainError):
        invitation_data(row, actor=members[0])


@pytest.mark.parametrize(
    "changes",
    [
        {"permission_confirmed": False},
        {"facebook_url": "https://facebook.com.evil.test/person"},
        {"facebook_url": "https://facebook.com/person?tracking=1"},
        {"mobile_number": "123"},
        {"email": "not-an-email"},
        {"relationship": "credit_guarantee"},
    ],
)
def test_invitation_validates_permission_contacts_and_social_url(members, changes):
    with pytest.raises(DomainError):
        invitation(members, **changes)
    assert CoBorrowerInvitation.objects.count() == 0


def test_acceptance_requires_identity_contact_phone_and_explicit_consent(members):
    row = invitation(members)
    payload = {"decision": "accept", "expected_version": 1, "consent": True}
    with pytest.raises(DomainError) as exc:
        decide_invitation(actor_id=members[2].id, invitation_id=row.id, data=payload)
    assert exc.value.detail["code"] == "verification_required"
    verified(members[2])
    with pytest.raises(DomainError):
        decide_invitation(
            actor_id=members[2].id, invitation_id=row.id, data={**payload, "consent": False}
        )
    result = decide_invitation(actor_id=members[2].id, invitation_id=row.id, data=payload)
    assert result.mobile_number == members[2].mobile_number
    assert result.facebook_url == ""  # Inviter-supplied URL is never silently consented.
    assert result.consented_at and result.version == 2
    assert invitation_data(result, actor=members[1])["ready_for_application"] is True


def test_expired_declined_and_revoked_contacts_cannot_be_linked(members, offer):
    row = accepted(members)
    members[2].suspended = True
    members[2].save(update_fields=["suspended"])
    result = decide_invitation(
        actor_id=members[2].id,
        invitation_id=row.id,
        data={"decision": "revoke", "expected_version": row.version},
    )
    assert result.status == "revoked" and not result.mobile_number and not result.facebook_url
    with pytest.raises(DomainError):
        apply_to_offer(
            borrower_id=members[1].id,
            offer_id=offer.id,
            principal=100000,
            operation_id=uuid.uuid4(),
            co_borrower_invitation_id=row.id,
        )
    assert LoanApplication.objects.count() == 0


def test_new_check_and_wrong_owner_block_association_and_rollback_application(members, offer):
    row = accepted(members)
    VerificationCase.objects.create(
        member=members[2], kind="contact", status="needs_information", reason="private correction"
    )
    assert invitation_data(row, actor=members[1])["ready_for_application"] is False
    with pytest.raises(DomainError):
        apply_to_offer(
            borrower_id=members[1].id,
            offer_id=offer.id,
            principal=100000,
            operation_id=uuid.uuid4(),
            co_borrower_invitation_id=row.id,
        )
    assert LoanApplication.objects.count() == 0


def test_association_is_idempotent_and_shares_no_contact_or_loan_access(members, offer):
    row = accepted(members)
    operation = uuid.uuid4()
    application = apply_to_offer(
        borrower_id=members[1].id,
        offer_id=offer.id,
        principal=100000,
        operation_id=operation,
        co_borrower_invitation_id=row.id,
    )
    again = apply_to_offer(
        borrower_id=members[1].id,
        offer_id=offer.id,
        principal=100000,
        operation_id=operation,
        co_borrower_invitation_id=row.id,
    )
    assert again.id == application.id
    companion = application_data(application)["co_borrower"]
    assert companion["status"] == "consented" and companion["joint_liability"] is False
    assert companion["member"]["display_name"] == members[2].display_name
    assert (
        "email" not in str(companion)
        and "facebook" not in str(companion)
        and "mobile" not in str(companion)
    )
    client = APIClient()
    client.force_authenticate(members[2])
    assert client.get(f"/api/v1/applications/{application.id}").status_code == 404
    assert (
        client.get("/api/v1/connections/co-borrowers").data["invitations"][0]["direction"]
        == "incoming"
    )
    client.force_authenticate(members[0])
    assert client.get("/api/v1/connections/co-borrowers").data["invitations"] == []


def test_expiry_and_version_conflicts_do_not_change_consent(members):
    row = invitation(members)
    CoBorrowerInvitation.objects.filter(pk=row.id).update(
        expires_at=timezone.now() - timedelta(seconds=1)
    )
    with pytest.raises(DomainError) as exc:
        decide_invitation(
            actor_id=members[2].id,
            invitation_id=row.id,
            data={"decision": "accept", "expected_version": 1, "consent": True},
        )
    assert exc.value.status_code == 410
    with pytest.raises(DomainError) as exc:
        decide_invitation(
            actor_id=members[1].id,
            invitation_id=row.id,
            data={"decision": "revoke", "expected_version": 9},
        )
    assert exc.value.status_code == 409


@pytest.mark.django_db(transaction=True)
def test_applying_with_companion_and_companion_liking_same_offer_do_not_deadlock(
    members, offer, monkeypatch
):
    from concurrent.futures import ThreadPoolExecutor
    from threading import Event

    from django.db import close_old_connections
    from engagement import services as social

    from connections import services as connections

    row = accepted(members)
    application_has_offer = Event()
    reaction_wants_offer = Event()
    original_attach, original_offer = connections.attach_to_application, social.offer_for

    def waiting_attach(**kwargs):
        application_has_offer.set()
        assert reaction_wants_offer.wait(5)
        return original_attach(**kwargs)

    def waiting_offer(offer_id, actor_id=None, **kwargs):
        if actor_id == members[2].id and kwargs.get("lock"):
            reaction_wants_offer.set()
        return original_offer(offer_id, actor_id, **kwargs)

    monkeypatch.setattr(connections, "attach_to_application", waiting_attach)
    monkeypatch.setattr(social, "offer_for", waiting_offer)

    def apply():
        close_old_connections()
        try:
            return apply_to_offer(
                borrower_id=members[1].id,
                offer_id=offer.id,
                principal=100000,
                operation_id=uuid.uuid4(),
                co_borrower_invitation_id=row.id,
            ).id
        finally:
            close_old_connections()

    def react():
        close_old_connections()
        try:
            assert application_has_offer.wait(5)
            return social.set_like(actor_id=members[2].id, offer_id=offer.id, liked=True)
        finally:
            close_old_connections()

    with ThreadPoolExecutor(max_workers=2) as pool:
        first, second = pool.submit(apply), pool.submit(react)
        assert first.result(timeout=10)
        assert second.result(timeout=10)["liked"] is True


@pytest.mark.parametrize("surface", ["list", "claim", "revoke"])
def test_reused_email_never_grants_access_to_an_invitation_already_bound_to_another_member(
    members, surface
):
    from accounts.models import Member

    row = invitation(members)
    token = invitation_data(row, actor=members[1])["invitation_path"].rsplit("/", 1)[1]
    verified(members[2])
    row = decide_invitation(
        actor_id=members[2].id,
        invitation_id=row.id,
        data={
            "decision": "accept",
            "expected_version": row.version,
            "consent": True,
            "facebook_url": "https://facebook.com/consented.private.profile",
        },
    )
    original_email = members[2].email
    owner = APIClient()
    owner.force_authenticate(members[2])
    changed = owner.patch(
        "/api/v1/auth/contacts", {"email": "changed-invitee@example.test"}, format="json"
    )
    assert changed.status_code == 200
    replacement = Member.objects.create_user(username="reused-contact-email", email=original_email)
    stranger = APIClient()
    stranger.force_authenticate(replacement)
    if surface == "list":
        response = stranger.get("/api/v1/connections/co-borrowers")
        assert response.status_code == 200
        assert response.json()["invitations"] == []
    elif surface == "claim":
        response = stranger.get(f"/api/v1/connections/co-borrowers/invite/{token}")
        assert response.status_code == 404
    else:
        response = stranger.post(
            f"/api/v1/connections/co-borrowers/{row.id}/action",
            {"decision": "revoke", "expected_version": row.version},
            format="json",
        )
        assert response.status_code == 404
        row.refresh_from_db()
        assert row.status == "accepted"
