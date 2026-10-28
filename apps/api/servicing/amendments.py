from agreements.disclosures import build_disclosure
from agreements.types import LoanTerms
from config.errors import DomainError
from django.db import transaction
from django.utils import timezone

from .accrual import accrue_locked
from .models import LedgerEntry, Loan


def active_terms_for(loan):
    return loan.active_terms or loan.agreement.terms


def active_disclosure_for(loan):
    return loan.active_disclosure or loan.agreement.disclosure


def activate_amendment(*, proposal):
    """Activate an exact, mutually accepted proposal without rewriting the original."""
    from cases.models import AmendmentAcceptance

    with transaction.atomic():
        loan = Loan.objects.select_for_update().select_related("agreement").get(pk=proposal.loan_id)
        if loan.active_amendment_id == proposal.id:
            return loan
        accepted = set(
            AmendmentAcceptance.objects.filter(
                proposal=proposal, proposal_hash=proposal.proposal_hash
            ).values_list("member_id", flat=True)
        )
        if accepted != {loan.lender_id, loan.borrower_id}:
            raise DomainError(
                "amendment_acceptance_required",
                "Both named parties must accept this exact amendment.",
                409,
            )
        terms = LoanTerms.from_dict(proposal.terms)
        from agreements.policy import policy_for_terms

        policy_for_terms(terms)
        if loan.status != "active" or terms.principal != loan.principal_balance:
            raise DomainError(
                "amendment_balance_changed",
                "Review fresh terms for the current outstanding principal.",
                409,
            )
        if terms.effective_date != timezone.localdate() or (
            loan.accrued_through and terms.effective_date < loan.accrued_through
        ):
            raise DomainError(
                "amendment_effective_date",
                "Amendment must take effect today without backdating financial facts.",
                409,
            )
        if terms.borrower_fees or terms.lender_fees:
            raise DomainError(
                "amendment_fee",
                "Amendments cannot create another origination commission or new fees.",
            )
        accrue_locked(loan, terms.effective_date)
        disclosure = build_disclosure(terms)
        disclosure.update(
            preserved_accrued_interest=loan.interest_balance,
            total_remaining_obligation=disclosure["total_repayment"] + loan.interest_balance,
            preserved_interest_due="immediately under original agreement; allocated before principal",
        )
        if proposal.disclosures != disclosure:
            raise DomainError(
                "amendment_disclosure", "Review the server-calculated amendment disclosures.", 409
            )
        loan.active_terms = terms.to_dict()
        loan.active_disclosure = disclosure
        loan.active_amendment_id = proposal.id
        loan.save(
            update_fields=["active_terms", "active_disclosure", "active_amendment_id", "updated_at"]
        )
        LedgerEntry.objects.create(
            loan=loan,
            kind="amendment_activated",
            source_key=f"amendment:{proposal.id}",
            effective_at=timezone.now(),
            metadata={
                "proposal_id": str(proposal.id),
                "original_agreement_hash": loan.agreement.hash,
                "accrued_interest_preserved": loan.interest_balance,
            },
        )
        return loan
