import calendar
from datetime import date, timedelta
from decimal import ROUND_HALF_UP, Decimal

from config.errors import DomainError

from .types import InstallmentLine, Schedule, integer


def rounded(value):
    return int(Decimal(value).quantize(Decimal(1), rounding=ROUND_HALF_UP))


def generate_due_dates(*, effective_date, frequency, count, anchor_day=None):
    integer(count, "count", 1)
    if count > 120:
        raise DomainError("invalid_terms", "At most 120 installments are supported.")
    if frequency == "weekly":
        return tuple(effective_date + timedelta(days=7 * i) for i in range(1, count + 1))
    if frequency in {"monthly", "maturity"}:
        anchor = anchor_day or effective_date.day
        result = []
        for offset in range(1, count + 1):
            month_index = effective_date.year * 12 + effective_date.month - 1 + offset
            year, month = divmod(month_index, 12)
            result.append(
                date(year, month + 1, min(anchor, calendar.monthrange(year, month + 1)[1]))
            )
        return tuple(result)
    if frequency == "twice_monthly":
        result, current = [], effective_date
        while len(result) < count:
            last = calendar.monthrange(current.year, current.month)[1]
            candidates = [date(current.year, current.month, day) for day in (15, last)]
            following = next((d for d in candidates if d > current), None)
            if following is None:
                current = date(current.year + (current.month == 12), current.month % 12 + 1, 1)
                following = date(current.year, current.month, 15)
            result.append(following)
            current = following
        return tuple(result)
    raise DomainError("invalid_frequency", "Unsupported repayment frequency.")


def build_schedule(terms):
    remaining, previous, lines = terms.principal, terms.effective_date, []
    base = terms.principal // terms.installment_count
    for index, due in enumerate(terms.due_dates):
        principal = base if index < terms.installment_count - 1 else remaining
        interest = rounded(
            Decimal(remaining) * terms.annual_rate_bps * (due - previous).days / Decimal(3650000)
        )
        charges = (
            sum(f.amount for f in terms.borrower_fees if f.timing == "maturity")
            if index == terms.installment_count - 1
            else 0
        )
        lines.append(
            InstallmentLine(due, principal, interest, charges, principal + interest + charges)
        )
        remaining -= principal
        previous = due
    proceeds = terms.principal - sum(f.amount for f in terms.borrower_fees if f.timing == "upfront")
    if proceeds <= 0:
        raise DomainError("invalid_cashflow", "Borrower proceeds must be positive.")
    return Schedule(tuple(lines), sum(x.total for x in lines), proceeds)
