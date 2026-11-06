from community.models import ContentReport
from community.permissions import staff_for
from community.messaging import clean_text
from audit.services import record_audit
from config.errors import DomainError
from django.db import transaction
from .models import Bubble
from .presence import room_state


def report_bubble(*, actor_id, session_key, bubble_id, reason):
    try:
        bubble = Bubble.objects.get(pk=bubble_id)
    except Bubble.DoesNotExist:
        raise DomainError("not_found", "This bubble is no longer available to report.", 404) from None
    room_state(actor_id=actor_id, session_key=session_key, room_slug=bubble.room_slug)
    # A report may arrive after its 60-second public display; evidence is retained.
    recent = ContentReport.objects.filter(reporter_id=actor_id, content_type="plaza_bubble", content_id=bubble_id, status="open").first()
    if recent:
        return recent
    return ContentReport.objects.create(reporter_id=actor_id, content_type="plaza_bubble", content_id=bubble_id, reason=clean_text(reason, 2000))


def moderation_queue(actor_id):
    staff_for(actor_id, ("moderator",))
    reports = list(ContentReport.objects.filter(content_type="plaza_bubble", status="open").order_by("created_at")[:100])
    ids = [r.content_id for r in reports]
    bubbles = Bubble.objects.filter(pk__in=ids).select_related("author").order_by("created_at")
    return {"bubbles": [{"id": str(b.id), "body": b.body, "room_slug": b.room_slug, "author_handle": b.author.username,
        "status": b.status, "version": b.version, "created_at": b.created_at.isoformat(), "visible_until": b.visible_until.isoformat(),
        "reports": [{"id": str(r.id), "reason": r.reason} for r in reports if r.content_id == b.id]} for b in bubbles], "limit": 100}


@transaction.atomic
def moderate_bubble(*, actor_id, bubble_id, expected_version, decision, reason):
    staff_for(actor_id, ("moderator",))
    try:
        bubble = Bubble.objects.select_for_update().get(pk=bubble_id)
    except Bubble.DoesNotExist:
        raise DomainError("not_found", "This moderation record is unavailable.", 404) from None
    if bubble.author_id == actor_id:
        raise DomainError("self_review", "Another moderator must review your own content.", 403)
    if bubble.version != expected_version:
        raise DomainError("stale_version", "Refresh this bubble before recording a decision.", 409)
    if decision not in ("remove", "keep"):
        raise DomainError("invalid_decision", "Choose remove or keep.")
    reason = clean_text(reason, 2000)
    if decision == "remove":
        bubble.status = "removed"
    bubble.version += 1
    bubble.save(update_fields=["status", "version", "updated_at"])
    ContentReport.objects.filter(content_type="plaza_bubble", content_id=bubble.id, status="open").update(status="resolved")
    record_audit(actor_id=actor_id, action="plaza.bubble."+decision, subject_id=bubble.id, reason=reason)
    return bubble
