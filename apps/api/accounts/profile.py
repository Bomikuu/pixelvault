"""Public photo projections and private setup/contact metadata."""

from django.utils import timezone

from .models import AVATAR_KEYS


def photo_url(member, *, owner_preview=False):
    if (
        not member.is_active
        or member.suspended
        or not member.profile_photo_id
        or not member.profile_photo
    ):
        return None
    if member.photo_mode != "photo" and not owner_preview:
        return None
    return f"/api/v1/community/photos/{member.profile_photo_id}"


def contact_data(member):
    from verification.models import VerificationCase

    check = (
        VerificationCase.objects.filter(member=member, kind="contact")
        .order_by("-created_at")
        .first()
    )
    current = bool(
        check
        and check.status == "approved"
        and (check.expires_at is None or check.expires_at > timezone.now())
    )
    return {
        "email": member.email,
        "mobile_number": member.mobile_number,
        "email_verified": False,
        "mobile_verified": False,
        "verification": {
            "status": check.status if check else "not_submitted",
            "current": current,
            "provenance": check.provenance if check else None,
            "expires_at": check.expires_at.isoformat() if check and check.expires_at else None,
        },
        "delivery_available": False,
        "notice": "Email and mobile are self-reported contact details. SMS and email verification delivery are not configured; a contact-evidence review does not verify ownership of either channel.",
    }


def setup_completeness(member):
    from community.locations import coarse_area
    from config.errors import DomainError
    from verification.models import VerificationCase

    try:
        area_set = bool(coarse_area(area_code=member.area))
    except DomainError:
        area_set = False
    identity = (
        VerificationCase.objects.filter(member=member, kind="identity")
        .order_by("-created_at")
        .first()
    )
    identity_current = bool(
        identity
        and identity.status == "approved"
        and (identity.expires_at is None or identity.expires_at > timezone.now())
    )
    steps = [
        {
            "key": "display_name",
            "label": "Add a display name",
            "complete": bool(member.display_name.strip()),
            "href": "/profile/edit",
        },
        {
            "key": "area",
            "label": "Choose an approximate area",
            "complete": area_set,
            "href": "/profile/edit",
        },
        {
            "key": "bio",
            "label": "Introduce yourself",
            "complete": bool(member.bio.strip()),
            "href": "/profile/edit",
        },
        {
            "key": "email",
            "label": "Provide a contact email",
            "complete": bool(member.email),
            "href": "/profile/contacts",
        },
        {
            "key": "mobile",
            "label": "Provide a mobile number",
            "complete": bool(member.mobile_number),
            "href": "/profile/contacts",
        },
        {
            "key": "picture",
            "label": "Choose a profile picture",
            "complete": bool(photo_url(member) or member.avatar_key in AVATAR_KEYS),
            "href": "/profile/edit",
        },
        {
            "key": "identity",
            "label": "Complete the private identity review",
            "complete": identity_current,
            "href": "/verification",
        },
        {
            "key": "literacy",
            "label": "Complete the learning module",
            "complete": member.literacy_completed,
            "href": "/learn",
        },
    ]
    completed = sum(step["complete"] for step in steps)
    return {
        "completed": completed,
        "total": len(steps),
        "percent": round(completed * 100 / len(steps)),
        "steps": steps,
    }


def own_profile_details(member):
    return {
        "photo_mode": member.photo_mode,
        "has_photo": bool(member.profile_photo_id and member.profile_photo),
        "stored_photo_url": photo_url(member, owner_preview=True),
        "setup_completeness": setup_completeness(member),
    }
