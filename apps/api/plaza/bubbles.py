import hashlib
import json
import re
from datetime import timedelta
from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import F
from django.utils import timezone
from config.errors import DomainError
from .models import Bubble
from .presence import active, control
from .rooms import room_for


def normalize_body(raw):
    if not isinstance(raw, str):
        raise DomainError("invalid_text", "Write a short plain-text bubble.")
    body = re.sub(r"[\r\n]+", " ", raw).strip()
    if not body or len(body) > 120 or any(ord(c) < 32 or ord(c) == 127 for c in body):
        raise DomainError("invalid_text", "Use 1–120 characters without control characters.")
    return body


def eligible_offers():
    from marketplace.models import LendingOffer
    return LendingOffer.objects.filter(status="published", expires_at__gt=timezone.now(),
        declared_amount__gt=F("reserved_amount") + F("committed_amount"), lender__is_active=True, lender__suspended=False)


@transaction.atomic
def publish_bubble(*, actor_id, session_key, instance_id, lease, room_slug, body, offer_id, operation_id):
    active(actor_id)
    get_user_model().objects.select_for_update().get(pk=actor_id)
    body = normalize_body(body)
    payload = {"body": body, "offer_id": str(offer_id) if offer_id else None, "room_slug": room_slug}
    fingerprint = hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()
    # Validate ownership even on replay; an old operation must not reclaim a replaced bubble.
    current = control(actor_id=actor_id, session_key=session_key, instance_id=instance_id, lease=lease, room_slug=room_slug, action="heartbeat")["membership"]
    old = Bubble.objects.filter(author_id=actor_id, operation_id=operation_id).first()
    if old:
        if old.fingerprint != fingerprint:
            raise DomainError("idempotency_conflict", "This operation belongs to a different bubble.", 409)
        if current.get("bubble_id") != str(old.id) or old.status != "visible" or old.visible_until <= timezone.now():
            raise DomainError("bubble_expired", "That bubble is no longer visible. Write a new one if needed.", 409)
        return old
    if Bubble.objects.filter(author_id=actor_id, created_at__gte=timezone.now()-timedelta(minutes=1)).count() >= 6:
        raise DomainError("rate_limited", "You can post six bubbles per minute. Wait a moment; your text is kept.", 429)
    if offer_id and not eligible_offers().filter(pk=offer_id, lender_id=actor_id, area=room_for(room_slug)["area"]["name"]).exists():
        raise DomainError("offer_unavailable", "Attach your own available offer in this city, or post without an offer.", 409)
    bubble = Bubble.objects.create(author_id=actor_id, body=body, offer_id=offer_id, operation_id=operation_id,
        fingerprint=fingerprint, room_slug=room_slug, visible_until=timezone.now()+timedelta(seconds=60))
    control(actor_id=actor_id, session_key=session_key, instance_id=instance_id, lease=lease, room_slug=room_slug, action="attach", bubble_id=str(bubble.id))
    Bubble.objects.filter(author_id=actor_id, status="visible").exclude(pk=bubble.pk).update(status="cleared", version=F("version")+1)
    return bubble


@transaction.atomic
def clear_bubble(**owner):
    active(owner["actor_id"])
    get_user_model().objects.select_for_update().get(pk=owner["actor_id"])
    current = control(**owner, action="heartbeat")["membership"]
    control(**owner, action="attach", bubble_id=None)
    if current.get("bubble_id"):
        Bubble.objects.filter(pk=current["bubble_id"], author_id=owner["actor_id"], status="visible").update(status="cleared", version=F("version")+1)


def visible_bubbles(ids, now):
    return {str(b.id): b for b in Bubble.objects.filter(pk__in=ids, status="visible", visible_until__gt=now).select_related("offer")}
