import json

import pytest
from django.db import DatabaseError
from django.utils import timezone
from rest_framework.test import APIClient

from community.activity import public_revision, recent_posts, stream_events

pytestmark = pytest.mark.django_db


def test_recent_post_feed_exposes_only_current_public_offers(offer, members):
    client = APIClient()
    response = client.get("/api/v1/community/activity")
    assert response.status_code == 200
    assert response["Cache-Control"] == "no-store"
    assert response.data["posts"][0]["id"] == str(offer.id)
    assert response.data["posts"][0]["lender"]["handle"] == members[0].username
    body = json.dumps(response.data)
    assert members[0].email not in body
    assert "application" not in body
    assert "income" not in body
    assert response.data["posts"][0]["area"]["approximate"] is True
    offer.status = "draft"
    offer.save()
    assert recent_posts()["posts"] == []


def test_revision_changes_for_post_availability_and_removal(offer):
    before = public_revision()
    offer.reserved_amount = offer.declared_amount // 2
    offer.save()
    changed = public_revision()
    assert changed != before
    offer.reserved_amount = offer.declared_amount
    offer.save()
    assert public_revision() != changed
    assert recent_posts()["posts"] == []


def test_private_capacity_transition_and_internal_timestamp_do_not_emit_activity(offer):
    offer.reserved_amount = offer.declared_amount // 2
    offer.save()
    before = public_revision()
    offer.committed_amount = offer.reserved_amount
    offer.reserved_amount = 0
    offer.save()
    assert public_revision() == before
    offer.save()  # updated_at changes without changing anything public.
    assert public_revision() == before


@pytest.mark.parametrize("reason", ["expired", "suspended", "inactive", "unknown_area"])
def test_unavailable_people_and_unsupported_areas_never_enter_feed(offer, members, reason):
    if reason == "expired":
        offer.expires_at = timezone.now()
    elif reason == "unknown_area":
        offer.area = "a private residence"
    else:
        setattr(
            members[0], "suspended" if reason == "suspended" else "is_active", reason == "suspended"
        )
        members[0].save()
    offer.save()
    assert recent_posts()["posts"] == []


def test_stream_pushes_real_changes_once_and_bounds_connection():
    elapsed = [0]
    revisions = iter(["first", "second", "second", "second"])
    frames = list(
        stream_events(
            snapshot=lambda: next(revisions),
            clock=lambda: elapsed[0],
            pause=lambda seconds: elapsed.__setitem__(0, elapsed[0] + seconds),
            duration=5,
            interval=2,
        )
    )
    assert len(frames) == 2
    assert "event: ready" in frames[0] and '"first"' in frames[0]
    assert "retry: 3000" in frames[0]
    assert "event: offers.changed" in frames[1] and '"second"' in frames[1]
    assert elapsed[0] == 6


def test_stream_failure_does_not_expose_database_details():
    def unavailable():
        raise DatabaseError("private database connection detail")

    frames = list(stream_events(snapshot=unavailable))
    assert len(frames) == 1
    assert "stream.unavailable" in frames[0]
    assert "private" not in frames[0]


def test_browser_eventsource_accept_header_receives_unbuffered_stream(offer):
    response = APIClient().get("/api/v1/community/activity/stream", HTTP_ACCEPT="text/event-stream")
    assert response.status_code == 200
    assert response.streaming
    assert response["Content-Type"].startswith("text/event-stream")
    assert response["X-Accel-Buffering"] == "no"
    assert "no-store" in response["Cache-Control"]
    assert b"event: ready" in next(iter(response.streaming_content))
    response.close()
