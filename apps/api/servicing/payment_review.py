from agreements.types import integer
from config.errors import DomainError


def installment_preview(loan, *, schedule, as_of, payoff):
    entries = loan.ledger.filter(kind__in=["collection", "collection_reversed"])
    if loan.active_amendment_id:
        activation = loan.ledger.filter(source_key=f"amendment:{loan.active_amendment_id}").first()
        if activation:
            entries = entries.filter(created_at__gt=activation.created_at)
    paid = sum(x.amount if x.kind == "collection" else -x.amount for x in entries)
    carry = (loan.active_disclosure or {}).get("preserved_accrued_interest", 0)
    cumulative = carry
    next_due, next_amount = (as_of.isoformat(), max(0, carry - paid)) if carry > paid else (None, 0)
    overdue = max(0, carry - paid)
    for line in schedule:
        cumulative += line["total"]
        if line["due_date"] <= as_of.isoformat():
            overdue = max(0, cumulative - paid)
        if next_due is None and cumulative > paid:
            next_due = line["due_date"]
            next_amount = cumulative - paid
    amount = min(payoff, overdue or next_amount)
    return max(0, amount), next_due


def payment_review(*, projection, mode="installment", requested_amount=None):
    payoff = projection["payoff_amount"]
    if projection["status"] != "active" or payoff <= 0:
        raise DomainError("not_collectible", "There is no active collectible balance.", 409)
    if mode == "partial":
        amount = integer(requested_amount, "requested_amount", 1)
    elif mode in {"installment", "payoff"}:
        if requested_amount is not None:
            raise DomainError(
                "server_payable", "Requested amounts are accepted only for a partial payment."
            )
        amount = projection["next_installment_due"] if mode == "installment" else payoff
    else:
        raise DomainError("payment_mode", "Choose installment, payoff or partial.")
    if not 0 < amount <= payoff:
        raise DomainError(
            "payment_amount",
            "Payment must be positive and no greater than the current accrued payoff.",
        )
    return {
        "loan_id": projection["id"],
        "mode": mode,
        "amount": amount,
        "principal_balance": projection["principal_balance"],
        "accrued_interest": projection["accrued_interest"],
        "payoff_amount": payoff,
        "next_installment_due": projection["next_installment_due"],
        "next_due_date": projection["next_due_date"],
        "currency": "PHP",
        "test_mode": True,
        "allocation_note": "Accrued simple interest first, then outstanding principal. No unearned future interest or repayment commission.",
    }
