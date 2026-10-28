from config.errors import DomainError
from django.conf import settings
from eligibility.models import ProductPolicy


def policy_for_terms(terms):
    policy = ProductPolicy.objects.filter(
        version=terms.policy_version, environment=settings.ENVIRONMENT, approved=True
    ).first()
    if not policy or not policy.evidence_ref or settings.ENVIRONMENT != "test":
        raise DomainError(
            "unapproved_policy",
            "An explicitly reviewed test policy is required. Live origination remains disabled.",
            403,
        )
    rules = policy.rules
    required = {
        "min_principal",
        "max_principal",
        "max_annual_rate_bps",
        "max_installments",
        "allowed_frequencies",
        "commission_bps",
    }
    if not required.issubset(rules) or any(
        type(rules[key]) is not int for key in required - {"allowed_frequencies"}
    ):
        raise DomainError(
            "incomplete_policy", "The selected policy has incomplete calculation limits.", 403
        )
    if (
        not rules["min_principal"] <= terms.principal <= rules["max_principal"]
        or terms.annual_rate_bps > rules["max_annual_rate_bps"]
        or terms.installment_count > rules["max_installments"]
        or terms.frequency not in rules["allowed_frequencies"]
    ):
        raise DomainError(
            "policy_limits", "Proposed terms fall outside the selected reviewed policy.", 400
        )
    if not 0 <= rules["commission_bps"] <= 10000:
        raise DomainError("invalid_policy", "Invalid disclosed commission policy.")
    return policy
