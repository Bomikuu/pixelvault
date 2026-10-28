from zoneinfo import ZoneInfo

from config.errors import DomainError
from django.db import transaction
from django.utils import timezone

from .models import Notice, NoticePreference


@transaction.atomic
def schedule_notices(*, at=None):
    from servicing.models import Loan

    at = at or timezone.now()
    if timezone.is_naive(at):
        raise DomainError("timezone_required", "Use a timezone-aware notice time.")
    local = at.astimezone(ZoneInfo("Asia/Manila"))
    if not 8 <= local.hour < 20:
        return {"created": 0, "deferred": "quiet_hours", "adapter": "local_capture"}
    created_count = 0
    for loan in Loan.objects.select_related("agreement", "borrower").filter(
        status="active", disbursement_status="confirmed"
    ):
        # Only an actual loan party is eligible; references and guarantors are never inferred.
        preference = NoticePreference.objects.filter(member=loan.borrower).first()
        if preference and not preference.debt_reminders:
            continue
        from servicing.projections import get_loan_projection

        projection = get_loan_projection(loan_id=loan.id, as_of=at)
        due_date = projection["next_due_date"]
        if (
            not due_date
            or due_date > local.date().isoformat()
            or projection["next_installment_due"] <= 0
        ):
            continue
        channel = preference.channel if preference else "in_app"
        if channel not in ("in_app", "email", "sms"):
            continue
        _, created = Notice.objects.get_or_create(
            member=loan.borrower,
            local_date=local.date(),
            kind="payment_reminder",
            defaults={
                "loan_id": loan.id,
                "channel": channel,
                "body": "A scheduled payment needs your attention. Review your private loan dashboard or request support.",
                "status": "captured",
            },
        )
        created_count += created
    return {"created": created_count, "deferred": None, "adapter": "local_capture"}
