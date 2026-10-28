from datetime import date
from decimal import Decimal

from accounts.models import AVATAR_KEYS
from agreements.schedule import rounded
from django.utils import timezone

from .models import Loan


def member_summary(member):
    from community.reputation import reputation_summary

    return {
        "id": str(member.id),
        "display_name": member.display_name,
        "area": member.area,
        "avatar_key": member.avatar_key if member.avatar_key in AVATAR_KEYS else "",
        "reputation": reputation_summary(member),
    }


def get_loan_projection(*, loan_id, as_of=None):
    loan = Loan.objects.select_related("agreement", "lender", "borrower").get(pk=loan_id)
    as_of = timezone.localtime(as_of or timezone.now())
    terms, disclosure = (
        loan.active_terms or loan.agreement.terms,
        loan.active_disclosure or loan.agreement.disclosure,
    )
    schedule = disclosure["schedule"]
    start = loan.accrued_through or date.fromisoformat(terms["effective_date"])
    end = min(as_of.date(), date.fromisoformat(terms["due_dates"][-1]))
    estimated = (
        rounded(
            loan.accrual_exact
            + Decimal(loan.principal_balance)
            * terms["annual_rate_bps"]
            * max(0, (end - start).days)
            / Decimal(3650000)
        )
        - loan.interest_posted
        if loan.status == "active"
        else 0
    )
    interest = loan.interest_balance + estimated
    # Future interest is a projection under the signed equal-principal method.
    # Recalculate remaining installments after principal-changing payments; never
    # count a full-maturity interest-on-current-balance estimate as earned income.
    dates = [
        date.fromisoformat(x["due_date"])
        for x in schedule
        if x["due_date"] > max(end, start).isoformat()
    ]
    projected, revised, outstanding, previous = 0, [], loan.principal_balance, max(end, start)
    if loan.status == "active" and dates:
        base = outstanding // len(dates)
        for index, due in enumerate(dates):
            principal = base if index < len(dates) - 1 else outstanding
            item_interest = rounded(
                Decimal(outstanding)
                * terms["annual_rate_bps"]
                * (due - previous).days
                / Decimal(3650000)
            )
            projected += item_interest
            revised.append(
                {
                    "due_date": due.isoformat(),
                    "principal": principal,
                    "interest": item_interest,
                    "charges": 0,
                    "total": principal + item_interest,
                }
            )
            outstanding -= principal
            previous = due
    from .payment_review import installment_preview

    next_installment_due, next_due = (
        installment_preview(
            loan, schedule=schedule, as_of=as_of.date(), payoff=loan.principal_balance + interest
        )
        if loan.status == "active"
        else (0, None)
    )
    return {
        "id": str(loan.id),
        "status": loan.status,
        "principal_balance": loan.principal_balance,
        "accrued_interest": interest,
        "projected_interest": projected,
        "total_due": loan.principal_balance + interest,
        "payoff_amount": loan.principal_balance + interest,
        "next_installment_due": next_installment_due,
        "next_due_date": next_due,
        "settlement_status": loan.settlement_status,
        "disbursement_status": loan.disbursement_status,
        "schedule": schedule,
        "revised_projection": revised,
        "projection_label": "Estimated future equal-principal payments; accrued obligations shown separately",
        "terms": terms,
        "disclosure": disclosure,
        "agreement_id": str(loan.agreement_id),
        "lender": member_summary(loan.lender),
        "borrower": member_summary(loan.borrower),
        "test_mode": True,
        "activation_exception": loan.activation_exception,
        "active_amendment_id": str(loan.active_amendment_id) if loan.active_amendment_id else None,
        "original_terms": loan.agreement.terms,
    }
