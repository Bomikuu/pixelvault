from dataclasses import dataclass
from datetime import datetime
from uuid import UUID


@dataclass(frozen=True)
class PayableSnapshot:
    id: UUID
    kind: str
    loan_id: UUID | None
    payer_id: UUID
    lender_id: UUID | None
    amount: int
    currency: str
    version: str
    routing_id: UUID


@dataclass(frozen=True)
class CheckoutLink:
    payment_id: str
    checkout_url: str
    expires_at: datetime | None
    status: str = "awaiting_payment"


@dataclass(frozen=True)
class InboxReceipt:
    inbox_id: str
    state: str


@dataclass(frozen=True)
class ApplyResult:
    inbox_id: str
    state: str


@dataclass(frozen=True)
class RecoveryResult:
    processed: int
    cursor: str | None
    has_more: bool
