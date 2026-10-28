from celery import shared_task

from .reviews import publish_eligible_reviews


@shared_task
def publish_reviews():
    return {"published": publish_eligible_reviews()}
