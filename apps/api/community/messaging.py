from datetime import timedelta

from config.errors import DomainError
from django.db import transaction
from django.utils import timezone

from .domain import loan_for
from .models import ContentReport, Message, Thread
from .permissions import member_for


def clean_text(body, maximum=4000):
    if (
        not isinstance(body, str)
        or not body.strip()
        or len(body) > maximum
        or any(ord(c) < 32 and c not in "\n\t" for c in body)
    ):
        raise DomainError("invalid_text", f"Enter plain text between 1 and {maximum} characters.")
    return body.strip()


@transaction.atomic
def ensure_thread(*, actor_id, loan_id=None, application_id=None):
    member_for(actor_id)
    if bool(loan_id) == bool(application_id):
        raise DomainError("invalid_context", "Choose one application or loan.")
    if loan_id:
        loan = loan_for(loan_id, actor_id)
        context = {"loan_id": loan.id}
        participants = [loan.lender_id, loan.borrower_id]
    else:
        from marketplace.models import LoanApplication

        try:
            application = LoanApplication.objects.select_related("offer").get(pk=application_id)
        except (LoanApplication.DoesNotExist, ValueError):
            raise DomainError("not_found", "Record not found.", 404)
        participants = [application.borrower_id, application.offer.lender_id]
        if actor_id not in participants:
            raise DomainError("not_found", "Record not found.", 404)
        context = {"application_id": application.id}
    thread, created = Thread.objects.get_or_create(**context)
    if created:
        thread.participants.set(participants)
    return thread


def thread_for(*, actor_id, thread_id):
    try:
        return Thread.objects.get(pk=thread_id, participants__id=actor_id)
    except (Thread.DoesNotExist, ValueError):
        raise DomainError("not_found", "Record not found.", 404)


@transaction.atomic
def send_message(*, actor_id, thread_id, body, operation_id):
    member = member_for(actor_id)
    thread = thread_for(actor_id=actor_id, thread_id=thread_id)
    body = clean_text(body)
    type(member).objects.select_for_update().get(pk=actor_id)
    previous = Message.objects.filter(sender_id=actor_id, operation_id=operation_id).first()
    if previous:
        if previous.thread_id != thread.id or previous.body != body:
            raise DomainError(
                "idempotency_conflict", "This operation key was used for a different message.", 409
            )
        return previous
    if (
        Message.objects.filter(
            sender_id=actor_id, created_at__gte=timezone.now() - timedelta(minutes=1)
        ).count()
        >= 20
    ):
        raise DomainError("rate_limited", "Please wait before sending more messages.", 429)
    return Message.objects.create(
        thread=thread, sender_id=actor_id, body=body, operation_id=operation_id
    )


def report_content(*, actor_id, content_type, content_id, reason):
    member_for(actor_id)
    if content_type == "message":
        try:
            message = Message.objects.get(pk=content_id)
        except (Message.DoesNotExist, ValueError):
            raise DomainError("not_found", "Record not found.", 404)
        thread_for(actor_id=actor_id, thread_id=message.thread_id)
    elif content_type == "review":
        from .models import Review

        if not Review.objects.filter(
            pk=content_id, status="approved", published_at__isnull=False
        ).exists():
            raise DomainError("not_found", "Record not found.", 404)
    else:
        raise DomainError("invalid_content", "Only messages or published reviews can be reported.")
    return ContentReport.objects.create(
        reporter_id=actor_id,
        content_type=content_type,
        content_id=content_id,
        reason=clean_text(reason, 2000),
    )
