from celery import shared_task

from .outbox import recover_pending_work


@shared_task
def recover_local_events():
    return recover_pending_work(limit=100)
