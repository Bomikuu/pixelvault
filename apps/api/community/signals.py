"""Durable local achievement work. Facts and their outbox record commit together."""

import uuid

from audit.outbox import enqueue_event
from django.db.models.signals import post_save
from django.dispatch import receiver


def queue(member_id, source):
    enqueue_event(
        kind="awards.evaluate",
        subject_id=member_id,
        payload={"rule_version": "v1"},
        dedupe_key=f"awards:{member_id}:{source}",
    )


@receiver(post_save, sender="servicing.LedgerEntry", dispatch_uid="community.ledger_awards")
def ledger_awards(sender, instance, created, **kwargs):
    if created:
        queue(instance.loan.borrower_id, f"ledger:{instance.id}")
        queue(instance.loan.lender_id, f"ledger:{instance.id}")


@receiver(
    post_save, sender="verification.VerificationCase", dispatch_uid="community.verification_awards"
)
def verification_awards(sender, instance, **kwargs):
    queue(instance.member_id, f"verification:{instance.id}:{instance.version}:{instance.status}")


@receiver(post_save, sender="community.Contribution", dispatch_uid="community.contribution_awards")
def contribution_awards(sender, instance, **kwargs):
    queue(instance.member_id, f"contribution:{instance.id}:{instance.version}:{instance.status}")


@receiver(post_save, sender="accounts.Member", dispatch_uid="community.literacy_awards")
def literacy_awards(sender, instance, update_fields=None, **kwargs):
    if update_fields and "literacy_completed" in update_fields:
        queue(instance.id, f"literacy:{instance.literacy_completed}:{uuid.uuid4()}")
