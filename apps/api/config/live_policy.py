from config.errors import DomainError


def assert_live_origination_allowed(*, member_id, routing_id, policy_id, at=None):
    """No approved live model or individual-lender movement adapter is shipped."""
    raise DomainError(
        "LIVE_ORIGINATION_NOT_APPROVED",
        "Live lending requires verified legal eligibility and approved individual-lender disbursement and settlement arrangements.",
        403,
    )
