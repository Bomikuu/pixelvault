from agreements.disclosures import build_disclosure
from config.errors import DomainError
from django.db import transaction
from django.utils import timezone

from .models import LendingOffer, LoanApplication
from .offers import eligible, fingerprint, terms_for_amount


def apply_to_offer(
    *,
    borrower_id,
    offer_id,
    requested_terms=None,
    principal=None,
    operation_id,
    purpose="",
    summary=None,
):
    if summary is not None and not isinstance(summary, dict):
        raise DomainError("invalid_summary", "Application summary must be an object.")
    principal = requested_terms.principal if requested_terms is not None else principal
    digest = fingerprint(
        {
            "borrower": str(borrower_id),
            "offer": str(offer_id),
            "principal": principal,
            "purpose": purpose,
            "summary": summary or {},
        }
    )
    existing = LoanApplication.objects.filter(operation_id=operation_id).first()
    if existing:
        if existing.payload_hash != digest:
            raise DomainError(
                "operation_conflict", "Operation key already has different input.", 409
            )
        return existing
    with transaction.atomic():
        from django.shortcuts import get_object_or_404

        offer = get_object_or_404(LendingOffer.objects.select_for_update(), pk=offer_id)
        existing = LoanApplication.objects.filter(operation_id=operation_id).first()
        if existing:
            if existing.payload_hash != digest:
                raise DomainError(
                    "operation_conflict", "Operation key already has different input.", 409
                )
            return existing
        if offer.lender_id == borrower_id:
            raise DomainError("self_loan", "You cannot apply to your own offer.")
        if offer.status != "published" or offer.expires_at <= timezone.now():
            raise DomainError("offer_unavailable", "This offer is no longer available.", 409)
        eligible(borrower_id, "apply")
        if LoanApplication.objects.filter(
            offer=offer, borrower_id=borrower_id, status__in=["submitted", "reviewing", "selected"]
        ).exists():
            raise DomainError("active_application", "You already have an active application.", 409)
        terms = terms_for_amount(offer, principal)
        if requested_terms and requested_terms.to_dict() != terms.to_dict():
            raise DomainError(
                "client_terms", "Only server-defined offer terms can be requested.", 409
            )
        safe_summary = {
            key: str(value)[:200]
            for key, value in (summary or {}).items()
            if key in {"employment_type", "income_band", "repayment_experience"}
        }
        return LoanApplication.objects.create(
            offer=offer,
            borrower_id=borrower_id,
            terms=terms.to_dict(),
            disclosure=build_disclosure(terms),
            purpose=purpose[:500],
            summary=safe_summary,
            operation_id=operation_id,
            payload_hash=digest,
        )
