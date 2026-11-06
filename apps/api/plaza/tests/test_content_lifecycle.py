import uuid
from datetime import timedelta
import pytest
from django.utils import timezone
from config.errors import DomainError
from plaza.bubbles import publish_bubble, visible_bubbles, clear_bubble
from plaza.models import Bubble
from plaza.projections import snapshot
from plaza.moderation import report_bubble, moderate_bubble, moderation_queue
from plaza.tasks import purge_expired_bubbles
from community.models import ContentReport

pytestmark = pytest.mark.django_db(transaction=True)


def test_replaced_and_cleared_bubbles_do_not_reappear(owner):
    first = publish_bubble(**owner,body="First",offer_id=None,operation_id=uuid.uuid4())
    second = publish_bubble(**owner,body="Second",offer_id=None,operation_id=uuid.uuid4())
    assert set(visible_bubbles([first.id,second.id],timezone.now())) == {str(second.id)}
    clear_bubble(**owner)
    assert visible_bubbles([first.id,second.id],timezone.now()) == {}


def test_idempotent_bubble_replay_never_duplicates(owner):
    operation = uuid.uuid4()
    first = publish_bubble(**owner,body="Hello",offer_id=None,operation_id=operation)
    assert publish_bubble(**owner,body="Hello",offer_id=None,operation_id=operation).id == first.id
    with pytest.raises(DomainError):
        publish_bubble(**owner,body="Changed",offer_id=None,operation_id=operation)
    assert Bubble.objects.count() == 1


def test_six_post_limit_does_not_reset_when_bubbles_are_replaced(owner):
    for i in range(6):
        publish_bubble(**owner,body=str(i),offer_id=None,operation_id=uuid.uuid4())
    with pytest.raises(DomainError) as error:
        publish_bubble(**owner,body="Seventh",offer_id=None,operation_id=uuid.uuid4())
    assert error.value.status_code == 429


def test_attachment_rechecks_city_and_current_availability(owner,offer):
    offer.area="Manila";offer.save(update_fields=["area"])
    with pytest.raises(DomainError):
        publish_bubble(**owner,body="My offer",offer_id=offer.id,operation_id=uuid.uuid4())
    offer.area="Quezon City";offer.save(update_fields=["area"])
    publish_bubble(**owner,body="My offer",offer_id=offer.id,operation_id=uuid.uuid4())
    offer.status="withdrawn";offer.save(update_fields=["status"])
    state=snapshot(actor_id=owner["actor_id"],session_key=owner["session_key"],room_slug=owner["room_slug"],instance_id=owner["instance_id"])
    assert state["participants"][0]["bubble"]["offer_id"] is None


def test_moderation_is_versioned_audited_and_never_republishes_expired_text(owner,members):
    bubble=publish_bubble(**owner,body="Review this",offer_id=None,operation_id=uuid.uuid4())
    report_bubble(actor_id=owner["actor_id"],session_key=owner["session_key"],bubble_id=bubble.id,reason="Synthetic report")
    moderator=members[2];moderator.is_staff=True;moderator.staff_role="moderator";moderator.save()
    assert moderation_queue(moderator.id)["bubbles"][0]["id"] == str(bubble.id)
    moderate_bubble(actor_id=moderator.id,bubble_id=bubble.id,expected_version=1,decision="remove",reason="Synthetic decision")
    assert visible_bubbles([bubble.id],timezone.now()) == {}
    with pytest.raises(DomainError):
        moderate_bubble(actor_id=moderator.id,bubble_id=bubble.id,expected_version=1,decision="keep",reason="Stale")


def test_retention_keeps_unresolved_report_evidence(owner,monkeypatch):
    bubble=publish_bubble(**owner,body="Evidence",offer_id=None,operation_id=uuid.uuid4())
    report=ContentReport.objects.create(reporter_id=owner["actor_id"],content_type="plaza_bubble",content_id=bubble.id,reason="Open report")
    future=timezone.now()+timedelta(days=9)
    monkeypatch.setattr("plaza.tasks.timezone.now",lambda:future)
    purge_expired_bubbles()
    assert Bubble.objects.filter(pk=bubble.id).exists()
    report.status="resolved";report.save()
    purge_expired_bubbles()
    assert not Bubble.objects.filter(pk=bubble.id).exists()
