from .models import OutboxMessage


def enqueue_event(*, kind, subject_id, payload, dedupe_key):
    return OutboxMessage.objects.get_or_create(
        dedupe_key=dedupe_key, defaults={"kind": kind, "subject_id": subject_id, "payload": payload}
    )[0].pk


def recover_pending_work(*, at=None, limit=100):
    """Dispatch only known local handlers; never send unapproved notifications."""
    completed = 0
    for event in OutboxMessage.objects.filter(status="pending").order_by("created_at")[:limit]:
        try:
            if event.kind == "awards.evaluate":
                from community.awards import evaluate_awards

                evaluate_awards(member_id=event.subject_id, rule_version="v1")
                event.status = "completed"
                event.last_error = ""
                completed += 1
            else:
                event.last_error = "HANDLER_REQUIRES_CONFIGURATION"
        except Exception:
            # One invalid/retired subject cannot strand unrelated durable work.
            # Never copy exception messages or personal payloads into logs/metadata.
            event.last_error = "LOCAL_HANDLER_FAILED"
        event.attempts += 1
        if event.status == "pending" and event.attempts >= 8:
            event.status = "failed"
        event.save()
    return {
        "completed": completed,
        "pending": OutboxMessage.objects.filter(status="pending").count(),
    }
