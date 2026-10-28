import uuid

import pytest
from config.errors import DomainError

from community.messaging import ensure_thread, report_content, send_message, thread_for
from community.models import Message

pytestmark = pytest.mark.django_db


def test_only_thread_participants_can_read_or_send(loan, members):
    thread = ensure_thread(actor_id=members[0].id, loan_id=loan.id)
    for fn in (
        lambda: thread_for(actor_id=members[2].id, thread_id=thread.id),
        lambda: send_message(
            actor_id=members[2].id, thread_id=thread.id, body="guess", operation_id=uuid.uuid4()
        ),
    ):
        with pytest.raises(DomainError) as error:
            fn()
        assert error.value.status_code == 404


def test_duplicate_send_key_does_not_duplicate_message(loan, members):
    thread = ensure_thread(actor_id=members[1].id, loan_id=loan.id)
    operation = uuid.uuid4()
    a = send_message(
        actor_id=members[1].id, thread_id=thread.id, body="Hello", operation_id=operation
    )
    b = send_message(
        actor_id=members[1].id, thread_id=thread.id, body="Hello", operation_id=operation
    )
    assert a.id == b.id
    assert Message.objects.count() == 1
    with pytest.raises(DomainError):
        send_message(
            actor_id=members[1].id, thread_id=thread.id, body="Changed", operation_id=operation
        )


def test_message_report_does_not_grant_outsider_access(loan, members):
    thread = ensure_thread(actor_id=members[1].id, loan_id=loan.id)
    message = send_message(
        actor_id=members[1].id, thread_id=thread.id, body="Private", operation_id=uuid.uuid4()
    )
    with pytest.raises(DomainError):
        report_content(
            actor_id=members[2].id, content_type="message", content_id=message.id, reason="guess"
        )
