"""Private factual relationship summaries. No popularity score or public risk record."""

from config.errors import DomainError
from django.db.models import Q

from .permissions import member_for


def repayment_summary(*, actor_id, member_id, purpose):
    from servicing.models import Loan

    member_for(actor_id)
    member_for(member_id)
    loans = Loan.objects.filter(
        Q(borrower_id=member_id) | Q(lender_id=member_id), disbursement_status="confirmed"
    )
    if actor_id == member_id:
        if purpose != "own_dashboard":
            raise DomainError("invalid_purpose", "Choose your own private dashboard purpose.")
        basis = "Your verified loan history only."
    else:
        if purpose != "existing_relationship":
            raise DomainError("forbidden", "A specific permitted relationship is required.", 403)
        loans = loans.filter(Q(borrower_id=actor_id) | Q(lender_id=actor_id))
        if not loans.exists():
            raise DomainError("not_found", "Relationship not found.", 404)
        basis = "Only verified transactions shared by you and this member; no other counterparties' records."
    from django.db.models import Sum
    from servicing.models import LedgerEntry

    entries = LedgerEntry.objects.filter(loan__in=loans)
    return {
        "member_id": str(member_id),
        "purpose": purpose,
        "basis": basis,
        "loan_count": loans.count(),
        "completed_count": loans.filter(status="repaid").count(),
        "closed_with_loss_count": loans.filter(status="closed_with_loss").count(),
        "confirmed_collections": str(
            entries.filter(kind="collection").aggregate(total=Sum("amount"))["total"] or 0
        ),
        "confirmed_reversals": str(
            entries.filter(kind="collection_reversed").aggregate(total=Sum("amount"))["total"] or 0
        ),
        "currency": "PHP",
        "unit": "centavos_as_decimal_strings",
        "notice": "A factual private history is not a repayment guarantee or a credit-bureau assessment.",
    }
