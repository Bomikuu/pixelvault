from unittest.mock import patch
from uuid import uuid4

import pytest

from audit.models import OutboxMessage
from audit.outbox import enqueue_event, recover_pending_work

pytestmark = pytest.mark.django_db


def test_bad_subject_does_not_strand_other_durable_work():
    first = OutboxMessage.objects.create(
        kind="awards.evaluate", subject_id=uuid4(), dedupe_key="bad-subject"
    )
    second = OutboxMessage.objects.create(
        kind="awards.evaluate", subject_id=uuid4(), dedupe_key="good-subject"
    )
    with patch("community.awards.evaluate_awards", side_effect=[ValueError("private"), None]):
        result = recover_pending_work()
    first.refresh_from_db()
    second.refresh_from_db()
    assert result == {"completed": 1, "pending": 1}
    assert first.status == "pending"
    assert first.last_error == "LOCAL_HANDLER_FAILED"
    assert "private" not in first.last_error
    assert second.status == "completed"


def test_unknown_handler_is_bounded_and_never_silently_completed():
    event = OutboxMessage.objects.create(
        kind="unconfigured.delivery", subject_id=uuid4(), dedupe_key="unknown"
    )
    for _ in range(9):
        recover_pending_work()
    event.refresh_from_db()
    assert event.status == "failed"
    assert event.attempts == 8
    assert event.last_error == "HANDLER_REQUIRES_CONFIGURATION"


def test_enqueue_retry_preserves_original_payload():
    subject = uuid4()
    first = enqueue_event(kind="awards.evaluate", subject_id=subject, payload={}, dedupe_key="same")
    again = enqueue_event(
        kind="awards.evaluate", subject_id=subject, payload={"retry": True}, dedupe_key="same"
    )
    assert first == again
    assert OutboxMessage.objects.get(pk=first).payload == {}
