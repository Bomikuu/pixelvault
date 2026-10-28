"""Read-only chart projections from the same permission-scoped reporting loans."""

from datetime import datetime, time, timedelta

from django.db.models import Count, Q, Sum
from django.db.models.functions import TruncDay, TruncMonth

from .metrics import MANILA


def reporting_activity(loans, start, end):
    from servicing.models import LedgerEntry

    daily = (end - start).days <= 93
    trunc = TruncDay if daily else TruncMonth
    repayment = Q(kind__in=["collection", "collection_reversed"])
    grouped = (
        LedgerEntry.objects.filter(loan__in=loans, effective_at__gte=start, effective_at__lt=end)
        .annotate(bucket=trunc("effective_at", tzinfo=MANILA))
        .values("bucket")
        .annotate(
            principal=Sum("principal_delta", filter=repayment),
            interest=Sum("interest_delta", filter=repayment),
            collections=Sum("amount", filter=Q(kind="collection")),
            reversals=Sum("amount", filter=Q(kind="collection_reversed")),
            payments=Count("id", filter=Q(kind="collection")),
            disbursed=Sum("amount", filter=Q(kind="principal_disbursed")),
            accrued=Sum(
                "interest_delta", filter=Q(kind__in=["interest_accrued", "accrual_correction"])
            ),
        )
        .order_by("bucket")
    )
    by_date = {row["bucket"].astimezone(MANILA).date(): row for row in grouped}
    cursor = start.date() if daily else start.date().replace(day=1)
    points = []
    totals = {"principal": 0, "interest": 0, "other_charges": 0, "total": 0}
    while datetime.combine(cursor, time.min, MANILA) < end:
        row = by_date.get(cursor, {})
        principal = -(row.get("principal") or 0)
        interest = -(row.get("interest") or 0)
        collected = row.get("collections") or 0
        reversals = row.get("reversals") or 0
        net = collected - reversals
        other = net - principal - interest
        for key, value in {
            "principal": principal,
            "interest": interest,
            "other_charges": other,
            "total": net,
        }.items():
            totals[key] += value
        points.append(
            {
                "date": cursor.isoformat(),
                "principal_collected": str(principal),
                "interest_collected": str(interest),
                "confirmed_collections": str(collected),
                "collection_reversals": str(reversals),
                "net_collections": str(net),
                "collection_count": str(row.get("payments") or 0),
                "principal_disbursed": str(row.get("disbursed") or 0),
                "interest_accrued": str(row.get("accrued") or 0),
            }
        )
        cursor = (
            cursor + timedelta(days=1)
            if daily
            else (cursor.replace(day=28) + timedelta(days=4)).replace(day=1)
        )

    # These are explicitly current signed nominal rates, never a blended effective rate.
    rates = sorted(
        {
            int((active or original)["annual_rate_bps"])
            for active, original in loans.filter(
                status="active", disbursement_status="confirmed"
            ).values_list("active_terms", "agreement__terms")
            if "annual_rate_bps" in (active or original)
        }
    )
    return {
        "granularity": "day" if daily else "month",
        "points": points,
        "repayment_breakdown": {key: str(value) for key, value in totals.items()},
        "current_annual_rates_bps": rates,
        "definitions": {
            "trend": "Effective-date collection allocations, net of reversals, inside the selected period; zero buckets are real absence of entries.",
            "collection_count": "Confirmed collection ledger events before reversals; not a count of scheduled installments or settled payouts.",
            "other_charges": "Net collection amount less net principal and interest allocations. Origination platform fees are reported separately.",
            "current_annual_rates_bps": "Distinct nominal reducing-balance annual rates in current signed terms on active, confirmed-disbursement loans; current status, not a period EIR or promised yield.",
        },
    }
