from dataclasses import asdict
from decimal import Decimal, localcontext

from config.errors import DomainError

from .schedule import build_schedule


def effective_annual_rate(*, net_proceeds, start, dated_payments):
    if (
        type(net_proceeds) is not int
        or net_proceeds <= 0
        or not dated_payments
        or any(type(a) is not int or a <= 0 or d <= start for d, a in dated_payments)
    ):
        raise DomainError("invalid_cashflow", "Invalid dated borrower cash flows.")
    with localcontext() as context:
        context.prec = 36

        def npv(rate):
            return (
                sum(
                    Decimal(a) / ((1 + rate) ** (Decimal((d - start).days) / 365))
                    for d, a in dated_payments
                )
                - net_proceeds
            )

        lower, upper = Decimal(0), Decimal(1)
        if npv(lower) == 0:
            return Decimal(0)
        if npv(lower) < 0:
            raise DomainError(
                "invalid_cashflow", "Negative effective borrowing costs are unsupported."
            )
        while npv(upper) > 0 and upper < 1024:
            upper *= 2
        if npv(upper) > 0:
            raise DomainError("eir_nonconvergent", "Effective rate could not be bracketed.")
        for _ in range(256):
            middle = (lower + upper) / 2
            value = npv(middle)
            if abs(value) < Decimal("0.005") and upper - lower < Decimal("1e-10"):
                return +middle
            if value > 0:
                lower = middle
            else:
                upper = middle
    raise DomainError("eir_nonconvergent", "Effective rate did not converge.")


def build_disclosure(terms):
    schedule = build_schedule(terms)
    rate = effective_annual_rate(
        net_proceeds=schedule.net_proceeds,
        start=terms.effective_date,
        dated_payments=tuple((x.due_date, x.total) for x in schedule.lines),
    )
    return {
        "principal": terms.principal,
        "currency": "PHP",
        "net_proceeds": schedule.net_proceeds,
        "total_repayment": schedule.total_repayment,
        "total_interest": sum(x.interest for x in schedule.lines),
        "annual_rate_bps": terms.annual_rate_bps,
        "rate_basis": "Equal principal; simple reducing balance; ACT/365 fixed; half-up centavo rounding",
        "effective_annual_rate": str(rate),
        "effective_annual_percentage": str((rate * 100).quantize(Decimal("0.01"))),
        "borrower_fees": [asdict(x) for x in terms.borrower_fees],
        "lender_fees": [asdict(x) for x in terms.lender_fees],
        "schedule": [{**asdict(x), "due_date": x.due_date.isoformat()} for x in schedule.lines],
        "grace_days": 3,
        "late_fee": 0,
        "post_maturity_interest": False,
        "test_mode": True,
    }
