from datetime import timedelta

import pytest
from agreements.disclosures import build_disclosure
from agreements.schedule import generate_due_dates
from agreements.types import LoanTerms
from cases.models import AmendmentAcceptance, AmendmentProposal
from config.errors import DomainError
from django.utils import timezone

from servicing.accrual import accrue_to
from servicing.amendments import activate_amendment
from servicing.projections import get_loan_projection

pytestmark = pytest.mark.django_db


def proposal_for(loan, members, effective):
    terms = LoanTerms(
        loan.principal_balance,
        "PHP",
        600,
        "monthly",
        3,
        effective,
        generate_due_dates(effective_date=effective, frequency="monthly", count=3),
    )
    disclosure = build_disclosure(terms)
    disclosure.update(
        preserved_accrued_interest=loan.interest_balance,
        total_remaining_obligation=disclosure["total_repayment"] + loan.interest_balance,
        preserved_interest_due="immediately under original agreement; allocated before principal",
    )
    proposal = AmendmentProposal.objects.create(
        loan_id=loan.id,
        proposed_by=members[1],
        terms=terms.to_dict(),
        disclosures=disclosure,
        original_agreement_hash=loan.agreement.hash,
        proposal_hash="a" * 64,
        reason="Synthetic hardship",
    )
    for member in members[:2]:
        AmendmentAcceptance.objects.create(
            proposal=proposal, member=member, proposal_hash=proposal.proposal_hash
        )
    return proposal


def test_amendment_preserves_principal_interest_and_original(funded, members, monkeypatch):
    effective = timezone.localdate() + timedelta(days=10)
    accrue_to(loan_id=funded.id, through=effective)
    funded.refresh_from_db()
    interest = funded.interest_balance
    original = dict(funded.agreement.terms)
    proposal = proposal_for(funded, members, effective)
    monkeypatch.setattr(timezone, "localdate", lambda: effective)
    activate_amendment(proposal=proposal)
    funded.refresh_from_db()
    assert funded.principal_balance == 1000000
    assert funded.interest_balance == interest and interest > 0
    assert funded.active_terms["annual_rate_bps"] == 600
    assert funded.agreement.terms == original
    assert funded.active_amendment_id == proposal.id
    assert funded.ledger.filter(kind="amendment_activated").count() == 1
    activate_amendment(proposal=proposal)
    assert funded.ledger.filter(kind="amendment_activated").count() == 1
    assert funded.commission.amount == 20000


def test_stale_balance_and_hidden_interest_block_amendment(funded, members):
    proposal = proposal_for(funded, members, timezone.localdate())
    proposal.disclosures["preserved_accrued_interest"] = 1
    with pytest.raises(DomainError):
        proposal.save()
    with pytest.raises(DomainError):
        activate_amendment(proposal=proposal)
    funded.refresh_from_db()
    assert funded.active_amendment_id is None


def test_future_projection_uses_equal_principal(funded):
    projection = get_loan_projection(loan_id=funded.id)
    assert projection["projected_interest"] == funded.agreement.disclosure["total_interest"]
    assert projection["accrued_interest"] == 0
