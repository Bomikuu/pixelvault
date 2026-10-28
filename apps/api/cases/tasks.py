from celery import shared_task

from .notices import schedule_notices


@shared_task
def capture_due_notices():
    return schedule_notices()
