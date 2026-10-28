import hashlib
import json

from community.domain import loan_for
from community.messaging import clean_text
from community.permissions import member_for
from config.errors import DomainError
from django.db import transaction
from django.utils import timezone

from .models import AmendmentAcceptance, AmendmentProposal


@transaction.atomic
def propose_amendment(*, actor_id, loan_id, terms, reason, case_id=None):
    from agreements.disclosures import build_disclosure
    from agreements.types import LoanTerms

    member_for(actor_id)
    loan = loan_for(loan_id, actor_id)
    from servicing.models import Loan

    loan = Loan.objects.select_for_update().select_related("agreement").get(pk=loan.id)
    if loan.status != "active" or loan.disbursement_status != "confirmed":
        raise DomainError("inactive_loan", "Only an active loan can have a hardship proposal.", 409)
    if AmendmentProposal.objects.filter(
        loan_id=loan.id, status__in=["awaiting_acceptance", "agreed_pending_activation"]
    ).exists():
        raise DomainError("pending_proposal", "Resolve the existing proposal first.", 409)
    if not isinstance(terms, dict):
        raise DomainError("invalid_terms", "Provide structured proposed terms.")
    if terms.get("borrower_fees") or terms.get("lender_fees"):
        raise DomainError("amendment_fees", "Hardship amendments cannot add fees.")
    if terms.get("principal") != loan.principal_balance:
        raise DomainError(
            "no_capitalization",
            "The proposed principal must equal outstanding principal; interest cannot be capitalized.",
        )
    from servicing.accrual import accrue_locked

    accrue_locked(loan, timezone.localdate())
    reason = clean_text(reason, 4000)
    # Reuse the same deterministic disclosure engine; do not edit the signed agreement.
    try:
        parsed_terms = LoanTerms.from_dict(terms)
        if parsed_terms.effective_date != timezone.localdate():
            raise DomainError(
                "amendment_effective_date",
                "An amendment proposal must take effect today without backdating.",
            )
        disclosure = build_disclosure(parsed_terms)
        disclosure.update(
            preserved_accrued_interest=loan.interest_balance,
            total_remaining_obligation=disclosure["total_repayment"] + loan.interest_balance,
            preserved_interest_due="immediately under original agreement; allocated before principal",
        )
    except (TypeError, ValueError, KeyError):
        raise DomainError("invalid_terms", "Provide complete supported loan terms.")
    canonical = {
        "loan_id": str(loan.id),
        "original_hash": loan.agreement.hash,
        "terms": terms,
        "disclosure": disclosure,
        "reason": reason,
    }
    proposal_hash = hashlib.sha256(
        json.dumps(canonical, sort_keys=True, separators=(",", ":")).encode()
    ).hexdigest()
    if case_id:
        from .services import case_for

        case = case_for(actor_id=actor_id, case_id=case_id)
        if case.loan_id != loan.id:
            raise DomainError("wrong_case", "The case must belong to this loan.")
    return AmendmentProposal.objects.create(
        loan_id=loan.id,
        case_id=case_id,
        proposed_by_id=actor_id,
        terms=terms,
        disclosures=disclosure,
        original_agreement_hash=loan.agreement.hash,
        proposal_hash=proposal_hash,
        reason=reason,
    )


@transaction.atomic
def accept_amendment(*, actor_id, proposal_id, proposal_hash):
    member_for(actor_id)
    try:
        proposal = AmendmentProposal.objects.select_for_update().get(pk=proposal_id)
    except (AmendmentProposal.DoesNotExist, ValueError):
        raise DomainError("not_found", "Record not found.", 404)
    loan = loan_for(proposal.loan_id, actor_id)
    if (
        proposal.proposal_hash != proposal_hash
        or proposal.original_agreement_hash != loan.agreement.hash
    ):
        raise DomainError(
            "hash_mismatch", "Review the current exact proposal before accepting.", 409
        )
    if (
        proposal.status == "active"
        and proposal.acceptances.filter(member_id=actor_id, proposal_hash=proposal_hash).exists()
    ):
        return proposal
    if proposal.status not in ("awaiting_acceptance", "agreed_pending_activation"):
        raise DomainError(
            "closed_proposal", "This proposal is no longer accepting signatures.", 409
        )
    AmendmentAcceptance.objects.get_or_create(
        proposal=proposal, member_id=actor_id, defaults={"proposal_hash": proposal_hash}
    )
    if proposal.acceptances.count() == 2:
        from servicing.amendments import activate_amendment

        activate_amendment(proposal=proposal)
        proposal.status = "active"
        proposal.save(update_fields=["status", "updated_at"])
    return proposal


@transaction.atomic
def withdraw_amendment(*, actor_id, proposal_id):
    member_for(actor_id)
    try:
        proposal = AmendmentProposal.objects.select_for_update().get(pk=proposal_id)
    except (AmendmentProposal.DoesNotExist, ValueError):
        raise DomainError("not_found", "Record not found.", 404)
    loan_for(proposal.loan_id, actor_id)
    if proposal.status == "withdrawn":
        return proposal
    if proposal.status != "awaiting_acceptance":
        raise DomainError(
            "active_amendment",
            "An active agreement requires a new mutually accepted proposal.",
            409,
        )
    proposal.status = "withdrawn"
    proposal.version += 1
    proposal.save(update_fields=["status", "version", "updated_at"])
    return proposal
