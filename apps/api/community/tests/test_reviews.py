import uuid
from datetime import timedelta

import pytest
from accounts.models import Member
from config.errors import DomainError
from django.utils import timezone

from community.models import Review
from community.profiles import public_profile
from community.reviews import moderate_content, publish_eligible_reviews, submit_review

pytestmark = pytest.mark.django_db
RATINGS = {"communication": 4, "clarity_of_terms": 5, "reliability": 4, "respectful_conduct": 5}


def closed(loan):
    loan.status = "repaid"
    loan.principal_balance = 0
    loan.interest_balance = 0
    loan.closed_at = timezone.now()
    loan.save()
    return loan


def moderator():
    return Member.objects.create_user(
        username="moderator",
        email="moderator@example.test",
        password="not-a-real-password",
        is_staff=True,
        staff_role="moderator",
    )


def test_one_review_per_party_per_verified_loan(loan, members):
    closed(loan)
    submit_review(
        actor_id=members[0].id,
        loan_id=loan.id,
        ratings=RATINGS,
        body="Clear communication",
        operation_id=uuid.uuid4(),
    )
    with pytest.raises(DomainError):
        submit_review(
            actor_id=members[0].id,
            loan_id=loan.id,
            ratings=RATINGS,
            body="Again",
            operation_id=uuid.uuid4(),
        )
    with pytest.raises(DomainError):
        submit_review(
            actor_id=members[2].id,
            loan_id=loan.id,
            ratings=RATINGS,
            body="Outsider",
            operation_id=uuid.uuid4(),
        )


def test_one_sided_review_hidden_before_14_days(loan, members):
    closed(loan)
    review = submit_review(
        actor_id=members[0].id,
        loan_id=loan.id,
        ratings=RATINGS,
        body="Clear communication",
        operation_id=uuid.uuid4(),
    )
    staff = moderator()
    moderate_content(
        actor_id=staff.id,
        content_id=review.id,
        expected_version=1,
        decision="approved",
        reason="Conduct review only",
    )
    assert publish_eligible_reviews(at=loan.closed_at + timedelta(days=13)) == 0
    assert public_profile(handle=members[1].username)["reviews"] == []
    assert publish_eligible_reviews(at=loan.closed_at + timedelta(days=14)) == 1
    assert len(public_profile(handle=members[1].username)["reviews"]) == 1


def test_both_submitted_requires_moderation_before_publication(loan, members):
    closed(loan)
    for member in members[:2]:
        submit_review(
            actor_id=member.id,
            loan_id=loan.id,
            ratings=RATINGS,
            body="Respectful",
            operation_id=uuid.uuid4(),
        )
    assert publish_eligible_reviews() == 0
    assert Review.objects.filter(published_at__isnull=False).count() == 0


def test_review_threat_or_private_data_is_held(loan, members):
    closed(loan)
    review = submit_review(
        actor_id=members[0].id,
        loan_id=loan.id,
        ratings=RATINGS,
        body="I will expose your unpaid debt",
        operation_id=uuid.uuid4(),
    )
    assert review.status == "held"
    with pytest.raises(DomainError):
        moderate_content(
            actor_id=moderator().id,
            content_id=review.id,
            expected_version=1,
            decision="approved",
            reason="Approve",
        )
    assert publish_eligible_reviews(at=loan.closed_at + timedelta(days=20)) == 0


def test_closed_loan_reopened_holds_publication(loan, members):
    closed(loan)
    review = submit_review(
        actor_id=members[0].id,
        loan_id=loan.id,
        ratings=RATINGS,
        body="Helpful",
        operation_id=uuid.uuid4(),
    )
    moderate_content(
        actor_id=moderator().id,
        content_id=review.id,
        expected_version=1,
        decision="approved",
        reason="Checked",
    )
    publish_eligible_reviews(at=loan.closed_at + timedelta(days=15))
    loan.status = "active"
    loan.principal_balance = 100
    loan.save()
    assert public_profile(handle=members[1].username)["reviews"] == []
