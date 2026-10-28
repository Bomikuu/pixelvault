import re
from datetime import timedelta

from config.errors import DomainError
from django.db import transaction
from django.utils import timezone

from .domain import eligible_review_loan
from .messaging import clean_text
from .models import ModerationHistory, Review
from .permissions import member_for, staff_for

RATING_KEYS = {"communication", "clarity_of_terms", "reliability", "respectful_conduct"}
# Conservative triage only. Human review is always required, including text without these patterns.
PRIVATE_OR_THREAT = re.compile(
    r"(?:\b(?:arrest|kill|expose|unpaid|overdue|delinquen\w*|utang|debt|payslip|passport)\b|\b\d{9,}\b|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|https?://)",
    re.IGNORECASE,
)


@transaction.atomic
def submit_review(*, actor_id, loan_id, ratings, body, operation_id):
    member = member_for(actor_id)
    type(member).objects.select_for_update().get(pk=actor_id)
    loan = eligible_review_loan(loan_id, actor_id)
    if (
        not isinstance(ratings, dict)
        or set(ratings) != RATING_KEYS
        or any(type(value) is not int or not 1 <= value <= 5 for value in ratings.values())
    ):
        raise DomainError("invalid_ratings", "Rate all four conduct categories from 1 to 5.")
    body = clean_text(body, 2000) if body else ""
    previous = Review.objects.filter(author_id=actor_id, operation_id=operation_id).first()
    if previous:
        if previous.loan_id != loan.id or previous.ratings != ratings or previous.body != body:
            raise DomainError("idempotency_conflict", "This key was used for another review.", 409)
        return previous
    if Review.objects.filter(author_id=actor_id, loan_id=loan.id).exists():
        raise DomainError(
            "already_reviewed", "Each party can submit one review per settled loan.", 409
        )
    subject_id = loan.lender_id if actor_id == loan.borrower_id else loan.borrower_id
    return Review.objects.create(
        loan_id=loan.id,
        author_id=actor_id,
        subject_id=subject_id,
        ratings=ratings,
        body=body,
        operation_id=operation_id,
        status="held" if PRIVATE_OR_THREAT.search(body) else "pending",
        moderation_reason="Private information or financial allegation requires case handling."
        if PRIVATE_OR_THREAT.search(body)
        else "",
    )


def publish_eligible_reviews(*, at=None):
    at = at or timezone.now()
    count = 0
    for loan_id in (
        Review.objects.filter(status="approved", published_at__isnull=True)
        .values_list("loan_id", flat=True)
        .distinct()
    ):
        try:
            loan = eligible_review_loan(loan_id)
        except DomainError:
            continue
        enough_reviews = Review.objects.filter(loan_id=loan.id).count() == 2
        closed_at = loan.closed_at
        if enough_reviews or (closed_at and at >= closed_at + timedelta(days=14)):
            count += Review.objects.filter(
                loan_id=loan.id, status="approved", published_at__isnull=True
            ).update(published_at=at)
    return count


@transaction.atomic
def moderate_content(
    *, actor_id, content_id, expected_version, decision, reason, content_type="review"
):
    actor = staff_for(actor_id, ("moderator",))
    reason = clean_text(reason, 2000)
    if decision not in ("approved", "held", "rejected", "response_approved", "response_rejected"):
        raise DomainError("invalid_decision", "Choose an explicit moderation outcome.")
    from .models import Contribution

    model = (
        Review
        if content_type == "review"
        else Contribution
        if content_type == "contribution"
        else None
    )
    if not model:
        raise DomainError("invalid_content", "Unsupported moderation content.")
    try:
        record = model.objects.select_for_update().get(pk=content_id)
    except (model.DoesNotExist, ValueError):
        raise DomainError("not_found", "Record not found.", 404)
    owner = record.author_id if content_type == "review" else record.member_id
    if actor_id == owner or (content_type == "review" and actor_id == record.subject_id):
        raise DomainError("self_review", "Staff cannot moderate their own content.", 403)
    if record.version != expected_version:
        raise DomainError("version_conflict", "This content changed. Refresh before deciding.", 409)
    if decision.startswith("response_"):
        if content_type != "review" or not record.response:
            raise DomainError("invalid_response", "There is no response to moderate.")
        if actor_id == record.subject_id:
            raise DomainError("self_review", "Staff cannot approve their own response.", 403)
        if decision == "response_approved" and PRIVATE_OR_THREAT.search(record.response):
            raise DomainError(
                "private_content",
                "Keep financial allegations and private information in a private case.",
            )
        record.response_status = decision.removeprefix("response_")
    else:
        if decision == "approved" and PRIVATE_OR_THREAT.search(record.body):
            raise DomainError(
                "private_content",
                "Keep financial allegations and private information in a private case.",
            )
        record.status = decision
        if content_type == "review" and decision != "approved":
            record.published_at = None
    record.moderator = actor
    record.moderation_reason = reason
    record.version += 1
    record.save()
    ModerationHistory.objects.create(
        content_type=content_type,
        content_id=record.id,
        actor=actor,
        decision=decision,
        reason=reason,
        previous_version=expected_version,
    )
    if content_type == "review":
        publish_eligible_reviews()
    return record


@transaction.atomic
def respond_review(*, actor_id, review_id, body):
    try:
        review = Review.objects.select_for_update().get(
            pk=review_id, subject_id=actor_id, published_at__isnull=False, status="approved"
        )
    except (Review.DoesNotExist, ValueError):
        raise DomainError("not_found", "Record not found.", 404)
    member_for(actor_id)
    if review.response:
        raise DomainError(
            "response_exists",
            "This review already has a response. Use an appeal for corrections.",
            409,
        )
    review.response = clean_text(body, 2000)
    review.response_status = "pending"
    review.version += 1
    review.save(update_fields=["response", "response_status", "version", "updated_at"])
    return review


def appeal_review(*, actor_id, review_id, reason):
    try:
        review = Review.objects.get(pk=review_id)
    except (Review.DoesNotExist, ValueError):
        raise DomainError("not_found", "Record not found.", 404)
    if actor_id not in (review.author_id, review.subject_id):
        raise DomainError("not_found", "Record not found.", 404)
    from .models import ContentReport

    return ContentReport.objects.create(
        reporter_id=actor_id,
        content_type="review_appeal",
        content_id=review.id,
        reason=clean_text(reason, 2000),
    )
