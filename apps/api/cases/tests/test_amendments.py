import pytest
from agreements.schedule import generate_due_dates
from agreements.types import LoanTerms
from config.errors import DomainError
from django.utils import timezone

from cases.amendments import accept_amendment, propose_amendment

pytestmark = pytest.mark.django_db


def proposed_terms(loan):
    today = timezone.localdate()
    return LoanTerms(
        loan.principal_balance,
        "PHP",
        600,
        "monthly",
        4,
        today,
        generate_due_dates(effective_date=today, frequency="monthly", count=4),
    ).to_dict()


def test_amendment_requires_both_acceptances_and_preserves_original(loan, members):
    original = dict(loan.agreement.terms)
    proposal = propose_amendment(
        actor_id=members[1].id,
        loan_id=loan.id,
        terms=proposed_terms(loan),
        reason="Temporary income disruption",
    )
    accept_amendment(
        actor_id=members[1].id, proposal_id=proposal.id, proposal_hash=proposal.proposal_hash
    )
    loan.refresh_from_db()
    assert not loan.active_amendment_id
    accept_amendment(
        actor_id=members[0].id, proposal_id=proposal.id, proposal_hash=proposal.proposal_hash
    )
    loan.refresh_from_db()
    loan.agreement.refresh_from_db()
    proposal.refresh_from_db()
    assert loan.active_amendment_id == proposal.id
    assert proposal.status == "active"
    assert loan.agreement.terms == original
    assert loan.principal_balance == original["principal"]
    assert loan.ledger.filter(kind="amendment_activated").count() == 1
    accept_amendment(
        actor_id=members[0].id, proposal_id=proposal.id, proposal_hash=proposal.proposal_hash
    )
    assert loan.ledger.filter(kind="amendment_activated").count() == 1


def test_no_automatic_capitalization_or_rollover(loan, members):
    terms = proposed_terms(loan)
    terms["principal"] += 100
    with pytest.raises(DomainError):
        propose_amendment(
            actor_id=members[1].id, loan_id=loan.id, terms=terms, reason="Proposed capitalization"
        )
    assert not loan.active_amendment_id


def test_withdrawn_proposal_allows_fresh_review_and_keeps_signatures(loan, members):
    from cases.amendments import withdraw_amendment

    proposal = propose_amendment(
        actor_id=members[1].id,
        loan_id=loan.id,
        terms=proposed_terms(loan),
        reason="Temporary disruption",
    )
    accept_amendment(
        actor_id=members[1].id, proposal_id=proposal.id, proposal_hash=proposal.proposal_hash
    )
    withdraw_amendment(actor_id=members[0].id, proposal_id=proposal.id)
    proposal.refresh_from_db()
    assert proposal.status == "withdrawn"
    assert proposal.acceptances.count() == 1
    assert (
        propose_amendment(
            actor_id=members[1].id,
            loan_id=loan.id,
            terms=proposed_terms(loan),
            reason="Fresh review",
        ).id
        != proposal.id
    )


def test_amendment_discloses_preserved_interest_and_does_not_capitalize_it(loan, members):
    from servicing.models import LedgerEntry

    loan.interest_balance = 500
    loan.save()
    LedgerEntry.objects.create(
        loan=loan,
        kind="interest_accrued",
        interest_delta=500,
        amount=500,
        source_key="synthetic-preserved-interest",
        effective_at=timezone.now(),
    )
    proposal = propose_amendment(
        actor_id=members[1].id,
        loan_id=loan.id,
        terms=proposed_terms(loan),
        reason="Review preserved interest",
    )
    assert proposal.disclosures["preserved_accrued_interest"] == 500
    assert (
        proposal.disclosures["total_remaining_obligation"]
        == proposal.disclosures["total_repayment"] + 500
    )
    for member in members[:2]:
        accept_amendment(
            actor_id=member.id, proposal_id=proposal.id, proposal_hash=proposal.proposal_hash
        )
    loan.refresh_from_db()
    assert loan.principal_balance == proposal.terms["principal"]
    assert loan.interest_balance == 500
