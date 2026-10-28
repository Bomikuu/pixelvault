"""A public offer feed and bounded server-sent updates; never private activity."""

import hashlib
import json
import time

from django.db import DatabaseError, close_old_connections
from django.db.models import F
from django.http import StreamingHttpResponse
from django.utils import timezone
from rest_framework.permissions import AllowAny
from rest_framework.renderers import BaseRenderer, JSONRenderer
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .locations import AREAS, coarse_area
from .profiles import public_identity


def visible_offers():
    from marketplace.models import LendingOffer

    return LendingOffer.objects.filter(
        status="published",
        expires_at__gt=timezone.now(),
        declared_amount__gt=F("reserved_amount") + F("committed_amount"),
        lender__is_active=True,
        lender__suspended=False,
        area__in=[*AREAS, *(area["code"] for area in AREAS.values())],
    ).order_by("-created_at", "-id")


def public_revision():
    # All inputs describe public offers. No applications, messages, documents,
    # borrower activity, payment events or exact member locations enter this feed.
    facts = list(
        visible_offers()
        .annotate(available=F("declared_amount") - F("reserved_amount") - F("committed_amount"))
        .values(
            "id",
            "title",
            "area",
            "created_at",
            "available",
            "min_amount",
            "max_amount",
            "terms",
            "disclosure",
            "expires_at",
        )[:1000]
    )
    # A reservation becoming a funded commitment is a private transition when
    # the public availability stays the same. Internal counters/timestamps must
    # not turn that into an observable public event.
    return hashlib.sha256(json.dumps(facts, default=str, sort_keys=True).encode()).hexdigest()


def recent_posts(*, limit=8):
    rows = []
    for offer in visible_offers().select_related("lender")[:limit]:
        rows.append(
            {
                "id": str(offer.id),
                "title": offer.title,
                "lender": public_identity(offer.lender),
                "area": coarse_area(area_code=offer.area),
                "created_at": offer.created_at.isoformat(),
            }
        )
    return {"posts": rows, "revision": public_revision()}


def event_frame(kind, data):
    return f"event: {kind}\ndata: {json.dumps(data, separators=(',', ':'))}\n\n"


def stream_events(*, snapshot=None, clock=None, pause=None, duration=45, interval=2):
    """Recheck public revisions, push only changes, and bound each connection.

    A fresh connection always receives the current revision, allowing a client
    to catch up after a disconnect. There is no invented activity or counter.
    """
    snapshot = snapshot or public_revision
    clock, pause = clock or time.monotonic, pause or time.sleep
    started = clock()
    try:
        revision = snapshot()
        yield "retry: 3000\n\n" + event_frame("ready", {"revision": revision})
        heartbeat = started
        while clock() - started < duration:
            pause(interval)
            close_old_connections()
            current = snapshot()
            if current != revision:
                revision = current
                yield event_frame("offers.changed", {"revision": current})
            if clock() - heartbeat >= 15:
                yield ": keep-alive\n\n"
                heartbeat = clock()
    except DatabaseError:
        yield event_frame("stream.unavailable", {"code": "temporarily_unavailable"})
    finally:
        close_old_connections()


class EventStreamRenderer(BaseRenderer):
    media_type = "text/event-stream"
    format = "event-stream"

    def render(self, data, accepted_media_type=None, renderer_context=None):
        return event_frame("stream.unavailable", {"code": "request_unavailable"}).encode()


class ActivityView(APIView):
    permission_classes = (AllowAny,)
    authentication_classes = ()
    throttle_classes = (ScopedRateThrottle,)
    throttle_scope = "community_activity"

    def get(self, request):
        response = Response(recent_posts())
        response["Cache-Control"] = "no-store"
        return response


class ActivityStreamView(APIView):
    permission_classes = (AllowAny,)
    authentication_classes = ()
    renderer_classes = (EventStreamRenderer, JSONRenderer)
    throttle_classes = (ScopedRateThrottle,)
    throttle_scope = "community_stream"

    def get(self, request):
        response = StreamingHttpResponse(stream_events(), content_type="text/event-stream")
        response["Cache-Control"] = "no-cache, no-store, no-transform"
        response["X-Accel-Buffering"] = "no"
        return response
