# PixelVault Servicing Implementation Plan

> Original task definition. Native collaboration tools were used because the named helper skills were not installed. Actual delivered behavior, verification and remaining deployment dependencies are recorded in [implementation status](../IMPLEMENTATION.md); original task checklists are retained as the planning baseline.

**Goal:** Complete the synthetic loan lifecycle, reliable PixelFlow collection contract, private loan history and one-time lender-paid commission records.

**Architecture:** Append-only loan facts, exact accrual/allocation and separate transfer/settlement records; persisted payment operations plus authenticated inbox/recovery. External HTTP is outside transactions. Financial APIs and React timelines consume the same server projections.

**Tech Stack:** Phase 2 runtime plus the inspected PixelFlow Python SDK, mocked HTTP, PostgreSQL concurrency, Celery recovery and private document rendering.

**Spec:** [PixelVault design](../specs/2026-10-28-pixelvault-design.md), §§6–8 and [PixelFlow contract](../PIXELFLOW-INTEGRATION.md). Depends on [phase 2](2026-10-28-pixelvault-2-origination.md).

## Global Constraints

- Financial state is never client-authoritative.
- No network call occurs while holding a financial database transaction.
- Projected future interest is not earned income.
- No platform commission on repayments.
- Live money remains disabled until the model and payment arrangements are actually approved.
- No live external payments/identities. Mock HTTP; use PostgreSQL for concurrency. No builds/browser/visual/manual app verification; targeted automated tests and frontend checks.

## Review Focus

- Transfer timeout or late confirmation cannot create two disbursements or silently alter signed dates — task 3.1.
- Repeated raw events and cash/success twins cannot double-collect — task 3.2.
- Refund-before-success and stale versions must preserve financial facts independently of display snapshots — task 3.2.
- Partial/early payment and reversal must not charge future interest or capitalize unpaid interest — task 3.1.
- Fee accrual is not collection, and successful repayment is not lender settlement — tasks 3.3–3.4.

### Task 3.1: Transfers, accrual and append-only balances

**Files:** create `apps/api/servicing/{types,ledger,accrual,allocation,transfers,projections}.py`, extend `servicing/models.py`, add `apps/api/servicing/tests/{test_transfers,test_accrual,test_allocation}.py`.

**Interfaces:** consumes accepted loan/terms and eligibility; produces `request_disbursement(*, loan_id: UUID, actor_id: UUID, operation_id: UUID) -> TransferResult`, `reconcile_disbursement(*, transfer_id: UUID) -> TransferResult`, `accrue_to(*, loan_id: UUID, through: date) -> AccrualResult`, `record_collection(*, loan_id: UUID, amount: int, effective_at: datetime, source_key: str) -> AllocationResult`, `reverse_collection(*, source_key: str, refund_key: str, amount: int, effective_at: datetime) -> AllocationResult`, `get_loan_projection(*, loan_id: UUID, as_of: datetime) -> LoanProjection`. Sandbox transfer adapter returns synthetic authoritative outcomes and cannot load in live mode.

- [ ] Write `test_one_operation_one_disbursement`, `test_timeout_is_uncertain_and_blocks_new_dispatch`, `test_expired_signing_window_requires_new_acceptance`, `test_late_confirmation_opens_activation_exception`, `test_principal_created_only_after_confirmed_disbursement`, `test_partial_collection_interest_then_principal`, `test_early_payoff_excludes_future_interest`, `test_cumulative_rounding_has_no_daily_drift`, `test_reversal_appends_and_restores_obligation`, `test_repaid_loan_reopens_after_reversal`, `test_default_zero_late_fee_and_no_interest_on_interest`, `test_suspended_member_can_repay`. Frozen effective-date tests compare full ledger sums and the original accepted terms remain unchanged.
- [ ] Run `uv run pytest apps/api/servicing/tests/test_transfers.py apps/api/servicing/tests/test_accrual.py apps/api/servicing/tests/test_allocation.py -q` using PostgreSQL; observe intended failures.
- [ ] Implement persisted dispatch/outcome records, separate unknown settlement, exact interval accrual using differences of rounded cumulative amounts, oldest-due interest then principal, projected schedule revisions and compensating reversal entries. Prevent negative obligations and duplicate semantic sources with constraints/locks. A confirmed refund reverses its original allocation, not an arbitrary current installment. Daily tasks are idempotent; preserve effective versus recorded time. Do not count future scheduled interest as already owed/earned without the defined disclosure label.
- [ ] Run the named tests, including a real separate-connection duplicate-disbursement race and multiple partial-payment/reversal parameter sets. No external network provider is needed.
- [ ] Commit with `feat(pixelvault): add auditable loan servicing and sandbox transfers`.

### Task 3.2: PixelFlow checkout, authenticated events and recovery

**Files:** create `apps/api/payments/{models,contracts,pixelflow,operations,inbox,recovery,views,tasks}.py`, `apps/api/payments/tests/{test_checkout_contract,test_webhook,test_recovery,test_payment_races}.py`; add configured SDK dependency and webhook routes. Use the signatures and field names recorded in the integration note without inventing PixelFlow methods.

**Interfaces:** consumes phase 3.1 ledger and phase 1 permission/audit contracts; produces `PayableSnapshot`, `CheckoutLink`, `create_checkout(*, payable: PayableSnapshot, operation_id: UUID) -> CheckoutLink`, `receive_webhook(*, routing_id: UUID, raw_body: bytes, signature: str, event_id_header: str) -> InboxReceipt`, `apply_event(*, inbox_id: UUID) -> ApplyResult`, `recover_events(*, routing_id: UUID, cursor: str | None) -> RecoveryResult`. The adapter calls `Pixelflow(...).create_checkout(payload, str(operation_id))`; payload `version` maps to returned/event `payable_version`.

- [ ] Write `test_exact_checkout_request_and_server_scope`, `test_client_price_or_routing_rejected`, `test_pending_collectible_blocks_parallel_checkout`, `test_timeout_reuses_original_key`, `test_signature_raw_bytes_expiry_and_header_id`, `test_wrong_project_tenant_environment_amount_currency_or_version_rejected`, `test_event_before_mapping_recovers`, `test_same_payment_cash_and_success_allocate_once`, `test_duplicate_refund_different_event_id_reverses_once`, `test_refund_before_collection_waits_for_recovery`, `test_lower_projection_version_does_not_erase_fact`, `test_paginated_recovery_cursor_replay_is_safe`, `test_redirect_and_uploaded_screenshot_cannot_pay_loan`. Assert collection success leaves lender settlement `unknown`.
- [ ] Run `uv run pytest apps/api/payments/tests/test_checkout_contract.py apps/api/payments/tests/test_webhook.py apps/api/payments/tests/test_recovery.py apps/api/payments/tests/test_payment_races.py -q`. Use the actual SDK against pytest-httpx fixtures; no real SDK network connection escapes the mock.
- [ ] Implement server-owned routing profiles, persist-before-dispatch operations, exact snapshots, `Pixelflow-Signature`/`Pixelflow-Event-ID` verification, durable inbox and a shared validation/application path for webhook and authenticated event-list recovery. Unique `(routing_id,payment_id)` and `(routing_id,refund_id)` financial sources complement event-ID uniqueness. Retain awaiting-mapping/orphan-refund states; persist recovery work before 2xx. Pending refunds reserve the refundable amount; provider capabilities constrain allowable requests. Do not put SDK/API keys in React or guess payout endpoints.
- [ ] Run the named tests and schema validation. PostgreSQL tests prove concurrent duplicate delivery and collectible-reservation safety; test invalid signatures cannot create financial rows. Recovery can resume after a worker/broker failure from durable state.
- [ ] Commit with `feat(pixelvault): integrate replay-safe PixelFlow collections`.

### Task 3.3: One-time commission accrual and separate fee collection

**Files:** create `apps/api/servicing/commission.py`, `apps/api/servicing/tests/test_commission.py`; extend servicing models and payment payable-purpose validation.

**Interfaces:** consumes confirmed disbursement and payment ledger; produces `accrue_commission(*, loan_id: UUID, disbursement_id: UUID) -> CommissionAccrual`, `reverse_commission(*, accrual_id: UUID, reason: str, operation_id: UUID) -> CommissionAdjustment`. Fee collection is an ordinary separate approved-purpose `PayableSnapshot`; it never deducts from repayment or moves money to a lender.

- [ ] Write `test_confirmed_1000000_at_200bps_accrues_20000_once`, `test_unfunded_or_failed_loan_accrues_zero`, `test_repayment_creates_no_new_fee`, `test_accrual_is_not_fee_collected`, `test_lender_fee_not_deducted_from_borrower_proceeds`, `test_disbursement_reversal_compensates_fee`, `test_partial_repayment_does_not_refund_origination_fee` and `test_missing_fee_routing_keeps_live_origination_disabled`.
- [ ] Run `uv run pytest apps/api/servicing/tests/test_commission.py -q` and observe the missing policy/identity behavior.
- [ ] Implement unique accrual per funded loan/policy, exact basis-point rounding, proposed lender-paid fee and separate pending/collected/reversed records. The 200 bps value is a demo policy, never a production default. Unexpected partial disbursement is an exception rather than a completed loan/fee trigger. Reversal rules are versioned and disclosed.
- [ ] Run this file plus affected checkout-contract tests and verify no platform-fee entry occurs when posting an installment collection.
- [ ] Commit with `feat(pixelvault): separate origination fees from repayments`.

### Task 3.4: Private loan timeline, payments, people and documents

**Files:** create `apps/api/servicing/{serializers,views}.py`, `apps/api/servicing/tests/test_member_reads.py`, `apps/web/src/features/loans/{LoanDetail,PaymentReview,PaymentsPage,PeoplePage,DocumentsPage}.tsx`, `apps/web/src/features/loans/{LoanDetail,PaymentReview}.test.tsx`. Add member routes from the surface brief and typed API contracts.

**Interfaces:** consumes loan projections, permitted documents and checkout creation; produces scoped `/api/v1/loans/{id}`, `/loans/{id}/timeline`, `/loans/{id}/payments`, `/payments`, `/people`, `/documents` reads and a server-authorized payment-start action. Document endpoints call phase 1 grants; association lists expose only actual counterparties and permitted fields.

- [ ] Write backend `test_other_member_cannot_read_loan_or_receipt`, `test_people_list_only_actual_associations`, `test_private_reviewer_notes_not_in_timeline`. Component tests assert next due date, principal/accrued/projected labels, full payment summary, pending/uncertain states, partial/early payoff, reversal notices, test-mode markers and retained repayment navigation. `test_collection_does_not_render_lender_settled` must show “Settlement unknown” without an invented payout time.
- [ ] Run `uv run pytest apps/api/servicing/tests/test_member_reads.py -q` and `npm test -- apps/web/src/features/loans/LoanDetail.test.tsx apps/web/src/features/loans/PaymentReview.test.tsx` to observe missing behavior.
- [ ] Implement shared factual timeline and labeled balances; full payment-review route before hosted checkout. Never accept screenshot evidence as confirmed collection. Receipts are acknowledgments with accurate issuer/transaction identity; do not claim BIR certification. Use shared controls, skeleton/empty/error states and reduced motion; read Impeccable craft-floor before UI edits.
- [ ] Run these tests, `npm run typecheck`, `npm run check:ui` and schema validation. Assert no legal identity evidence appears in public/API fields or payer-safe gateway metadata.
- [ ] Commit with `feat(pixelvault): add private loan and payment workspace`.

**Phase acceptance:** the synthetic vertical slice reaches repayment and reversal with traceable balances, private documents and a separate one-time fee. Real PixelFlow collection contracts are tested, while real disbursement and individual-lender settlement remain explicitly unsupported until approved adapters exist.
