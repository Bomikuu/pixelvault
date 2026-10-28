from celery import shared_task
from django.utils import timezone

from .reservations import expire_reservations


@shared_task
def release_expired_reservations():
    return expire_reservations(at=timezone.now())
