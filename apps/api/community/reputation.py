"""Learning milestones and private relationship facts have separate boundaries."""

import hashlib
import json
import uuid

from config.errors import DomainError
from django.contrib.auth import get_user_model
from django.core import signing
from django.db.models import Q
from django.utils import timezone

from .models import Award, Contribution, ProfileSettings
from .permissions import member_for

REPUTATION_RULES = {"literacy_points": 100, "contribution_points": 50, "contribution_cap": 20}
LEVELS = (
    (0, "Newcomer"),
    (100, "Prepared"),
    (250, "Contributor"),
    (500, "Guide"),
    (1000, "Luminary"),
)
FRAMES = (
    ("plain", "Plain", 0),
    ("blue", "Blue", 100),
    ("leaf", "Leaf", 250),
    ("gold", "Gold", 500),
    ("orbit", "Orbit", 1000),
)
LEADERBOARD_NOTICE = (
    "Only opted-in members with visible points appear. Points recognize learning and approved "
    "educational contributions, not repayment ability or lending authority. Dense ranks: equal "
    "points share a rank; each next distinct score advances by one. Ties are ordered by member ID."
)


def community_facts(member, *, approved_count=None):
    from .awards import approved_contribution_ids

    if approved_count is None:
        approved_count = len(approved_contribution_ids(member_id=member.id))
    literacy_points = REPUTATION_RULES["literacy_points"] if member.literacy_completed else 0
    contribution_points = (
        min(approved_count, REPUTATION_RULES["contribution_cap"])
        * REPUTATION_RULES["contribution_points"]
    )
    points = literacy_points + contribution_points
    return {
        "points": points,
        "level": next(name for threshold, name in reversed(LEVELS) if points >= threshold),
        "literacy_points": literacy_points,
        "contribution_points": contribution_points,
        "approved_contributions": approved_count,
    }


def eligible_flair(*, member, award_id):
    """A cosmetic is a current, optional public claim, never private evidence."""
    from .awards import (
        EDUCATIONAL_CONTRIBUTION_THRESHOLDS,
        current_educational_evidence,
        public_financial_award_eligible,
    )
    from .profiles import BADGES

    if award_id is None:
        return None
    try:
        identifier = uuid.UUID(str(award_id))
    except (TypeError, ValueError, AttributeError):
        return None
    award = Award.objects.filter(
        pk=identifier,
        member=member,
        eligible=True,
        private=False,
        rule_version="v1",
        key__in=set(BADGES) - {"fresh_start"},
    ).first()
    if not award or not public_financial_award_eligible(award):
        return None
    if award.key in {"bright_start", *EDUCATIONAL_CONTRIBUTION_THRESHOLDS}:
        if not current_educational_evidence(member=member).get(award.key):
            return None
    if award.key == "first_chapter":
        from verification.models import VerificationCase

        if not member.literacy_completed:
            return None
        for kind in ("identity", "income", "contact", "funding_account"):
            check = (
                VerificationCase.objects.filter(member=member, kind=kind)
                .order_by("-created_at")
                .first()
            )
            if (
                not check
                or check.status != "approved"
                or (check.expires_at is not None and check.expires_at <= timezone.now())
            ):
                return None
    return award


def reputation_summary(member, *, own=False, preferences=None, facts=None):
    from .profiles import award_data

    preferences = (
        preferences
        if preferences is not None
        else ProfileSettings.objects.filter(member=member).first()
    )
    facts = facts if facts is not None else community_facts(member)
    selected_frame = preferences.avatar_frame if preferences else "plain"
    required = {key: threshold for key, _name, threshold in FRAMES}
    frame = (
        selected_frame
        if selected_frame in required and facts["points"] >= required[selected_frame]
        else "plain"
    )
    flair = (
        eligible_flair(member=member, award_id=preferences.avatar_flair_id) if preferences else None
    )
    visible = preferences.show_reputation if preferences else True
    return {
        "points": facts["points"] if own or visible else 0,
        "level": facts["level"],
        "frame": frame,
        "flair": award_data(flair, public=True) if flair else None,
        "show_points": visible,
    }


def reputation_details(*, member):
    preferences = ProfileSettings.objects.filter(member=member).first()
    facts = community_facts(member)
    next_level = next(
        ((threshold, name) for threshold, name in LEVELS if threshold > facts["points"]), None
    )
    return {
        "reputation": reputation_summary(member, own=True, preferences=preferences, facts=facts),
        "frames": [
            {
                "key": key,
                "name": name,
                "required_points": threshold,
                "unlocked": facts["points"] >= threshold,
            }
            for key, name, threshold in FRAMES
        ],
        "settings": {
            "avatar_frame": preferences.avatar_frame if preferences else "plain",
            "avatar_flair_id": str(preferences.avatar_flair_id)
            if preferences and preferences.avatar_flair_id
            else None,
            "show_reputation": preferences.show_reputation if preferences else True,
            "leaderboard_opt_in": preferences.leaderboard_opt_in if preferences else False,
        },
        "rules": REPUTATION_RULES,
        "progress": {
            "next_level": next_level[1] if next_level else None,
            "points_to_next": next_level[0] - facts["points"] if next_level else 0,
        },
        "breakdown": {
            key: facts[key]
            for key in ("literacy_points", "contribution_points", "approved_contributions")
        },
    }


def xp_progress(member, *, own=False):
    facts = community_facts(member)
    visible = (
        own
        or ProfileSettings.objects.filter(member=member, show_reputation=False).exists() is False
    )
    current_threshold = next(
        threshold for threshold, _name in reversed(LEVELS) if facts["points"] >= threshold
    )
    upcoming = next(
        ((threshold, name) for threshold, name in LEVELS if threshold > facts["points"]), None
    )
    return {
        "current_level": facts["level"],
        "current_level_points": current_threshold if visible else None,
        "next_level": upcoming[1] if upcoming else None,
        "next_level_points": upcoming[0] if visible and upcoming else None,
        "points_in_level": facts["points"] - current_threshold if visible else None,
        "points_to_next": upcoming[0] - facts["points"]
        if visible and upcoming
        else (0 if visible else None),
        "progress_percent": (
            round((facts["points"] - current_threshold) * 100 / (upcoming[0] - current_threshold))
            if upcoming
            else 100
        )
        if visible
        else None,
    }


def update_reputation_settings(*, member, data):
    selected = {
        key: data[key]
        for key in ("avatar_frame", "avatar_flair_id", "show_reputation", "leaderboard_opt_in")
        if key in data
    }
    if not selected:
        return
    for key in ("show_reputation", "leaderboard_opt_in"):
        if key in selected and not isinstance(selected[key], bool):
            raise DomainError(
                "invalid_preferences", "Community display preferences must be true or false."
            )
    if "avatar_frame" in selected:
        required = {key: threshold for key, _name, threshold in FRAMES}
        frame = selected["avatar_frame"]
        if not isinstance(frame, str) or frame not in required:
            raise DomainError("invalid_frame", "Choose a listed avatar frame.")
        if community_facts(member)["points"] < required[frame]:
            raise DomainError("locked_frame", "This avatar frame needs more learning points.", 403)
    if "avatar_flair_id" in selected and selected["avatar_flair_id"] is not None:
        award = eligible_flair(member=member, award_id=selected["avatar_flair_id"])
        if award is None:
            raise DomainError(
                "invalid_flair", "Choose your own currently eligible, shareable achievement."
            )
        selected["avatar_flair_id"] = award.id
    preferences, _ = ProfileSettings.objects.get_or_create(member=member)
    preferences = ProfileSettings.objects.select_for_update().get(pk=preferences.pk)
    for key, value in selected.items():
        setattr(preferences, key, value)
    preferences.save(update_fields=[*selected, "updated_at"])


def leaderboard(*, limit=25, cursor=None):
    from .profiles import public_identity

    if isinstance(limit, bool):
        raise DomainError("invalid_limit", "Choose a leaderboard limit from 1 to 50.")
    try:
        limit = int(limit)
    except (TypeError, ValueError, OverflowError):
        raise DomainError("invalid_limit", "Choose a leaderboard limit from 1 to 50.")
    if not 1 <= limit <= 50:
        raise DomainError("invalid_limit", "Choose a leaderboard limit from 1 to 50.")
    offset = 0
    position = None
    if cursor:
        try:
            if not isinstance(cursor, str) or len(cursor) > 2048:
                raise ValueError
            position = signing.loads(cursor, salt="community-leaderboard-v1", max_age=900)
            offset = position["offset"]
            if type(offset) is not int or offset < 0 or position["limit"] != limit:
                raise ValueError
        except (signing.BadSignature, ValueError, TypeError, KeyError):
            raise DomainError("invalid_cursor", "This leaderboard page has expired. Start again.")
    members = list(
        get_user_model()
        .objects.filter(
            is_active=True,
            suspended=False,
            community_settings__leaderboard_opt_in=True,
            community_settings__show_reputation=True,
        )
        .select_related("community_settings")
    )
    # Bulk reading is bounded by explicit participant opt-in. Canonicalization
    # matches award evaluation; no loan, document or verification row is read.
    bodies = {member.id: set() for member in members}
    for member_id, body in (
        Contribution.objects.filter(member_id__in=bodies, status="approved")
        .values_list("member_id", "body")
        .iterator(chunk_size=1000)
    ):
        if len(bodies[member_id]) < REPUTATION_RULES["contribution_cap"]:
            bodies[member_id].add(" ".join(body.lower().split()))
    scored = [
        (member, community_facts(member, approved_count=len(bodies[member.id])))
        for member in members
    ]
    scored.sort(key=lambda item: (-item[1]["points"], str(item[0].id)))
    fingerprint = hashlib.sha256(
        json.dumps([(str(member.id), facts["points"]) for member, facts in scored]).encode()
    ).hexdigest()
    if position and position.get("fingerprint") != fingerprint:
        raise DomainError(
            "leaderboard_changed", "The leaderboard changed. Start from the first page.", 409
        )
    ranks = {}
    for _member, facts in scored:
        if facts["points"] not in ranks:
            ranks[facts["points"]] = len(ranks) + 1
    page = scored[offset : offset + limit]
    next_cursor = (
        signing.dumps(
            {"offset": offset + limit, "limit": limit, "fingerprint": fingerprint},
            salt="community-leaderboard-v1",
            compress=True,
        )
        if offset + limit < len(scored)
        else None
    )
    return {
        "entries": [
            {
                "rank": ranks[facts["points"]],
                **public_identity(member, include_reputation=False),
                "reputation": reputation_summary(
                    member, preferences=member.community_settings, facts=facts
                ),
            }
            for member, facts in page
        ],
        "next_cursor": next_cursor,
        "rules": REPUTATION_RULES,
        "notice": LEADERBOARD_NOTICE,
    }


def repayment_summary(*, actor_id, member_id, purpose):
    from servicing.models import Loan

    member_for(actor_id)
    member_for(member_id)
    loans = Loan.objects.filter(
        Q(borrower_id=member_id) | Q(lender_id=member_id), disbursement_status="confirmed"
    )
    if actor_id == member_id:
        if purpose != "own_dashboard":
            raise DomainError("invalid_purpose", "Choose your own private dashboard purpose.")
        basis = "Your verified loan history only."
    else:
        if purpose != "existing_relationship":
            raise DomainError("forbidden", "A specific permitted relationship is required.", 403)
        loans = loans.filter(Q(borrower_id=actor_id) | Q(lender_id=actor_id))
        if not loans.exists():
            raise DomainError("not_found", "Relationship not found.", 404)
        basis = "Only verified transactions shared by you and this member; no other counterparties' records."
    from django.db.models import Sum
    from servicing.models import LedgerEntry

    entries = LedgerEntry.objects.filter(loan__in=loans)
    return {
        "member_id": str(member_id),
        "purpose": purpose,
        "basis": basis,
        "loan_count": loans.count(),
        "completed_count": loans.filter(status="repaid").count(),
        "closed_with_loss_count": loans.filter(status="closed_with_loss").count(),
        "confirmed_collections": str(
            entries.filter(kind="collection").aggregate(total=Sum("amount"))["total"] or 0
        ),
        "confirmed_reversals": str(
            entries.filter(kind="collection_reversed").aggregate(total=Sum("amount"))["total"] or 0
        ),
        "currency": "PHP",
        "unit": "centavos_as_decimal_strings",
        "notice": "A factual private history is not a repayment guarantee or a credit-bureau assessment.",
    }
