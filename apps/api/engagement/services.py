import re
from collections import Counter
from datetime import timedelta

from accounts.permissions import require_staff
from audit.services import record_audit
from community.activity import visible_offers
from community.messaging import clean_text
from community.permissions import member_for
from community.profiles import award_data, public_identity
from community.reputation import eligible_flair
from community.reviews import PRIVATE_OR_THREAT
from config.errors import DomainError
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from marketplace.models import LendingOffer

from .models import CommentDecision, CommentReport, OfferComment, OfferLike, OfferReaction

CONTACT_OR_PRIVATE = re.compile(
    r"(?:\b(?:salary|payslip|passport|ssn|sss|tin|home\s+address|account\s+number)\b|(?:\+?63|0)[\d\s()\-]{8,}|<[^>]+>)",
    re.IGNORECASE,
)


def active_member(actor_id, *, lock=False):
    actor = member_for(actor_id)
    if lock:
        actor = type(actor).objects.select_for_update().get(pk=actor.id)
    if not actor.is_active or actor.suspended:
        raise DomainError(
            "restricted", "Community posting is unavailable while your account is restricted.", 403
        )
    return actor


def offer_for(offer_id, actor_id=None, *, mutation=False, lock=False):
    query = LendingOffer.objects.select_related("lender")
    if lock:
        query = query.select_for_update(of=("self",))
    try:
        offer = query.get(pk=offer_id)
    except (LendingOffer.DoesNotExist, ValueError, TypeError):
        raise DomainError("not_found", "Offer not found.", 404) from None
    public = visible_offers().filter(pk=offer.id).exists()
    own_draft = actor_id == offer.lender_id and offer.status == "draft"
    if not public and not own_draft:
        raise DomainError("not_found", "Offer not found.", 404)
    if mutation and not public:
        raise DomainError(
            "offer_unavailable", "Publish this offer before starting a public conversation.", 409
        )
    return offer


def comment_data(comment, actor_id=None):
    return {
        "id": str(comment.id),
        "author": public_identity(comment.author),
        "body": comment.body,
        "status": comment.status,
        "created_at": comment.created_at.isoformat(),
        "can_delete": comment.author_id == actor_id,
    }


def social_summary(*, offer_id, actor_id=None, cursor=0):
    offer = offer_for(offer_id, actor_id)
    choices = []
    mine = None
    counts = Counter()
    from community.models import Award
    from community.profiles import BADGES

    if actor_id:
        actor = member_for(actor_id)
        for award in Award.objects.filter(member=actor, eligible=True, private=False).order_by(
            "earned_at"
        ):
            if eligible_flair(member=actor, award_id=award.id):
                choices.append(award_data(award, public=True))
    for reaction in (
        OfferReaction.objects.filter(offer=offer, member__is_active=True, member__suspended=False)
        .select_related("member", "award")
        .iterator(chunk_size=100)
    ):
        award = eligible_flair(member=reaction.member, award_id=reaction.award_id)
        if award:
            counts[award.key] += 1
            if reaction.member_id == actor_id:
                mine = award_data(award, public=True)
    comments = OfferComment.objects.filter(offer=offer).exclude(status="deleted")
    comments = (
        comments.filter(
            Q(status="approved", author__is_active=True, author__suspended=False)
            | Q(author_id=actor_id)
        )
        if actor_id
        else comments.filter(status="approved", author__is_active=True, author__suspended=False)
    )
    comments = list(
        comments.select_related("author").order_by("created_at", "id")[cursor : cursor + 21]
    )
    return {
        "offer_id": str(offer.id),
        "likes": {
            "count": OfferLike.objects.filter(
                offer=offer, liked=True, member__is_active=True, member__suspended=False
            ).count(),
            "liked": bool(
                actor_id
                and OfferLike.objects.filter(offer=offer, member_id=actor_id, liked=True).exists()
            ),
        },
        "reactions": [
            {"key": key, "name": BADGES[key][0], "count": count}
            for key, count in sorted(counts.items())
        ],
        "my_reaction": mine,
        "reaction_choices": choices,
        "comments": [comment_data(comment, actor_id) for comment in comments[:20]],
        "comments_next_cursor": str(cursor + 20) if len(comments) > 20 else None,
    }


@transaction.atomic
def set_like(*, actor_id, offer_id, liked):
    active_member(actor_id)
    offer = offer_for(offer_id, actor_id, mutation=True, lock=True)
    actor = active_member(actor_id, lock=True)
    if type(liked) is not bool:
        raise DomainError("invalid_like", "Choose like or unlike explicitly.")
    OfferLike.objects.update_or_create(offer=offer, member=actor, defaults={"liked": liked})
    return {
        "liked": liked,
        "count": OfferLike.objects.filter(
            offer=offer, liked=True, member__is_active=True, member__suspended=False
        ).count(),
    }


@transaction.atomic
def set_reaction(*, actor_id, offer_id, award_id):
    active_member(actor_id)
    offer = offer_for(offer_id, actor_id, mutation=True, lock=True)
    actor = active_member(actor_id, lock=True)
    if award_id is None:
        OfferReaction.objects.filter(offer=offer, member=actor).delete()
        return
    award = eligible_flair(member=actor, award_id=award_id)
    if award is None:
        raise DomainError(
            "invalid_reaction", "Choose one of your currently eligible, shareable achievements."
        )
    OfferReaction.objects.update_or_create(offer=offer, member=actor, defaults={"award": award})


def held_content(body):
    return bool(PRIVATE_OR_THREAT.search(body) or CONTACT_OR_PRIVATE.search(body))


@transaction.atomic
def submit_comment(*, actor_id, offer_id, body, operation_id):
    active_member(actor_id)
    offer = offer_for(offer_id, actor_id, mutation=True, lock=True)
    actor = active_member(actor_id, lock=True)
    body = clean_text(body, 1200)
    prior = OfferComment.objects.filter(author=actor, operation_id=operation_id).first()
    if prior:
        if prior.offer_id != offer.id or prior.body != body:
            raise DomainError(
                "idempotency_conflict", "This operation was used for a different comment.", 409
            )
        return prior
    if (
        OfferComment.objects.filter(
            author=actor, created_at__gte=timezone.now() - timedelta(minutes=1)
        ).count()
        >= 6
    ):
        raise DomainError("rate_limited", "Please wait before posting another comment.", 429)
    result = OfferComment.objects.create(
        offer=offer,
        author=actor,
        body=body,
        operation_id=operation_id,
        status="held" if held_content(body) else "pending",
    )
    record_audit(actor_id=actor.id, action="offer.comment.submitted", subject_id=result.id)
    return result


@transaction.atomic
def delete_comment(*, actor_id, comment_id):
    actor = active_member(actor_id, lock=True)
    comment = OfferComment.objects.select_for_update().filter(pk=comment_id, author=actor).first()
    if comment is None:
        raise DomainError("not_found", "Comment not found.", 404)
    if comment.status != "deleted":
        comment.status = "deleted"
        comment.version += 1
        comment.save(update_fields=["status", "version", "updated_at"])
        record_audit(actor_id=actor.id, action="offer.comment.deleted", subject_id=comment.id)


@transaction.atomic
def report_comment(*, actor_id, comment_id, reason):
    actor = active_member(actor_id, lock=True)
    comment = (
        OfferComment.objects.filter(pk=comment_id, status="approved")
        .select_related("offer")
        .first()
    )
    if not comment:
        raise DomainError("not_found", "Comment not found.", 404)
    offer_for(comment.offer_id, actor_id)
    reason = clean_text(reason, 1000)
    report, _created = CommentReport.objects.get_or_create(
        comment=comment, reporter=actor, defaults={"reason": reason}
    )
    return report


@transaction.atomic
def moderate_comment(*, actor_id, comment_id, expected_version, decision, reason):
    actor = active_member(actor_id)
    require_staff(actor, {"moderator"}, sensitive=True)
    comment = (
        OfferComment.objects.select_for_update(of=("self",))
        .select_related("author", "offer")
        .filter(pk=comment_id)
        .first()
    )
    if not comment:
        raise DomainError("not_found", "Comment not found.", 404)
    if actor.id in {comment.author_id, comment.offer.lender_id}:
        raise DomainError("self_review", "An independent moderator must review this comment.", 403)
    if type(expected_version) is not int or comment.version != expected_version:
        raise DomainError("version_conflict", "This comment changed. Refresh before deciding.", 409)
    if decision not in {"approved", "held", "rejected"} or comment.status == "deleted":
        raise DomainError("invalid_decision", "Choose an available moderation outcome.")
    if decision == "approved" and held_content(comment.body):
        raise DomainError(
            "private_content",
            "Private information and financial allegations belong in a private case.",
        )
    reason = clean_text(reason, 1000)
    CommentDecision.objects.create(
        comment=comment,
        moderator=actor,
        decision=decision,
        reason=reason,
        previous_version=comment.version,
    )
    comment.status = decision
    comment.version += 1
    comment.save(update_fields=["status", "version", "updated_at"])
    record_audit(
        actor_id=actor.id, action="offer.comment.moderated", subject_id=comment.id, reason=decision
    )
    return comment
