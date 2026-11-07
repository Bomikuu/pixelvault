from celery import shared_task


@shared_task
def clean_call_signaling():
    from .calls import prune_calls

    prune_calls()
