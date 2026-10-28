from urllib.parse import parse_qs, urlparse

from config.errors import DomainError

from .contracts import RecoveryResult
from .inbox import apply_event, persist_event
from .models import EventInbox, PaymentRoutingProfile
from .pixelflow import client_for


def next_offset(*, routing, url):
    if not url:
        return None
    target, expected = urlparse(url), urlparse(routing.base_url.rstrip("/") + "/events")
    if (target.scheme, target.netloc, target.path.rstrip("/")) != (
        expected.scheme,
        expected.netloc,
        expected.path.rstrip("/"),
    ):
        raise DomainError(
            "recovery_pagination_scope",
            "Provider pagination URL has an unexpected origin or path.",
            503,
        )
    query = parse_qs(target.query)
    try:
        offset = int(query["offset"][0])
        limit = int(query.get("limit", ["100"])[0])
    except (KeyError, ValueError, TypeError):
        raise DomainError("recovery_contract", "Invalid provider pagination offset.", 503) from None
    if offset < 0 or not 1 <= limit <= 100:
        raise DomainError("recovery_contract", "Provider pagination exceeds bounded limits.", 503)
    return offset


def recover_events(*, routing_id, cursor=None, max_pages=10):
    routing = PaymentRoutingProfile.objects.get(pk=routing_id)
    try:
        offset = int(cursor if cursor is not None else routing.recovery_cursor or 0)
    except (TypeError, ValueError):
        raise DomainError(
            "recovery_cursor", "Recovery checkpoint must be a nonnegative event offset."
        ) from None
    if offset < 0:
        raise DomainError(
            "recovery_cursor", "Recovery checkpoint must be a nonnegative event offset."
        )
    count, more, seen = 0, False, set()
    for _ in range(max_pages):
        if offset in seen:
            raise DomainError("recovery_cursor_loop", "Provider repeated an event offset.", 503)
        seen.add(offset)
        response = client_for(routing).list_events(limit=100, offset=offset)
        events = response.get("results")
        if not isinstance(events, list) or type(response.get("count")) is not int:
            raise DomainError(
                "recovery_contract", "PixelFlow event-list pagination contract is invalid.", 503
            )
        for event in events:
            inbox = persist_event(routing=routing, event=event)
            apply_event(inbox_id=inbox.id)
            count += 1
        following = next_offset(routing=routing, url=response.get("next"))
        more = following is not None
        checkpoint = following if more else 0
        routing.recovery_cursor = str(checkpoint)
        routing.save(update_fields=["recovery_cursor", "updated_at"])
        offset = checkpoint
        if not more:
            break
    for inbox in EventInbox.objects.filter(
        routing=routing, state__in=["awaiting_mapping", "awaiting_collection", "received"]
    ).order_by("created_at")[:200]:
        apply_event(inbox_id=inbox.id)
    return RecoveryResult(count, str(offset), more)
