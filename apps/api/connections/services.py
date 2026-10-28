import uuid
from datetime import timedelta
from urllib.parse import urlsplit, urlunsplit

from accounts.models import Member
from accounts.services import normalize_phone
from community.profiles import public_identity
from config.errors import DomainError
from django.core import signing
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.db import transaction
from django.db.models import F
from django.shortcuts import get_object_or_404
from django.utils import timezone
from marketplace.offers import fingerprint
from verification.models import VerificationCase

from .models import ApplicationCoBorrower, CoBorrowerInvitation

SALT = "pixelvault.co-borrower-invitation.v1"
NOTICE = (
    "This invitation records permission to share contact details with the inviting member. "
    "A linked application shows your name and consent status only. It does not make you "
    "liable for repayment or grant access to loans or documents."
)


def actor_for(actor_id, *, new_activity=False):
    actor = get_object_or_404(Member, pk=actor_id, is_active=True)
    if new_activity and actor.suspended:
        raise DomainError(
            "activity_restricted", "New invitations are unavailable for this account.", 403
        )
    return actor


def facebook_url(value):
    if value in (None, ""):
        return ""
    if not isinstance(value, str) or len(value) > 250:
        raise DomainError("invalid_facebook", "Use a Facebook profile URL, or leave it empty.")
    try:
        parsed = urlsplit(value.strip())
        valid = (
            parsed.scheme == "https"
            and parsed.hostname in {"facebook.com", "www.facebook.com", "m.facebook.com"}
            and not parsed.username
            and not parsed.password
            and parsed.port is None
            and parsed.path not in {"", "/"}
            and not parsed.query
            and not parsed.fragment
        )
    except ValueError:
        valid = False
    if not valid:
        raise DomainError(
            "invalid_facebook",
            "Use an https://facebook.com/profile-name URL without tracking parameters.",
        )
    return urlunsplit(("https", "www.facebook.com", parsed.path.rstrip("/"), "", ""))


def current_checks(member):
    if not member or not member.is_active or member.suspended or not member.mobile_number:
        return False
    now = timezone.now()
    for kind in ("identity", "contact"):
        check = (
            VerificationCase.objects.filter(member=member, kind=kind)
            .order_by("-created_at", "-id")
            .first()
        )
        if (
            not check
            or check.status != "approved"
            or (check.expires_at and check.expires_at <= now)
        ):
            return False
    return True


def invitation_data(invitation, *, actor):
    owner = invitation.inviter_id == actor.id
    incoming = invitation.invitee_id == actor.id or (
        invitation.invitee_id is None
        and invitation.status == "pending"
        and invitation.email.casefold() == actor.email.casefold()
    )
    if not owner and not incoming:
        raise DomainError("not_found", "Invitation not found.", 404)
    expired = invitation.status == "pending" and invitation.expires_at <= timezone.now()
    status = "expired" if expired else invitation.status
    ready = status == "accepted" and current_checks(invitation.invitee)
    result = {
        "id": str(invitation.id),
        "display_name": invitation.display_name,
        "email": invitation.email,
        "mobile_number": invitation.mobile_number
        if owner or invitation.invitee_id == actor.id
        else "",
        "facebook_url": invitation.facebook_url
        if owner or invitation.invitee_id == actor.id
        else "",
        "relationship": invitation.relationship,
        "status": status,
        "version": invitation.version,
        "direction": "outgoing" if owner else "incoming",
        "inviter": public_identity(invitation.inviter),
        "member": public_identity(invitation.invitee) if invitation.invitee_id else None,
        "ready_for_application": ready,
        "consented_at": invitation.consented_at,
        "expires_at": invitation.expires_at,
        "notice": NOTICE,
    }
    if owner and status == "pending":
        token = signing.dumps({"id": str(invitation.id)}, salt=SALT)
        result["invitation_path"] = f"/co-borrowers/invite/{token}"
    return result


@transaction.atomic
def create_invitation(*, actor_id, data):
    actor = actor_for(actor_id, new_activity=True)
    Member.objects.select_for_update().get(pk=actor.id)
    allowed = {
        "display_name",
        "email",
        "mobile_number",
        "facebook_url",
        "relationship",
        "permission_confirmed",
        "operation_id",
    }
    if set(data) - allowed or data.get("permission_confirmed") is not True:
        raise DomainError(
            "permission_required",
            "Confirm that this person agreed to receive a private invitation.",
        )
    name, email = data.get("display_name"), data.get("email")
    if (
        not isinstance(name, str)
        or not name.strip()
        or len(name) > 100
        or any(ord(c) < 32 for c in name)
    ):
        raise DomainError("invalid_name", "Enter the invited person’s name, up to 100 characters.")
    if not isinstance(email, str):
        raise DomainError("invalid_email", "Enter the invited person’s email.")
    email = email.strip().lower()
    try:
        validate_email(email)
        operation = uuid.UUID(str(data.get("operation_id")))
    except (ValidationError, ValueError, TypeError):
        raise DomainError(
            "invalid_invitation", "Enter a valid email and request identifier."
        ) from None
    if email.casefold() == actor.email.casefold():
        raise DomainError("self_invitation", "Choose another person for the invitation.")
    mobile = normalize_phone(data["mobile_number"]) if data.get("mobile_number") else ""
    facebook = facebook_url(data.get("facebook_url"))
    relationship = data.get("relationship", "other")
    if relationship not in {"family", "friend", "colleague", "other"}:
        raise DomainError("invalid_relationship", "Choose one of the available relationships.")
    digest = fingerprint(
        {
            "actor": str(actor.id),
            "name": name.strip(),
            "email": email,
            "mobile": mobile,
            "facebook": facebook,
            "relationship": relationship,
        }
    )
    existing = CoBorrowerInvitation.objects.filter(operation_id=operation).first()
    if existing:
        if existing.inviter_id != actor.id or existing.payload_hash != digest:
            raise DomainError(
                "operation_conflict", "This request identifier has different details.", 409
            )
        return existing
    CoBorrowerInvitation.objects.filter(
        inviter=actor, email=email, status="pending", expires_at__lte=timezone.now()
    ).update(status="expired", mobile_number="", facebook_url="", version=F("version") + 1)
    if CoBorrowerInvitation.objects.filter(
        inviter=actor, email=email, status__in=["pending", "accepted"]
    ).exists():
        raise DomainError(
            "active_invitation", "An invitation or connection with this person already exists.", 409
        )
    return CoBorrowerInvitation.objects.create(
        inviter=actor,
        display_name=name.strip(),
        email=email,
        mobile_number=mobile,
        facebook_url=facebook,
        relationship=relationship,
        operation_id=operation,
        payload_hash=digest,
        expires_at=timezone.now() + timedelta(days=7),
    )


def claim_for(*, actor_id, token):
    actor = actor_for(actor_id)
    try:
        payload = signing.loads(token, salt=SALT, max_age=7 * 24 * 3600)
        invitation_id = uuid.UUID(payload["id"])
    except (signing.BadSignature, ValueError, TypeError, KeyError):
        raise DomainError(
            "not_found", "This invitation is unavailable. Ask the inviter for a current link.", 404
        ) from None
    invitation = get_object_or_404(
        CoBorrowerInvitation.objects.select_related("inviter", "invitee"), pk=invitation_id
    )
    recipient = (
        invitation.invitee_id == actor.id
        if invitation.invitee_id
        else (
            invitation.status == "pending" and invitation.email.casefold() == actor.email.casefold()
        )
    )
    if not recipient or invitation.inviter_id == actor.id:
        raise DomainError("not_found", "This invitation is unavailable for this account.", 404)
    if invitation.status == "pending" and invitation.expires_at <= timezone.now():
        raise DomainError("invitation_expired", "This invitation expired. Ask for a new one.", 410)
    return actor, invitation


@transaction.atomic
def decide_invitation(*, actor_id, invitation_id, data):
    actor = actor_for(actor_id)
    invitation = get_object_or_404(
        CoBorrowerInvitation.objects.select_for_update(of=("self",)).select_related(
            "inviter", "invitee"
        ),
        pk=invitation_id,
    )
    owner = invitation.inviter_id == actor.id
    recipient = (
        invitation.invitee_id == actor.id
        if invitation.invitee_id
        else (
            invitation.status == "pending" and invitation.email.casefold() == actor.email.casefold()
        )
    ) and not owner
    if not owner and not recipient:
        raise DomainError("not_found", "Invitation not found.", 404)
    if (
        type(data.get("expected_version")) is not int
        or invitation.version != data["expected_version"]
    ):
        raise DomainError(
            "stale_invitation", "The invitation changed. Refresh before deciding.", 409
        )
    decision = data.get("decision")
    if decision == "accept" and recipient and invitation.status == "pending":
        if invitation.expires_at <= timezone.now():
            raise DomainError(
                "invitation_expired", "This invitation expired. Ask for a new one.", 410
            )
        if data.get("consent") is not True:
            raise DomainError(
                "consent_required", "Read and accept the contact-sharing notice first."
            )
        # Contact changes lock this same member; a current approval must still
        # apply when the invitation is accepted.
        actor = Member.objects.select_for_update().get(pk=actor.id)
        if not current_checks(actor):
            raise DomainError(
                "verification_required",
                "Complete your current identity and contact checks and add your mobile number before accepting.",
                409,
            )
        invitation.invitee = actor
        invitation.display_name = actor.display_name or actor.username
        invitation.mobile_number = actor.mobile_number
        invitation.facebook_url = facebook_url(data.get("facebook_url"))
        invitation.status, invitation.consented_at = "accepted", timezone.now()
    elif decision == "decline" and recipient and invitation.status == "pending":
        invitation.status = "declined"
    elif decision == "revoke" and invitation.status in {"pending", "accepted"}:
        invitation.status = "cancelled" if owner else "revoked"
    else:
        raise DomainError(
            "decision_unavailable", "This decision is unavailable for this invitation.", 409
        )
    if invitation.status != "accepted":
        invitation.mobile_number = invitation.facebook_url = ""
    invitation.version += 1
    invitation.save()
    return invitation


def attach_to_application(*, application, invitation_id):
    invitation = get_object_or_404(
        CoBorrowerInvitation.objects.select_for_update(of=("self",)).select_related("invitee"),
        pk=invitation_id,
        inviter_id=application.borrower_id,
    )
    if invitation.status != "accepted" or not current_checks(invitation.invitee):
        raise DomainError(
            "co_borrower_unavailable",
            "Choose an accepted invitation with current identity and contact checks.",
            409,
        )
    member = Member.objects.select_for_update().get(pk=invitation.invitee_id)
    if not current_checks(member):
        raise DomainError(
            "co_borrower_unavailable",
            "This person needs to renew their identity or contact checks.",
            409,
        )
    if invitation.invitee_id == application.offer.lender_id:
        raise DomainError(
            "co_borrower_is_lender", "The lender cannot also be the proposed co-borrower."
        )
    ApplicationCoBorrower.objects.create(
        application=application, invitation=invitation, member=invitation.invitee
    )


def application_companion(application):
    link = (
        ApplicationCoBorrower.objects.select_related("invitation", "member")
        .filter(application=application)
        .first()
    )
    if not link:
        return None
    current = link.invitation.status == "accepted" and current_checks(link.member)
    # Lenders see the invited identity, never the private contact record.
    return {
        "member": public_identity(link.member),
        "status": "consented" if current else "unavailable",
        "joint_liability": False,
    }
