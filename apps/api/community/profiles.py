import uuid

from accounts.services import validate_avatar_key
from config.errors import DomainError
from django.contrib.auth import get_user_model
from django.db import transaction

from .locations import coarse_area
from .models import Award, Contribution, ProfileSettings, Review
from .permissions import member_for

BADGES = {
    "first_chapter": ("First Chapter", "Approved onboarding and a completed literacy module."),
    "clockwork": (
        "Clockwork",
        "Three confirmed on-time installments on an existing loan, with no unresolved reversal.",
    ),
    "full_circle": ("Full Circle", "A fully settled loan with no pending collection reversal."),
    "open_book": (
        "Open Book",
        "Three completed agreements with complete disclosures and no upheld disclosure finding.",
    ),
    "helping_hand": ("Helping Hand", "Five distinct moderator-approved educational contributions."),
    "fresh_start": (
        "Fresh Start",
        "Private recognition after completing a mutually agreed recovery arrangement.",
    ),
}


def achievement_catalog():
    return [
        {"key": key, "name": name, "criteria": criteria, "private": key == "fresh_start"}
        for key, (name, criteria) in BADGES.items()
    ]


def public_identity(member):
    handle = member.username if "@" not in member.username else str(member.id)
    fallback = member.username if "@" not in member.username else f"Member {str(member.id)[:8]}"
    return {
        "handle": handle,
        "display_name": member.display_name or fallback,
        "avatar_key": member.avatar_key,
    }


def public_area(member):
    try:
        return coarse_area(area_code=member.area)["name"]
    except DomainError:
        return ""


def community_level(member):
    count = Contribution.objects.filter(member=member, status="approved").count()
    if member.literacy_completed and count >= 5:
        return "Guide"
    if member.literacy_completed and count >= 3:
        return "Contributor"
    return "Prepared" if member.literacy_completed else "Newcomer"


def award_data(award, public=False):
    name, criteria = BADGES[award.key]
    result = {
        "id": str(award.id),
        "key": award.key,
        "name": name,
        "criteria": criteria,
        "earned_at": award.earned_at.isoformat(),
        "rule_version": award.rule_version,
    }
    if not public:
        result.update(eligible=award.eligible, private=award.private)
    return result


def public_profile(*, handle, viewer_id=None):
    try:
        try:
            member_id = uuid.UUID(str(handle))
        except (ValueError, TypeError):
            member_id = None
        member = get_user_model().objects.get(
            **({"pk": member_id} if member_id else {"username": handle}), is_active=True
        )
    except get_user_model().DoesNotExist:
        raise DomainError("not_found", "Profile not found.", 404)
    settings = ProfileSettings.objects.filter(member=member).first()
    selected = settings.public_award_ids if settings else []
    awards = list(
        Award.objects.filter(member=member, id__in=selected, eligible=True, private=False)
    )
    # Public financial claims are checked now. Durable evaluation still owns the
    # member's private award history and correction records.
    from .awards import current_financial_evidence, public_financial_award_eligible

    financial = {"clockwork", "full_circle", "open_book", "fresh_start"}
    facts = (
        current_financial_evidence(member_id=member.id)
        if any(award.key in financial for award in awards)
        else {}
    )
    awards = [award for award in awards if public_financial_award_eligible(award, evidence=facts)]
    review_rows = (
        Review.objects.filter(subject=member, status="approved", published_at__isnull=False)
        .select_related("author")
        .order_by("-published_at")[:50]
    )
    reviews = []
    # A reopened loan must remove publication immediately, even before a background re-evaluation.
    for review in review_rows:
        from .domain import eligible_review_loan

        try:
            eligible_review_loan(review.loan_id)
        except DomainError:
            continue
        reviews.append(
            {
                "id": str(review.id),
                "author_display_name": public_identity(review.author)["display_name"],
                "ratings": review.ratings,
                "body": review.body,
                "published_at": review.published_at.isoformat(),
                "response": review.response if review.response_status == "approved" else "",
            }
        )
    return {
        "id": str(member.id),
        **public_identity(member),
        "bio": member.bio,
        "area": public_area(member),
        "community_level": community_level(member),
        "badges": [award_data(a, public=True) for a in awards],
        "reviews": reviews,
    }


@transaction.atomic
def update_profile(*, actor_id, data):
    allowed = {"display_name", "bio", "area", "public_award_ids", "avatar_key"}
    if set(data) - allowed:
        raise DomainError(
            "invalid_fields",
            "Only display name, bio, city, avatar and badge selections may be edited here.",
        )
    member = member_for(actor_id)
    if "avatar_key" in data:
        member.avatar_key = validate_avatar_key(data["avatar_key"])
    for field, maximum in (("display_name", 100), ("bio", 400)):
        if field in data:
            value = str(data[field]).strip()
            if len(value) > maximum:
                raise DomainError(
                    "invalid_profile", f"{field} must have at most {maximum} characters."
                )
            setattr(member, field, value)
    if "area" in data:
        member.area = coarse_area(area_code=data["area"])["name"]
    member.save(update_fields=["display_name", "bio", "area", "avatar_key"])
    if "public_award_ids" in data:
        set_public_badges(member_id=actor_id, award_ids=data["public_award_ids"])
    return public_profile(handle=member.username, viewer_id=actor_id)


def set_public_badges(*, member_id, award_ids):
    if (
        not isinstance(award_ids, (list, tuple))
        or len(award_ids) > 3
        or len(set(map(str, award_ids))) != len(award_ids)
    ):
        raise DomainError("invalid_badges", "Choose at most three distinct awards.")
    try:
        count = Award.objects.filter(
            member_id=member_id, pk__in=award_ids, eligible=True, private=False
        ).count()
    except (ValueError, TypeError):
        count = -1
    if count != len(award_ids):
        raise DomainError("invalid_badges", "Only your eligible, shareable awards can be selected.")
    settings, _ = ProfileSettings.objects.get_or_create(member_id=member_id)
    settings.public_award_ids = list(map(str, award_ids))
    settings.save(update_fields=["public_award_ids", "updated_at"])
