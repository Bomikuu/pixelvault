"""Recovery delivery runs outside the public request, including in test mode."""

import secrets
from datetime import timedelta
from celery import shared_task
from django.conf import settings
from django.db import transaction
from django.utils import timezone
from .models import Member, PasswordRecovery, RecoveryEmail


@shared_task(ignore_result=True)
def send_recovery(email):
    from .recovery import deliver, digest

    with transaction.atomic():
        member = (
            Member.objects.select_for_update().filter(email__iexact=email, is_active=True).first()
        )
        if (
            not member
            or not RecoveryEmail.objects.filter(
                member=member, verified_email=member.email, verified_at__isnull=False
            ).exists()
            or PasswordRecovery.objects.filter(
                member=member, created_at__gte=timezone.now() - timedelta(minutes=1)
            ).exists()
        ):
            return
        token = secrets.token_urlsafe(32)
        row = PasswordRecovery.objects.create(
            member=member,
            token_digest=digest(token),
            password_fingerprint=digest(member.password),
            email_at_issue=member.email,
            expires_at=timezone.now() + timedelta(minutes=30),
        )
        recipient = member.email
    url = f"{settings.FRONTEND_URL}/reset-password/{row.id}#token={token}"
    deliver(
        recipient,
        "Reset your PixelVault password",
        f"A password reset was requested for your PixelVault account.\n\n{url}\n\nThis one-time link expires in 30 minutes. If you did not request it, ignore this email. No password has changed.",
    )
