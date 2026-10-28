from dataclasses import dataclass

from config.errors import DomainError
from django.db import transaction
from django.utils import timezone
from marketplace.models import LendingOffer, OfferReservation
from marketplace.offers import eligible

from .canonical import canonical_hash
from .models import Acceptance, AgreementVersion


@dataclass(frozen=True)
class AcceptanceResult:
    agreement_id: str
    state: str
    loan_id: str | None


def prepare_agreement(*, reservation_id, actor_id, template_version="unreviewed-demo-v1"):
    reservation = OfferReservation.objects.select_related("offer", "application").get(
        pk=reservation_id
    )
    if actor_id not in {reservation.offer.lender_id, reservation.application.borrower_id}:
        raise DomainError("not_found", "Agreement not found.", 404)
    with transaction.atomic():
        LendingOffer.objects.select_for_update().get(pk=reservation.offer_id)
        latest = reservation.agreements.order_by("-version").first()
        if latest and latest.template_version == template_version:
            return latest
        if latest and latest.state == "accepted":
            raise DomainError(
                "amendment_required",
                "Accepted agreements require a separately reviewed amendment.",
                409,
            )
        if latest:
            latest.state = "superseded"
            latest.save(update_fields=["state", "updated_at"])
        value = {
            "lender_id": str(reservation.offer.lender_id),
            "borrower_id": str(reservation.application.borrower_id),
            "lender_display_name": reservation.offer.lender.display_name,
            "borrower_display_name": reservation.application.borrower.display_name,
            "terms": reservation.application.terms,
            "disclosure": reservation.application.disclosure,
            "template_version": template_version,
            "policy_version": reservation.application.terms["policy_version"],
            "test_mode": True,
        }
        return AgreementVersion.objects.create(
            reservation=reservation,
            lender_id=reservation.offer.lender_id,
            borrower_id=reservation.application.borrower_id,
            terms=value["terms"],
            disclosure=value["disclosure"],
            canonical=value,
            hash=canonical_hash(value),
            template_version=template_version,
            version=1 if latest is None else latest.version + 1,
        )


def accept_agreement(*, member_id, agreement_id, expected_hash, operation_id, at=None):
    from servicing.models import Loan

    at = at or timezone.now()
    preliminary = AgreementVersion.objects.select_related("reservation").get(pk=agreement_id)
    if member_id not in {preliminary.lender_id, preliminary.borrower_id}:
        raise DomainError("not_found", "Agreement not found.", 404)
    with transaction.atomic():
        from negotiations.models import Room
        from negotiations.services import both_approved, evidence_reviewed, require_both

        meeting = (
            Room.objects.select_for_update()
            .filter(application_id=preliminary.reservation.application_id)
            .first()
        )
        if meeting and preliminary.state != "accepted":
            if (
                meeting.agreement_id != preliminary.id
                or meeting.state != "negotiating"
                or not both_approved(meeting)
                or not evidence_reviewed(meeting)
            ):
                raise DomainError(
                    "meeting_required",
                    "Review and accept the exact current agreement in your meeting room.",
                    409,
                )
            require_both(meeting)
        offer = LendingOffer.objects.select_for_update().get(pk=preliminary.reservation.offer_id)
        reservation = OfferReservation.objects.select_for_update().get(
            pk=preliminary.reservation_id
        )
        agreement = AgreementVersion.objects.select_for_update().get(pk=agreement_id)
        if member_id not in {agreement.lender_id, agreement.borrower_id}:
            raise DomainError("not_found", "Agreement not found.", 404)
        if expected_hash != agreement.hash:
            raise DomainError("stale_agreement", "Terms changed. Review the current document.", 409)
        existing = Acceptance.objects.filter(operation_id=operation_id).first()
        if existing and (
            existing.agreement_id != agreement.id
            or existing.member_id != member_id
            or existing.hash != expected_hash
        ):
            raise DomainError("operation_conflict", "Operation key has different input.", 409)
        if agreement.state == "accepted":
            return AcceptanceResult(str(agreement.id), "accepted", str(agreement.loan.id))
        if (
            agreement.state != "awaiting_acceptance"
            or reservation.status != "reserved"
            or reservation.expires_at <= at
        ):
            raise DomainError(
                "agreement_expired", "This agreement is no longer available for acceptance.", 409
            )
        from .policy import policy_for_terms
        from .types import LoanTerms

        policy_for_terms(LoanTerms.from_dict(agreement.terms))
        eligible(agreement.lender_id, "accept", at)
        eligible(agreement.borrower_id, "accept", at)
        Acceptance.objects.get_or_create(
            agreement=agreement,
            member_id=member_id,
            defaults={"hash": expected_hash, "operation_id": operation_id, "accepted_at": at},
        )
        loan = None
        if agreement.acceptances.count() == 2:
            agreement.state = "accepted"
            agreement.save(update_fields=["state", "updated_at"])
            reservation.status = "committed"
            reservation.save(update_fields=["status", "updated_at"])
            offer.reserved_amount -= reservation.principal
            offer.committed_amount += reservation.principal
            if offer.committed_amount == offer.declared_amount:
                offer.status = "exhausted"
            offer.save(
                update_fields=["reserved_amount", "committed_amount", "status", "updated_at"]
            )
            loan, _ = Loan.objects.get_or_create(
                agreement=agreement,
                defaults={"lender_id": agreement.lender_id, "borrower_id": agreement.borrower_id},
            )
        return AcceptanceResult(str(agreement.id), agreement.state, str(loan.id) if loan else None)
