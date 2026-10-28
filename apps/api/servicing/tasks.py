from celery import shared_task
from django.utils import timezone

from .accrual import accrue_to
from .models import Loan


@shared_task
def accrue_active_loans():
    for identifier in Loan.objects.filter(status="active").values_list("id", flat=True).iterator():
        accrue_to(loan_id=identifier, through=timezone.localdate())
