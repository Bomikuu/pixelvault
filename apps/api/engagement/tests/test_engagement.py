import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta

import pytest
from accounts.models import Member
from community.models import Award, Contribution
from config.errors import DomainError
from django.db import close_old_connections
from django.utils import timezone
from engagement.calculator import preview_offer
from engagement.models import CommentReport, OfferLike, OfferReaction
from engagement.services import (
    delete_comment,
    moderate_comment,
    report_comment,
    set_like,
    set_reaction,
    social_summary,
    submit_comment,
)
from rest_framework.test import APIClient

pytestmark = pytest.mark.django_db


@pytest.fixture
def moderator(db):
    return Member.objects.create_user(
        username="moderator-engagement",
        email="moderator-engagement@example.test",
        is_staff=True,
        staff_role="moderator",
        staff_step_up_until=timezone.now() + timedelta(minutes=5),
    )


@pytest.fixture
def badge(members):
    member = members[1]
    member.literacy_completed = True
    member.save(update_fields=["literacy_completed"])
    return Award.objects.create(
        member=member, key="bright_start", eligible=True, earned_at=timezone.now()
    )


def test_like_desired_state_is_persisted_idempotently_without_xp(offer, members):
    actor = members[1]
    assert set_like(actor_id=actor.id, offer_id=offer.id, liked=True) == {"count": 1, "liked": True}
    assert set_like(actor_id=actor.id, offer_id=offer.id, liked=True)["count"] == 1
    assert OfferLike.objects.count() == 1
    assert set_like(actor_id=actor.id, offer_id=offer.id, liked=False)["count"] == 0
    assert set_like(actor_id=actor.id, offer_id=offer.id, liked=False)["count"] == 0
    assert not Award.objects.filter(member=actor).exists()


@pytest.mark.django_db(transaction=True)
def test_concurrent_like_requests_cannot_duplicate_member_offer_state(offer, members):
    def like():
        close_old_connections()
        try:
            return set_like(actor_id=members[1].id, offer_id=offer.id, liked=True)
        finally:
            close_old_connections()

    with ThreadPoolExecutor(max_workers=2) as executor:
        results = list(executor.map(lambda _: like(), range(2)))
    assert all(result["count"] == 1 for result in results)
    assert OfferLike.objects.filter(offer=offer).count() == 1


@pytest.mark.parametrize("status", ["draft", "closed", "exhausted"])
def test_nonpublic_offer_cannot_be_probed_by_engagement_endpoints(offer, members, status):
    offer.status = status
    offer.save(update_fields=["status"])
    for actor in (None, members[1].id):
        with pytest.raises(DomainError) as error:
            social_summary(offer_id=offer.id, actor_id=actor)
        assert error.value.status_code == 404
    if status == "draft":
        assert social_summary(offer_id=offer.id, actor_id=members[0].id)["offer_id"] == str(
            offer.id
        )
        with pytest.raises(DomainError):
            set_like(actor_id=members[0].id, offer_id=offer.id, liked=True)


@pytest.mark.parametrize(
    "change", ["expired", "suspended_lender", "inactive_lender", "no_capacity"]
)
def test_public_offer_visibility_changes_remove_all_social_projection(offer, members, change):
    if change == "expired":
        offer.expires_at = timezone.now() - timedelta(seconds=1)
        offer.save(update_fields=["expires_at"])
    elif change == "no_capacity":
        offer.committed_amount = offer.declared_amount
        offer.save(update_fields=["committed_amount"])
    else:
        setattr(
            members[0],
            "suspended" if change == "suspended_lender" else "is_active",
            change == "suspended_lender",
        )
        members[0].save()
    with pytest.raises(DomainError) as error:
        social_summary(offer_id=offer.id)
    assert error.value.status_code == 404


def test_suspended_member_cannot_like_comment_or_react(offer, members, badge):
    actor = members[1]
    actor.suspended = True
    actor.save()
    for action in (
        lambda: set_like(actor_id=actor.id, offer_id=offer.id, liked=True),
        lambda: set_reaction(actor_id=actor.id, offer_id=offer.id, award_id=badge.id),
        lambda: submit_comment(
            actor_id=actor.id,
            offer_id=offer.id,
            body="What dates apply?",
            operation_id=uuid.uuid4(),
        ),
    ):
        with pytest.raises(DomainError) as error:
            action()
        assert error.value.status_code == 403


def test_reaction_choice_requires_own_current_nonprivate_award(offer, members, badge):
    set_reaction(actor_id=members[1].id, offer_id=offer.id, award_id=badge.id)
    result = social_summary(offer_id=offer.id, actor_id=members[1].id)
    assert result["reactions"] == [{"key": "bright_start", "name": "Bright Start", "count": 1}]
    assert result["my_reaction"]["id"] == str(badge.id)
    with pytest.raises(DomainError):
        set_reaction(actor_id=members[2].id, offer_id=offer.id, award_id=badge.id)
    badge.private = True
    badge.save()
    assert social_summary(offer_id=offer.id)["reactions"] == []
    with pytest.raises(DomainError):
        set_reaction(actor_id=members[1].id, offer_id=offer.id, award_id=badge.id)


def test_reaction_rechecks_revoked_evidence_before_background_award_evaluation(
    offer, members, badge
):
    set_reaction(actor_id=members[1].id, offer_id=offer.id, award_id=badge.id)
    members[1].literacy_completed = False
    members[1].save()
    assert badge.eligible  # Stored award has not been asynchronously corrected yet.
    result = social_summary(offer_id=offer.id, actor_id=members[1].id)
    assert (
        result["reactions"] == []
        and result["reaction_choices"] == []
        and result["my_reaction"] is None
    )


def test_reaction_can_be_replaced_or_removed_without_duplicates(offer, members, badge):
    Contribution.objects.create(
        member=members[1], body="Compare the full cost and dates.", status="approved"
    )
    second = Award.objects.create(
        member=members[1], key="good_neighbor", eligible=True, earned_at=timezone.now()
    )
    set_reaction(actor_id=members[1].id, offer_id=offer.id, award_id=badge.id)
    set_reaction(actor_id=members[1].id, offer_id=offer.id, award_id=second.id)
    assert OfferReaction.objects.get().award_id == second.id
    set_reaction(actor_id=members[1].id, offer_id=offer.id, award_id=None)
    set_reaction(actor_id=members[1].id, offer_id=offer.id, award_id=None)
    assert OfferReaction.objects.count() == 0


def test_pending_comments_are_visible_only_to_the_author_until_moderated(offer, members, moderator):
    operation = uuid.uuid4()
    comment = submit_comment(
        actor_id=members[1].id,
        offer_id=offer.id,
        body="Which date does the monthly schedule use?",
        operation_id=operation,
    )
    assert (
        submit_comment(
            actor_id=members[1].id, offer_id=offer.id, body=comment.body, operation_id=operation
        ).id
        == comment.id
    )
    assert social_summary(offer_id=offer.id)["comments"] == []
    assert len(social_summary(offer_id=offer.id, actor_id=members[1].id)["comments"]) == 1
    assert social_summary(offer_id=offer.id, actor_id=members[2].id)["comments"] == []
    moderate_comment(
        actor_id=moderator.id,
        comment_id=comment.id,
        expected_version=1,
        decision="approved",
        reason="Offer question with no private information.",
    )
    public = social_summary(offer_id=offer.id)["comments"][0]
    assert (
        public["body"] == comment.body and public["author"]["avatar_key"] == members[1].avatar_key
    )
    assert "email" not in public["author"]
    with pytest.raises(DomainError):
        submit_comment(
            actor_id=members[1].id, offer_id=offer.id, body="Changed body", operation_id=operation
        )


@pytest.mark.parametrize(
    "body",
    [
        "Email me at private@example.test",
        "My account number is 1234567890",
        "Call +63 917 123 4567",
        "This person has unpaid debt",
        "<script>expose()</script>",
    ],
)
def test_private_or_threatening_comments_cannot_be_approved(offer, members, moderator, body):
    comment = submit_comment(
        actor_id=members[1].id, offer_id=offer.id, body=body, operation_id=uuid.uuid4()
    )
    assert comment.status == "held"
    with pytest.raises(DomainError):
        moderate_comment(
            actor_id=moderator.id,
            comment_id=comment.id,
            expected_version=1,
            decision="approved",
            reason="Test attempt",
        )
    assert social_summary(offer_id=offer.id)["comments"] == []


def test_reports_are_private_idempotent_and_authors_can_delete_their_comment(
    offer, members, moderator
):
    comment = submit_comment(
        actor_id=members[1].id,
        offer_id=offer.id,
        body="Which dates apply?",
        operation_id=uuid.uuid4(),
    )
    moderate_comment(
        actor_id=moderator.id,
        comment_id=comment.id,
        expected_version=1,
        decision="approved",
        reason="Safe question",
    )
    first = report_comment(
        actor_id=members[2].id, comment_id=comment.id, reason="Please review tone."
    )
    assert (
        report_comment(
            actor_id=members[2].id, comment_id=comment.id, reason="Please review tone."
        ).id
        == first.id
    )
    assert CommentReport.objects.count() == 1
    assert "reports" not in social_summary(offer_id=offer.id)["comments"][0]
    with pytest.raises(DomainError):
        delete_comment(actor_id=members[2].id, comment_id=comment.id)
    delete_comment(actor_id=members[1].id, comment_id=comment.id)
    delete_comment(actor_id=members[1].id, comment_id=comment.id)
    assert social_summary(offer_id=offer.id)["comments"] == []


def test_moderation_requires_fresh_step_up_and_version_and_forbids_self_review(offer, moderator):
    comment = submit_comment(
        actor_id=moderator.id,
        offer_id=offer.id,
        body="Which dates apply?",
        operation_id=uuid.uuid4(),
    )
    with pytest.raises(DomainError) as error:
        moderate_comment(
            actor_id=moderator.id,
            comment_id=comment.id,
            expected_version=1,
            decision="approved",
            reason="Safe question",
        )
    assert error.value.status_code == 403
    moderator.staff_step_up_until = None
    moderator.save()
    client = APIClient()
    client.force_authenticate(moderator)
    assert client.get("/api/v1/admin/offer-comments").status_code == 403


def test_calculator_uses_canonical_disclosure_without_changing_offer_terms(offer):
    offer.refresh_from_db()
    original = dict(offer.terms)
    result = preview_offer(
        offer_id=offer.id, principal=100000, installment_count=6, frequency="weekly"
    )
    assert result["simulation_only"] and result["application_uses_original_terms"]
    assert result["terms"]["principal"] == 100000
    assert len(result["disclosure"]["schedule"]) == 6
    assert (
        sum(line["total"] for line in result["disclosure"]["schedule"])
        == result["disclosure"]["total_repayment"]
    )
    offer.refresh_from_db()
    assert offer.terms == original


@pytest.mark.parametrize(
    "principal,count,frequency",
    [(1, 3, "monthly"), (2000000, 3, "monthly"), (100000, 25, "monthly"), (100000, 3, "maturity")],
)
def test_calculator_rejects_out_of_limits_or_inconsistent_terms(offer, principal, count, frequency):
    with pytest.raises(DomainError):
        preview_offer(
            offer_id=offer.id, principal=principal, installment_count=count, frequency=frequency
        )


def test_public_api_and_mutations_use_real_authorization_and_cache_boundaries(offer, members):
    client = APIClient()
    response = client.get(f"/api/v1/engagement/offers/{offer.id}")
    assert response.status_code == 200 and response["Cache-Control"] == "private, no-store"
    assert (
        client.put(
            f"/api/v1/engagement/offers/{offer.id}/like", {"liked": True}, format="json"
        ).status_code
        == 403
    )
    client.force_authenticate(members[1])
    assert (
        client.put(
            f"/api/v1/engagement/offers/{offer.id}/like", {"liked": True}, format="json"
        ).data["count"]
        == 1
    )
    assert (
        client.get(
            f"/api/v1/engagement/offers/{offer.id}/calculator?principal=100000&installment_count=3&frequency=monthly"
        ).status_code
        == 200
    )
    assert (
        client.put(
            f"/api/v1/engagement/offers/{offer.id}/like", {"liked": "yes"}, format="json"
        ).status_code
        == 400
    )
