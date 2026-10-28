from dataclasses import asdict, dataclass
from datetime import date

from config.errors import DomainError


def integer(value, name, minimum=0):
    if type(value) is not int or value < minimum or value > 9007199254740991:
        raise DomainError(
            "invalid_amount", f"{name} must be a safe integer from {minimum} to 9007199254740991."
        )
    return value


@dataclass(frozen=True)
class Fee:
    code: str
    amount: int
    timing: str = "upfront"

    def __post_init__(self):
        integer(self.amount, "fee")
        if self.timing not in {"upfront", "maturity"}:
            raise DomainError("fee_timing", "Unsupported contractual fee timing.")


@dataclass(frozen=True)
class LoanTerms:
    principal: int
    currency: str
    annual_rate_bps: int
    frequency: str
    installment_count: int
    effective_date: date
    due_dates: tuple[date, ...]
    policy_version: str = "demo-v1"
    borrower_fees: tuple[Fee, ...] = ()
    lender_fees: tuple[Fee, ...] = ()

    def __post_init__(self):
        integer(self.principal, "principal", 1)
        integer(self.annual_rate_bps, "annual_rate_bps")
        integer(self.installment_count, "installment_count", 1)
        if self.currency != "PHP" or self.frequency not in {
            "weekly",
            "twice_monthly",
            "monthly",
            "maturity",
        }:
            raise DomainError(
                "invalid_terms", "Only PHP and supported repayment frequencies are allowed."
            )
        if self.frequency == "maturity" and self.installment_count != 1:
            raise DomainError("invalid_terms", "Single maturity requires exactly one installment.")
        if self.installment_count > 120 or len(self.due_dates) != self.installment_count:
            raise DomainError("invalid_terms", "Invalid installment count or due dates.")
        if (
            not self.policy_version
            or tuple(sorted(set(self.due_dates))) != self.due_dates
            or self.due_dates[0] <= self.effective_date
        ):
            raise DomainError(
                "invalid_terms", "Dates must strictly increase after the effective date."
            )

    def to_dict(self):
        result = asdict(self)
        result["effective_date"] = self.effective_date.isoformat()
        result["due_dates"] = [x.isoformat() for x in self.due_dates]
        return result

    @classmethod
    def from_dict(cls, value):
        data = dict(value)
        data["effective_date"] = date.fromisoformat(data["effective_date"])
        data["due_dates"] = tuple(date.fromisoformat(x) for x in data["due_dates"])
        for key in ("borrower_fees", "lender_fees"):
            data[key] = tuple(Fee(**x) for x in data.get(key, []))
        return cls(**data)


@dataclass(frozen=True)
class InstallmentLine:
    due_date: date
    principal: int
    interest: int
    charges: int
    total: int


@dataclass(frozen=True)
class Schedule:
    lines: tuple[InstallmentLine, ...]
    total_repayment: int
    net_proceeds: int
