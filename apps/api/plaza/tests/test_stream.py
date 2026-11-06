from datetime import timedelta
import pytest
from django.contrib.sessions.models import Session
from django.utils import timezone
from plaza.stream import room_events

pytestmark=pytest.mark.django_db(transaction=True)


def test_stream_bounds_duration_without_exposing_lease(owner):
    Session.objects.create(session_key=owner["session_key"],session_data="",expire_date=timezone.now()+timedelta(hours=1))
    elapsed=[0]
    def pause(seconds):elapsed[0]+=seconds
    output="".join(room_events(actor_id=owner["actor_id"],session_key=owner["session_key"],room_slug=owner["room_slug"],clock=lambda:elapsed[0],pause=pause))
    assert elapsed[0] == 45
    assert "event: plaza.changed" in output
    assert owner["lease"] not in output


def test_expired_session_ends_stream(owner):
    output="".join(room_events(actor_id=owner["actor_id"],session_key=owner["session_key"],room_slug=owner["room_slug"]))
    assert '"reason":"session_expired"' in output
