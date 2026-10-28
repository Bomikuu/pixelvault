# PixelVault → PixelFlow integration evidence and plan

Inspected natively on 2026-10-28. This is a static source review, not a running-service, provider, security or live-payment acceptance test. PixelFlow's own repository guidance forbids delegation; the delegated discovery was stopped when that boundary was found, and the integration inspection was completed in the primary chat. No PixelFlow files were changed.

## Verified current contract

| Evidence | Observed behavior | PixelVault implication |
| --- | --- | --- |
| `/home/micxsz/projects/pixelflow/packages/sdk-python/pixelflow/client.py` | `Pixelflow(base_url, api_key, timeout=20)`; HTTPS except localhost; server-side bearer credential; non-GET operations need an idempotency key | Use the Python SDK from Django only, with the base URL ending `/api/v1`; no browser credentials |
| `apps/api/payments/serializers.py::CheckoutInput` and `apps/api/config/urls.py` in PixelFlow | `POST /api/v1/checkout-sessions` takes `external_id`, `version`, integer `amount`, `currency`, `description`, `methods`, `success_url`, `cancel_url` | Freeze a host-owned payable snapshot before dispatch; the request field is `version`, while event snapshots use `payable_version` |
| Python client methods | `create_checkout(payload, idempotency_key)`, `get_payment(payment_id)`, `request_refund(payment_id, amount, reason, idempotency_key)`, `reconcile_payment(payment_id, idempotency_key, **references)`, `list_events(**filters)` | Use real published operations; do not invent loan, payout, auto-debit or lender-onboarding endpoints |
| `apps/api/accounts/policy.py::resolve_scope` | API key binds one project/tenant/environment and permissions; contradictory scope headers are rejected; revocation is rechecked | Routing configuration is server-owned; a member cannot choose a merchant/tenant/API key through request fields |
| `packages/sdk-python/pixelflow/webhooks.py::verify_webhook` | `verify_webhook(raw_body, signature, secret, *, now=None, tolerance=300, event_id=None)` verifies HMAC over event ID, timestamp and raw body; requires API version `2026-10-24` | Verify exact raw request bytes; then separately validate all expected routing and payable fields |
| `apps/api/events/delivery.py::deliver_event` | Headers are `Pixelflow-Event-ID` and `Pixelflow-Signature`; signature is `t=...,v1=...`; deliveries retry | Do not invent an `X-Pixelflow-Signature` header; be retry-safe |
| `docs/integrations/README.md` | Host must match project/tenant/environment, amount, currency and payable version; atomically deduplicate event and financial references; only `payment.succeeded` allocates a collection | `cash.collected` is evidence of the same collection, not a second payment |
| `apps/api/events/outbox.py::payment_snapshot`, line 34 at inspection | `settlement_status` is literally `unknown` | Never label a lender settled from a successful checkout |
| `apps/api/providers/base.py::Provider` | Only create/retrieve checkout and create/retrieve refund are defined | Disbursement, payouts, split settlement and individual marketplace onboarding are unsupported in this protocol |

The current root OpenAPI file is `docs/api/openapi.yaml`. The local Python package lives at `packages/sdk-python`; development may install a pinned editable path, but production needs an immutable package/version or vendored release with provenance. A local source tree is not a deployed API guarantee.

The graph has 471 nodes; the scoped payment traversal returned 347 candidates and was truncated to the budget. It located `Tenant`, `MerchantConnection`, `CheckoutSession`, `resolve_scope` and `emit_payment_event`. Direct source inspection, rather than graph completeness, supports the table above. PixelCore's separate graph located invoice/payment allocation records but establishes no PixelVault implementation.

## Routing and money movement

| Flow | Initial implementation | Live prerequisite |
| --- | --- | --- |
| Offer capacity | Host-owned declaration/reservation; no wallet | Verified funding capability where required; never imply custody |
| Loan disbursement | Deterministic sandbox transfer adapter, no external money | Approved individual-lender disbursement arrangement with authoritative transfer IDs/statuses |
| Borrower repayment collection | PixelFlow adapter contract tested with mocked HTTP/events; optional explicitly configured test service | Approved repayment route for the actual lender/counterparty model |
| Settlement to individual lender | Separate record; `unknown` or `unsupported` absent evidence | Approved settlement provider and reconciliation contract |
| Platform fee | Separate lender-paid payable accrued once at confirmed disbursement; collection tracked separately | Approved platform service-fee merchant route and disclosed policy |

One platform-owned merchant account must not be used as an undocumented pool for all lenders. Do not automatically create a merchant tenant for an individual and assume that the provider accepts that person. An approved `PaymentRoutingProfile` records project/tenant/environment, allowed purpose, counterparty, credentials reference and evidence reference. Production routing is unresolved and disabled; test routing is explicitly synthetic.

## PixelVault adapter boundary

All paths below refer to the implemented standalone repository. These initial interface sketches describe responsibilities; actual callable contracts and tests in those modules are authoritative.

- `apps/api/payments/contracts.py`: frozen `PayableSnapshot(id: UUID, kind: str, loan_id: UUID | None, payer_id: UUID, lender_id: UUID | None, amount: int, currency: str, version: str, routing_id: UUID)`; `CheckoutLink(payment_id: str, checkout_url: str, expires_at: datetime)`.
- `apps/api/payments/pixelflow.py`: `create_checkout(*, payable: PayableSnapshot, operation_id: UUID) -> CheckoutLink`; use the persisted operation ID as the SDK idempotency key.
- `apps/api/payments/inbox.py`: `receive_webhook(*, routing_id: UUID, raw_body: bytes, signature: str, event_id_header: str) -> InboxReceipt`; `apply_event(*, inbox_id: UUID) -> ApplyResult`.
- `apps/api/payments/recovery.py`: `recover_events(*, routing_id: UUID, cursor: str | None) -> RecoveryResult`; a trusted, server-authenticated event-list transport calls the same scope validation and semantic deduplication as webhooks.
- `apps/api/servicing/transfers.py`: `request_disbursement(*, loan_id: UUID, actor_id: UUID, operation_id: UUID) -> TransferResult`; `reconcile_disbursement(*, transfer_id: UUID) -> TransferResult`. Sandbox implements these now; no invented PixelFlow method backs them.

`POST /api/v1/integrations/pixelflow/{routing_id}/events` is a new **PixelVault** webhook route, not a pre-existing PixelFlow endpoint. The route resolves a configured secret and scope. Refuse cross-routing, cross-environment or unsupported-version events before financial application.

## Reliable collection application

1. Authorize the borrower and read obligations from the host ledger. Persist one payable generation and operation before a provider call. Allow one pending/uncertain collectible generation for the same obligations; reserve the collectible amount under a loan lock.
2. Send a payer-safe description and opaque external ID. Freeze amount, purpose, currency and payable version. Never include income, ID data or loan-purpose narrative in provider metadata.
3. On timeout, retain `uncertain` and retry/reconcile the same operation. Returning from hosted checkout can refresh status but cannot allocate money.
4. Verify webhook transport authentication, configured routing and mapped financial fields. Commit a unique inbox row before acknowledging receipt. A valid event arriving before the checkout response stays `awaiting_mapping` and is retried durably; it is not discarded.
5. Under transaction/loan locks, apply one collection per `(routing_id, payment_id)` and one refund reversal per `(routing_id, refund_id)`, in addition to event-ID deduplication. Derive effective payment time from validated provider evidence, not webhook arrival or a browser-supplied date; preserve both effective and recorded times. Store append-only loan facts and notifications/outbox work together.
6. Update display snapshots only when `version` increases. Financial facts use their immutable semantic identities independently: a lower-version success cannot disappear merely because a newer refund snapshot arrived first. Hold an orphan refund until its original collection is recovered; never create a negative phantom collection.
7. Recover missed events with bounded limit/offset pagination with full-sweep restart. Retry outcomes and mapping work are observable in admin. A failed or uncertain provider operation is not evidence that a person failed to pay.
8. Record collection, refund, disbursement and lender settlement separately. Pending refunds reserve the refundable amount. A repayment reversal restores the corresponding obligation through compensating entries; it does not rewrite history or automatically accuse the borrower of fraud.

## Contract tests implemented in phase 3

Mock the real SDK/HTTP boundary and raw signed events: exact request keys, signature expiry/tampering, event-ID mismatch, test/live mismatch, wrong tenant/payer mapping, wrong amount/currency/version, missing mapping, duplicate event IDs, distinct cash/success events for one payment, reversed ordering, orphan refund, timeout/retry, pagination and cursor replay. Use PostgreSQL for concurrent collectible reservation and financial deduplication.

A successful adapter test proves the host contract under those fixtures. It does not prove approved live lending, disbursement or settlement.

## Event-list source correction during implementation

Native source inspection of PixelFlow EventsView and ServiceView.page verified DRF LimitOffsetPagination (max limit 100), descending created_at/id order, and `{count,next,previous,results}`. The adapter validates next-link origin/path, extracts only the bounded offset, persists incomplete-sweep progress and resets to offset zero after completion. New events arriving during a sweep are recovered on the next sweep. Tests use this exact shape rather than an invented cursor response.
