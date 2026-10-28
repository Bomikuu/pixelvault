from datetime import timedelta

from config.errors import DomainError
from django.db import transaction
from django.utils import timezone
from marketplace.models import LendingOffer, OfferReservation
from marketplace.offers import eligible
from servicing.models import Disbursement, Loan

from agreements.disclosures import build_disclosure
from agreements.policy import policy_for_terms
from agreements.schedule import generate_due_dates
from agreements.types import LoanTerms

from .canonical import canonical_hash
from .models import AgreementVersion


def renew_effective_date(*, loan_id, actor_id, effective_date, operation_id):
    old_loan = Loan.objects.select_related("agreement__reservation").get(pk=loan_id)
    if old_loan.lender_id != actor_id:
        raise DomainError("not_found", "Loan not found.", 404)
    with transaction.atomic():
        offer = LendingOffer.objects.select_for_update().get(
            pk=old_loan.agreement.reservation.offer_id
        )
        reservation = OfferReservation.objects.select_for_update().get(
            pk=old_loan.agreement.reservation_id
        )
        old = AgreementVersion.objects.select_for_update().get(pk=old_loan.agreement_id)
        loan = Loan.objects.select_for_update().get(pk=loan_id)
        existing = AgreementVersion.objects.filter(
            canonical__renewal_operation_id=str(operation_id)
        ).first()
        if existing:
            if (
                existing.canonical.get("replaces_agreement_id") != str(old.id)
                or existing.canonical.get("renewal_effective_date") != effective_date.isoformat()
                or existing.canonical.get("renewal_actor_id") != str(actor_id)
            ):
                raise DomainError(
                    "operation_conflict", "Renewal operation already has different input.", 409
                )
            return existing
        if (
            loan.status != "awaiting_disbursement"
            or old.state != "accepted"
            or reservation.status != "committed"
        ):
            raise DomainError(
                "renewal_unavailable", "Only an accepted unfunded agreement can be renewed.", 409
            )
        if Disbursement.objects.filter(loan=loan).exclude(status="failed").exists():
            raise DomainError(
                "transfer_reconciliation_required",
                "Resolve the original transfer before changing the signed date.",
                409,
            )
        if not timezone.localdate() <= effective_date <= timezone.localdate() + timedelta(days=30):
            raise DomainError("renewal_date", "Choose today or a date within the next 30 days.")
        eligible(loan.lender_id, "accept")
        eligible(loan.borrower_id, "accept")
        data = dict(old.terms)
        data["effective_date"] = effective_date.isoformat()
        data["due_dates"] = [
            x.isoformat()
            for x in generate_due_dates(
                effective_date=effective_date,
                frequency=data["frequency"],
                count=data["installment_count"],
            )
        ]
        terms = LoanTerms.from_dict(data)
        policy_for_terms(terms)
        canonical = {
            **old.canonical,
            "terms": terms.to_dict(),
            "disclosure": build_disclosure(terms),
            "replaces_agreement_id": str(old.id),
            "renewal_operation_id": str(operation_id),
            "renewal_actor_id": str(actor_id),
            "renewal_effective_date": effective_date.isoformat(),
        }
        latest_version = (
            reservation.agreements.order_by("-version").values_list("version", flat=True).first()
            or old.version
        )
        replacement = AgreementVersion.objects.create(
            reservation=reservation,
            lender_id=loan.lender_id,
            borrower_id=loan.borrower_id,
            version=latest_version + 1,
            terms=canonical["terms"],
            disclosure=canonical["disclosure"],
            canonical=canonical,
            hash=canonical_hash(canonical),
            template_version=old.template_version,
        )
        old.state = "superseded"
        old.save(update_fields=["state", "updated_at"])
        loan.status = "cancelled_before_disbursement"
        loan.closed_at = timezone.now()
        loan.save(update_fields=["status", "closed_at", "updated_at"])
        reservation.status = "reserved"
        reservation.expires_at = timezone.now() + timedelta(hours=24)
        reservation.save(update_fields=["status", "expires_at", "updated_at"])
        offer.committed_amount -= reservation.principal
        offer.reserved_amount += reservation.principal
        offer.status = "published"
        offer.save(update_fields=["committed_amount", "reserved_amount", "status", "updated_at"])
        return replacement
