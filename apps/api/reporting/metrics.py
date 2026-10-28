from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from community.permissions import member_for, staff_for
from config.errors import DomainError
from django.db.models import Sum
from django.utils import timezone

MANILA = ZoneInfo("Asia/Manila")
DEFINITIONS = {
    "principal_disbursed": "Confirmed principal-disbursement ledger amounts effective within the selected period.",
    "confirmed_collections": "Confirmed borrower collections effective within the period, before refunds; not lender settlement.",
    "collection_reversals": "Confirmed compensating collection reversals effective within the period, counted once.",
    "net_collections": "Confirmed collections less confirmed collection reversals in this period; can be negative.",
    "interest_accrued": "Signed interest-accrual and compensating accrual-correction deltas effective within the period; excludes projected future interest.",
    "interest_collected": "Interest allocated by confirmed collection entries, less reversed interest allocations within this period.",
    "principal_outstanding": "Sum of immutable principal deltas before the period end; a balance at that cutoff, not a wallet.",
    "interest_outstanding": "Sum of immutable interest deltas before the period end; excludes unposted estimates and future interest.",
    "contractual_future_interest": "Interest in the contractual schedule active at the cutoff, due on or after period end; projection only, not earned income or a payoff quote.",
    "overdue_contractual_amount": "Contractual schedule active at the cutoff, due beyond three-day grace, less net collections since that schedule took effect; capped by posted outstanding obligations. Not a payoff quote.",
    "loss_recorded": "Explicit immutable loss ledger entries effective within the period. Zero does not imply recovery on closed-with-loss loans.",
    "closed_with_loss_count": "Loans marked closed with loss and closed during the selected period; distinct from repaid loans.",
    "settlement_unknown_count": "Funded loans with unknown, unsupported or uncertain current lender-settlement status. This is a current-status count.",
    "settlement_confirmed_count": "Funded loans currently marked settlement confirmed. This is a status count, not a cash payout amount.",
    "commission_earned": "Origination commission accruals recorded in the selected period; excludes repayment commission.",
    "commission_collected": "Confirmed platform-fee collection sources effective within the selected period, less their confirmed refund sources.",
    "commission_reversed": "Compensating origination-commission adjustments recorded in the selected period, shown as a positive reversal amount.",
}


def period(start=None, end=None):
    today = timezone.now().astimezone(MANILA).date()
    try:
        start_date = date.fromisoformat(str(start)) if start else today.replace(day=1)
        end_date = date.fromisoformat(str(end)) if end else today + timedelta(days=1)
    except (ValueError, TypeError):
        raise DomainError("invalid_period", "Use ISO calendar dates for start and exclusive end.")
    if end_date <= start_date or (end_date - start_date).days > 3660:
        raise DomainError(
            "invalid_period", "End must follow start, within a ten-year reporting window."
        )
    return datetime.combine(start_date, time.min, MANILA), datetime.combine(
        end_date, time.min, MANILA
    )


def sum_field(queryset, field):
    return queryset.aggregate(total=Sum(field))["total"] or 0


def _metrics(loans, start, end):
    from payments.models import FinancialSource
    from servicing.models import CommissionAccrual, CommissionAdjustment, LedgerEntry

    entries = LedgerEntry.objects.filter(loan__in=loans)
    selected = entries.filter(effective_at__gte=start, effective_at__lt=end)
    before = entries.filter(effective_at__lt=end)
    collected = selected.filter(kind="collection")
    reversed_entries = selected.filter(kind="collection_reversed")
    commission = CommissionAccrual.objects.filter(loan__in=loans)
    source = FinancialSource.objects.filter(
        operation__commission__in=commission, effective_at__gte=start, effective_at__lt=end
    )
    result = {
        "principal_disbursed": sum_field(selected.filter(kind="principal_disbursed"), "amount"),
        "confirmed_collections": sum_field(collected, "amount"),
        "collection_reversals": sum_field(reversed_entries, "amount"),
        "interest_accrued": sum_field(
            selected.filter(kind__in=["interest_accrued", "accrual_correction"]), "interest_delta"
        ),
        "interest_collected": -sum_field(collected, "interest_delta")
        - sum_field(reversed_entries, "interest_delta"),
        "principal_outstanding": sum_field(before, "principal_delta"),
        "interest_outstanding": sum_field(before, "interest_delta"),
        "contractual_future_interest": 0,
        "overdue_contractual_amount": 0,
        "loss_recorded": sum_field(selected.filter(kind="loss_recorded"), "amount"),
        "closed_with_loss_count": loans.filter(
            status="closed_with_loss", closed_at__gte=start, closed_at__lt=end
        ).count(),
        "settlement_unknown_count": loans.filter(
            disbursement_status="confirmed",
            settlement_status__in=["unknown", "unsupported", "uncertain"],
        ).count(),
        "settlement_confirmed_count": loans.filter(
            disbursement_status="confirmed", settlement_status="confirmed"
        ).count(),
        "commission_earned": sum_field(
            commission.filter(created_at__gte=start, created_at__lt=end), "amount"
        ),
        "commission_collected": sum_field(source.filter(kind="collection"), "amount")
        - sum_field(source.filter(kind="refund"), "amount"),
        "commission_reversed": -sum_field(
            CommissionAdjustment.objects.filter(
                accrual__in=commission, created_at__gte=start, created_at__lt=end
            ),
            "amount",
        ),
    }
    result["net_collections"] = result["confirmed_collections"] - result["collection_reversals"]
    for loan in loans.select_related("agreement"):
        schedule = loan.agreement.disclosure.get("schedule", [])
        own_before = before.filter(loan=loan)
        activation = own_before.filter(kind="amendment_activated").order_by("-effective_at").first()
        preserved = 0
        if activation:
            from cases.models import AmendmentProposal

            proposal = AmendmentProposal.objects.filter(
                pk=activation.metadata.get("proposal_id"), status="active"
            ).first()
            if proposal:
                schedule = proposal.disclosures.get("schedule", [])
                preserved = (
                    int(proposal.disclosures.get("preserved_accrued_interest", 0))
                    if activation.effective_at < end - timedelta(days=3)
                    else 0
                )
        outstanding = max(
            0, sum_field(own_before, "principal_delta") + sum_field(own_before, "interest_delta")
        )
        if outstanding:
            result["contractual_future_interest"] += sum(
                int(row["interest"])
                for row in schedule
                if row["due_date"] >= end.date().isoformat()
            )
            due = preserved + sum(
                int(row["total"])
                for row in schedule
                if date.fromisoformat(row["due_date"]) < (end - timedelta(days=3)).date()
            )
            payment_entries = (
                own_before.filter(effective_at__gte=activation.effective_at)
                if activation
                else own_before
            )
            paid = sum_field(payment_entries.filter(kind="collection"), "amount") - sum_field(
                payment_entries.filter(kind="collection_reversed"), "amount"
            )
            result["overdue_contractual_amount"] += min(outstanding, max(0, due - paid))
    # Decimal strings preserve centavo totals beyond JavaScript's safe-integer range.
    return {key: str(value) for key, value in result.items()}


def member_metrics(*, actor_id, role, start=None, end=None):
    from servicing.models import Loan

    member_for(actor_id)
    if role not in ("borrower", "lender"):
        raise DomainError("invalid_role", "Choose borrower or lender.")
    if not isinstance(start, datetime):
        start, end = period(start, end)
    loans = Loan.objects.filter(**{f"{role}_id": actor_id})
    return {
        "period": {
            "start": start.isoformat(),
            "end": end.isoformat(),
            "timezone": "Asia/Manila",
            "basis": "start-inclusive, end-exclusive effective financial timestamps; status counts labeled current",
        },
        "role": role,
        "currency": "PHP",
        "unit": "centavos_as_decimal_strings",
        "metrics": _metrics(loans, start, end),
        "definitions": DEFINITIONS,
        "comparison": None,
        "test_mode": True,
    }


def operations_metrics(*, actor_id, start=None, end=None):
    from servicing.models import Loan

    staff_for(actor_id, ("finance",))
    if not isinstance(start, datetime):
        start, end = period(start, end)
    from cases.models import Case
    from verification.models import VerificationCase

    return {
        "period": {
            "start": start.isoformat(),
            "end": end.isoformat(),
            "timezone": "Asia/Manila",
            "basis": "start-inclusive, end-exclusive effective financial timestamps; queue counts current",
        },
        "currency": "PHP",
        "unit": "centavos_as_decimal_strings",
        "metrics": _metrics(Loan.objects.all(), start, end),
        "definitions": DEFINITIONS,
        "queues": {
            "open_cases": Case.objects.filter(status__in=["open", "needs_information"]).count(),
            "verification_pending": VerificationCase.objects.filter(
                status__in=["submitted", "under_review", "needs_information"]
            ).count(),
        },
        "comparison": None,
        "test_mode": True,
    }
