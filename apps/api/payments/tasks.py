from celery import shared_task

from .inbox import apply_event
from .models import EventInbox, PaymentRoutingProfile
from .recovery import recover_events


@shared_task
def retry_inbox():
    for identifier in EventInbox.objects.filter(
        state__in=["received", "awaiting_mapping", "awaiting_collection"]
    ).values_list("id", flat=True)[:200]:
        try:
            apply_event(inbox_id=identifier)
        except Exception as error:
            EventInbox.objects.filter(pk=identifier).update(reason=type(error).__name__[:100])


@shared_task
def recover_routes():
    for identifier in PaymentRoutingProfile.objects.filter(
        approved=True, environment="test"
    ).values_list("id", flat=True):
        try:
            recover_events(routing_id=identifier)
        except Exception:
            # Each route retains its durable cursor/inbox; one unavailable
            # integration must not prevent the other routes from recovering.
            continue
