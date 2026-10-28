from dataclasses import dataclass


@dataclass(frozen=True)
class TransferResult:
    transfer_id: str
    loan_id: str
    status: str
    test_mode: bool = True


@dataclass(frozen=True)
class AccrualResult:
    loan_id: str
    accrued_amount: int
    interest_balance: int


@dataclass(frozen=True)
class AllocationResult:
    loan_id: str
    principal: int
    interest: int
    remaining_balance: int
