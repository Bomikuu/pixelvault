from datetime import timedelta

from config.errors import DomainError
from django.db import transaction
from django.utils import timezone

from .models import LendingOffer, LoanApplication, OfferReservation
from .offers import eligible, fingerprint


def expire_locked(offer, at):
    expired = list(
        OfferReservation.objects.select_for_update().filter(
            offer=offer, status="reserved", expires_at__lte=at
        )
    )
    for reservation in expired:
        reservation.status = "expired"
        reservation.save(update_fields=["status", "updated_at"])
        LoanApplication.objects.filter(pk=reservation.application_id).update(status="expired")
        reservation.agreements.filter(state="awaiting_acceptance").update(state="expired")
    offer.reserved_amount -= sum(x.principal for x in expired)
    if expired:
        offer.save(update_fields=["reserved_amount", "updated_at"])
    return len(expired)


def select_application(*, lender_id, application_id, expected_offer_version, operation_id, at=None):
    at = at or timezone.now()
    from django.shortcuts import get_object_or_404

    application = get_object_or_404(LoanApplication, pk=application_id)
    digest = fingerprint(
        {
            "lender": str(lender_id),
            "application": str(application_id),
            "version": expected_offer_version,
        }
    )
    with transaction.atomic():
        offer = LendingOffer.objects.select_for_update().get(pk=application.offer_id)
        existing = OfferReservation.objects.filter(operation_id=operation_id).first()
        if existing:
            if existing.payload_hash != digest:
                raise DomainError(
                    "operation_conflict", "Operation key already has different input.", 409
                )
            return existing
        if offer.lender_id != lender_id:
            raise DomainError("not_found", "Application not found.", 404)
        expire_locked(offer, at)
        application.refresh_from_db()
        if expected_offer_version != offer.version:
            raise DomainError("offer_changed", "Review the current offer version.", 409)
        if (
            application.status not in {"submitted", "reviewing"}
            or offer.status != "published"
            or offer.expires_at <= at
        ):
            raise DomainError(
                "application_unavailable", "This application cannot be selected.", 409
            )
        eligible(lender_id, "accept", at)
        eligible(application.borrower_id, "accept", at)
        principal = application.terms["principal"]
        if principal > offer.declared_amount - offer.reserved_amount - offer.committed_amount:
            raise DomainError(
                "capacity_unavailable", "Insufficient uncommitted offer capacity.", 409
            )
        reservation = OfferReservation.objects.create(
            offer=offer,
            application=application,
            principal=principal,
            expires_at=at + timedelta(hours=24),
            operation_id=operation_id,
            payload_hash=digest,
        )
        offer.reserved_amount += principal
        offer.save(update_fields=["reserved_amount", "updated_at"])
        application.status = "selected"
        application.save(update_fields=["status", "updated_at"])
        from agreements.acceptance import prepare_agreement

        prepare_agreement(reservation_id=reservation.pk, actor_id=lender_id)
        return reservation


def expire_reservations(*, at=None):
    total, at = 0, at or timezone.now()
    for offer_id in (
        OfferReservation.objects.filter(status="reserved", expires_at__lte=at)
        .values_list("offer_id", flat=True)
        .distinct()
    ):
        with transaction.atomic():
            total += expire_locked(LendingOffer.objects.select_for_update().get(pk=offer_id), at)
    return total
