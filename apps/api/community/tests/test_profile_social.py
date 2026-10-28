import uuid
from datetime import timedelta

import pytest
from config.errors import DomainError
from django.utils import timezone
from rest_framework.test import APIClient

from community.models import ProfileSettings, Review
from community.profiles import public_profile
from community.reputation import community_facts
from community.reviews import publish_eligible_reviews, submit_review

pytestmark = pytest.mark.django_db
RATINGS = {"communication": 4, "clarity_of_terms": 5, "reliability": 4, "respectful_conduct": 5}


def settle(loan):
    loan.status = "repaid"
    loan.principal_balance = loan.interest_balance = 0
    loan.closed_at = timezone.now() - timedelta(days=15)
    loan.save()


def test_recommendations_require_actual_relationship_review_and_moderated_publication(
    loan, members
):
    settle(loan)
    operation_id = uuid.uuid4()
    review = submit_review(
        actor_id=members[0].id,
        loan_id=loan.id,
        ratings=RATINGS,
        body="Clear communication",
        operation_id=operation_id,
        recommendation="up",
    )
    assert public_profile(handle=members[1].username)["recommendation_summary"] == {
        "up": 0,
        "down": 0,
        "total": 0,
    }
    review.status = "approved"
    review.save(update_fields=["status"])
    publish_eligible_reviews()
    public = public_profile(handle=members[1].username)
    assert public["recommendation_summary"] == {"up": 1, "down": 0, "total": 1}
    row = public["reviews"][0]
    assert row["recommendation"] == "up"
    assert row["author"]["handle"] == members[0].username
    assert {"display_name", "avatar_key", "photo_url", "reputation"} <= set(row["author"])
    assert row["author_photo_url"] is None
    assert members[0].email not in str(public)
    assert "loan_id" not in str(public)
    assert "principal_balance" not in str(public)
    assert "trusted" not in str(public).lower()
    assert (
        submit_review(
            actor_id=members[0].id,
            loan_id=loan.id,
            ratings=RATINGS,
            body="Clear communication",
            operation_id=operation_id,
            recommendation="up",
        ).id
        == review.id
    )
    with pytest.raises(DomainError):
        submit_review(
            actor_id=members[0].id,
            loan_id=loan.id,
            ratings=RATINGS,
            body="Clear communication",
            operation_id=operation_id,
            recommendation="down",
        )
    with pytest.raises(DomainError):
        submit_review(
            actor_id=members[2].id,
            loan_id=loan.id,
            ratings=RATINGS,
            body="No relationship",
            operation_id=uuid.uuid4(),
            recommendation="up",
        )
    assert community_facts(members[1])["points"] == 0


def test_reopened_or_unapproved_review_removes_recommendation_counts_immediately(loan, members):
    settle(loan)
    review = Review.objects.create(
        loan_id=loan.id,
        author=members[0],
        subject=members[1],
        ratings=RATINGS,
        operation_id=uuid.uuid4(),
        status="approved",
        published_at=timezone.now(),
        recommendation="down",
    )
    assert public_profile(handle=members[1].username)["recommendation_summary"] == {
        "up": 0,
        "down": 1,
        "total": 1,
    }
    review.status = "held"
    review.save(update_fields=["status"])
    assert public_profile(handle=members[1].username)["recommendation_summary"]["total"] == 0
    review.status = "approved"
    review.save(update_fields=["status"])
    loan.status = "active"
    loan.principal_balance = 100
    loan.save()
    public = public_profile(handle=members[1].username)
    assert public["recommendation_summary"]["total"] == 0
    assert public["reviews"] == []


def test_public_xp_progress_respects_hidden_points_but_owner_can_see_actual_progress(members):
    member = members[1]
    member.literacy_completed = True
    member.save(update_fields=["literacy_completed"])
    visible = public_profile(handle=member.username)["xp_progress"]
    assert visible == {
        "current_level": "Prepared",
        "current_level_points": 100,
        "next_level": "Contributor",
        "next_level_points": 250,
        "points_in_level": 0,
        "points_to_next": 150,
        "progress_percent": 0,
    }
    ProfileSettings.objects.create(member=member, show_reputation=False)
    hidden = public_profile(handle=member.username)["xp_progress"]
    assert hidden["current_level"] == "Prepared"
    assert all(
        value is None for key, value in hidden.items() if key not in {"current_level", "next_level"}
    )
    client = APIClient()
    client.force_authenticate(member)
    own = client.get("/api/v1/community/profile").json()
    assert own["xp_progress"]["points_to_next"] == 150
    assert own["reputation"]["points"] == 100


def test_recommendation_api_accepts_only_defined_optional_thumb_values(loan, members):
    settle(loan)
    client = APIClient()
    client.force_authenticate(members[0])
    request = {
        "loan_id": str(loan.id),
        "ratings": RATINGS,
        "body": "Helpful terms discussion",
        "operation_id": str(uuid.uuid4()),
    }
    assert (
        client.post(
            "/api/v1/community/reviews", {**request, "recommendation": "trusted"}, format="json"
        ).status_code
        == 400
    )
    response = client.post(
        "/api/v1/community/reviews", {**request, "recommendation": "up"}, format="json"
    )
    assert response.status_code == 201
    assert response.json()["recommendation"] == "up"
    assert response.json()["status"] == "pending"
