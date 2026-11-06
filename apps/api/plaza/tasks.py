from datetime import timedelta
from celery import shared_task
from django.utils import timezone
from community.models import ContentReport
from .models import Bubble


@shared_task
def purge_expired_bubbles():
    unresolved = ContentReport.objects.filter(content_type="plaza_bubble", status="open").values("content_id")
    count, _ = Bubble.objects.filter(visible_until__lt=timezone.now()-timedelta(days=7)).exclude(pk__in=unresolved).delete()
    return count
