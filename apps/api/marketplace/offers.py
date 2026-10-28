import hashlib
import json
from datetime import timedelta

from agreements.disclosures import build_disclosure
from agreements.types import LoanTerms, integer
from config.errors import DomainError
from django.conf import settings
from django.utils import timezone

from .models import LendingOffer


def fingerprint(value):
    return hashlib.sha256(
        json.dumps(value, sort_keys=True, separators=(",", ":"), default=str).encode()
    ).hexdigest()


def eligible(member_id, purpose, at=None):
    from eligibility.services import check_eligibility

    decision = check_eligibility(member_id=member_id, purpose=purpose, at=at or timezone.now())
    allowed = decision.get("allowed") if isinstance(decision, dict) else decision.allowed
    reasons = decision.get("reasons", []) if isinstance(decision, dict) else decision.reasons
    if not allowed:
        raise DomainError(
            "ineligible", "Eligibility review required: " + ", ".join(str(x) for x in reasons), 403
        )
    if settings.ENVIRONMENT != "test":
        raise DomainError(
            "live_origination_disabled",
            "Live lending has no approved money-movement arrangement.",
            403,
        )
    return decision


def publish_offer(
    *,
    lender_id,
    terms,
    declared_amount,
    operation_id,
    title="Community lending offer",
    area="Quezon City",
    min_amount=10000,
    max_amount=None,
):
    from agreements.policy import policy_for_terms

    policy = policy_for_terms(terms)
    expected_fee = (terms.principal * policy.rules["commission_bps"] + 5000) // 10000
    if (
        terms.borrower_fees
        or sum(f.amount for f in terms.lender_fees if f.code == "platform_commission_demo")
        != expected_fee
        or any(f.code != "platform_commission_demo" for f in terms.lender_fees)
    ):
        raise DomainError(
            "policy_fees",
            "Offer fees must match the explicitly reviewed lender-paid commission policy.",
        )
    integer(declared_amount, "declared_amount", 1)
    integer(min_amount, "min_amount", 1)
    max_amount = declared_amount if max_amount is None else integer(max_amount, "max_amount", 1)
    if max_amount > declared_amount or min_amount > max_amount or terms.principal > max_amount:
        raise DomainError("invalid_limits", "Offer limits exceed declared capacity.")
    payload = {
        "lender": str(lender_id),
        "terms": terms.to_dict(),
        "declared": declared_amount,
        "min": min_amount,
        "max": max_amount,
        "title": title,
        "area": area,
    }
    digest = fingerprint(payload)
    existing = LendingOffer.objects.filter(operation_id=operation_id).first()
    if existing:
        if existing.payload_hash != digest:
            raise DomainError(
                "operation_conflict", "Operation key already has different input.", 409
            )
        return existing
    eligible(lender_id, "post_offer")
    return LendingOffer.objects.create(
        lender_id=lender_id,
        title=title,
        area=area,
        declared_amount=declared_amount,
        min_amount=min_amount,
        max_amount=max_amount,
        terms=terms.to_dict(),
        disclosure=build_disclosure(terms),
        status="published",
        expires_at=timezone.now() + timedelta(days=30),
        operation_id=operation_id,
        payload_hash=digest,
    )


def terms_for_amount(offer, principal):
    integer(principal, "principal", 1)
    if not offer.min_amount <= principal <= offer.max_amount:
        raise DomainError("invalid_amount", "Requested amount is outside this offer's limits.")
    value = dict(offer.terms)
    value["principal"] = principal
    # Demonstration commission policy is lender-paid and never withheld from proceeds.
    from agreements.policy import policy_for_terms

    policy = policy_for_terms(LoanTerms.from_dict(value))
    value["lender_fees"] = [
        {
            "code": "platform_commission_demo",
            "amount": (principal * policy.rules["commission_bps"] + 5000) // 10000,
            "timing": "upfront",
        }
    ]
    return LoanTerms.from_dict(value)
