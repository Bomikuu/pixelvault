from agreements.disclosures import build_disclosure
from agreements.policy import policy_for_terms
from agreements.schedule import generate_due_dates
from agreements.types import LoanTerms, integer
from config.errors import DomainError
from marketplace.offers import terms_for_amount

from .services import offer_for


def preview_offer(*, offer_id, actor_id=None, principal, installment_count=None, frequency=None):
    offer = offer_for(offer_id, actor_id)
    integer(principal, "principal", 1)
    available = offer.declared_amount - offer.reserved_amount - offer.committed_amount
    if principal > available:
        raise DomainError(
            "capacity_unavailable", "The preview amount exceeds currently available capacity.", 409
        )
    original = terms_for_amount(offer, principal)
    policy = policy_for_terms(original)
    count = (
        original.installment_count
        if installment_count is None
        else integer(installment_count, "installment_count", 1)
    )
    frequency = original.frequency if frequency is None else frequency
    if (
        count > min(24, policy.rules["max_installments"])
        or frequency not in policy.rules["allowed_frequencies"]
    ):
        raise DomainError(
            "preview_limits", "Choose a frequency and term within the reviewed calculation limits."
        )
    value = original.to_dict()
    value.update(
        frequency=frequency,
        installment_count=count,
        due_dates=[
            day.isoformat()
            for day in generate_due_dates(
                effective_date=original.effective_date, frequency=frequency, count=count
            )
        ],
    )
    terms = LoanTerms.from_dict(value)
    policy_for_terms(terms)
    return {
        "terms": terms.to_dict(),
        "disclosure": build_disclosure(terms),
        "simulation_only": count != original.installment_count or frequency != original.frequency,
        "application_uses_original_terms": True,
        "original_terms": {
            "frequency": original.frequency,
            "installment_count": original.installment_count,
        },
        "limits": {
            "min_amount": offer.min_amount,
            "max_amount": min(offer.max_amount, available),
            "max_installments": min(24, policy.rules["max_installments"]),
            "frequencies": policy.rules["allowed_frequencies"],
        },
        "notice": "A preview does not change the offer. Applications use the lender's original frequency and installment count; both parties still review and accept the final agreement.",
    }
