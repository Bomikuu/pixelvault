"""Append-only financial facts are posted through servicing allocation/accrual/transfers."""


def timeline_for(loan):
    return [
        {
            "id": str(x.id),
            "kind": x.kind,
            "amount": x.amount,
            "principal_delta": x.principal_delta,
            "interest_delta": x.interest_delta,
            "effective_at": x.effective_at.isoformat(),
            "recorded_at": x.created_at.isoformat(),
        }
        for x in loan.ledger.order_by("effective_at", "created_at")
    ]
