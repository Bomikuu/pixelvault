# PixelVault Operations Implementation Plan

> Original task definition. Native collaboration tools were used because the named helper skills were not installed. Actual delivered behavior, verification and remaining deployment dependencies are recorded in [implementation status](../IMPLEMENTATION.md); original task checklists are retained as the planning baseline.

**Goal:** Deliver private hardship/dispute handling, staff operations, accurate analytics, recovery and a documented boundary between a working test product and an authorized live service.

**Architecture:** Case records and versioned decisions coordinate existing evidence, agreements and ledger facts. Scoped reporting derives from the same immutable history. Background recovery and server-side live activation controls are independently testable.

**Tech Stack:** Existing Django/PostgreSQL/Celery and React/Shadcn stack, pytest/Testing Library, safe export/document adapters and container deployment configuration.

**Spec:** [PixelVault design](../specs/2026-10-28-pixelvault-design.md), §§4, 8–12. Depends on phases 1–4.

## Global Constraints

- Production has no permissive fallback policy.
- Financial state is never client-authoritative.
- No network call occurs while holding a financial database transaction.
- Projected future interest is not earned income.
- No platform commission on repayments.
- Live money remains disabled until the model and payment arrangements are actually approved.
- No social-media debt shaming, threats of arrest, automatic government filings or contact harvesting. Use synthetic fixtures and mocked providers; no builds/browser/visual/manual app checks.

## Review Focus

- A hardship amendment must preserve the old terms/ledger and require mutual acceptance — task 5.1.
- Deletion requests and legal holds must not silently destroy required evidence — task 5.1.
- Pagination, refunds and incomplete periods must not misstate earnings or settlement — task 5.2.
- CSV formulas and short-lived exports must not become a data-exfiltration route — task 5.2.
- Broker downtime, missed events or a missing live dependency must recover safely or fail closed — task 5.3.

### Task 5.1: Private cases, notices, amendments and evidence retention

**Files:** create `apps/api/cases/{models,services,notices,amendments,views}.py`, `apps/api/cases/tests/{test_cases,test_notices,test_amendments}.py`, `apps/api/documents/tests/test_retention.py`, extend `apps/api/documents/retention.py`, add `apps/web/src/features/cases/{CaseDetail,HardshipForm,ComplaintForm}.tsx`, `apps/web/src/features/admin/CaseQueue.tsx`, and `apps/web/src/features/cases/CaseDetail.test.tsx`.

**Interfaces:** consumes authorization, private grants, agreement acceptance and financial projections; produces `open_case(*, actor_id: UUID, loan_id: UUID | None, kind: str, body: str, operation_id: UUID) -> Case`, `decide_case(*, actor_id: UUID, case_id: UUID, expected_version: int, decision: str, reason: str) -> Case`, `propose_amendment(*, actor_id: UUID, loan_id: UUID, terms: LoanTerms, reason: str) -> AgreementVersion`, `schedule_notices(*, at: datetime) -> NoticeBatch`, `apply_retention(*, at: datetime, dry_run: bool) -> RetentionReport`.

- [ ] Write `test_case_access_is_party_or_assigned_staff_only`, `test_unproved_complaint_does_not_mark_fraud`, `test_suspended_member_can_open_complaint`, `test_amendment_requires_both_acceptances_and_preserves_original`, `test_no_automatic_capitalization_or_rollover`, `test_notice_quiet_hours_and_frequency`, `test_reference_never_treated_as_guarantor`, `test_government_remedy_requires_human_eligibility_review`, `test_legal_hold_prevents_document_deletion`, `test_expired_grant_or_revoked_staff_cannot_export_evidence` and component `test_hardship_form_shows_next_step_without_public_badge`.
- [ ] Run `uv run pytest apps/api/cases/tests apps/api/documents/tests/test_retention.py -q` and `npm test -- apps/web/src/features/cases/CaseDetail.test.tsx` and observe missing workflow behavior.
- [ ] Implement private cases and reasoned/versioned decisions, separate unresolved versus substantiated findings, borrower/lender response and appeal. Create signed amendment proposals through phase 2 acceptance instead of editing the original schedule. Notices have consent/channel rules; proposed demo quiet hours are 20:00–08:00 Asia/Manila and max one debt reminder per day across channels, with approved production policy required. Test notification adapters capture messages locally, never send real SMS/email. Evidence export is a factual bundle; it cannot claim a barangay or court filing. Apply approved retention rules and holds with audit and deletion evidence.
- [ ] Run the named tests, typecheck, `check:ui` and schema validation. Verify redacted support views and authoritative finance decisions remain distinct, and no notice can call a social-media posting operation.
- [ ] Commit with `feat(pixelvault): add private recovery and dispute operations`.

### Task 5.2: Accurate reporting and purpose-limited admin workspaces

**Files:** create `apps/api/reporting/{queries,metrics,exports,views}.py`, `apps/api/reporting/tests/{test_metrics,test_exports}.py`, `apps/web/src/features/analytics/AnalyticsPage.tsx`, `apps/web/src/features/admin/{WorkQueues,ReconciliationPage,CommissionPage,TemplatePoliciesPage,AuditPage}.tsx`, and `apps/web/src/features/analytics/AnalyticsPage.test.tsx`. Add server-filtered queue APIs to the owning modules, not a universal bypassing admin service.

**Interfaces:** consumes ledger/commission/case/audit records; produces `member_metrics(*, actor_id: UUID, role: str, start: datetime, end: datetime) -> MemberMetrics`, `operations_metrics(*, actor_id: UUID, start: datetime, end: datetime) -> OperationsMetrics`, `request_export(*, actor_id: UUID, purpose: str, filters: ExportFilters) -> ExportJob`. Date filters use start-inclusive/end-exclusive instants derived from the selected Manila dates.

- [ ] Write `test_metrics_use_full_period_not_first_page`, `test_projected_interest_not_earned_income`, `test_refunds_reduce_confirmed_collections_once`, `test_lender_settlement_unknown_not_paid_out`, `test_commission_earned_collected_reversed_separate`, `test_loss_not_hidden_in_repaid`, `test_member_cannot_report_other_member`, `test_csv_formula_cells_neutralized`, `test_export_download_rechecks_permission_and_expiry`, `test_aggregate_above_js_safe_integer_uses_decimal_string`, `test_empty_period_has_true_zeros_no_fake_comparison`. Component tests assert precise labels, date-basis explanations and no claim of a withdrawable wallet balance.
- [ ] Run `uv run pytest apps/api/reporting/tests/test_metrics.py apps/api/reporting/tests/test_exports.py -q` and `npm test -- apps/web/src/features/analytics/AnalyticsPage.test.tsx` and observe missing metric/scope behavior.
- [ ] Implement server aggregates with an explicit definition for every metric, period basis, pending/uncertain/reversed values and accessible zero states. Staff queues show assignment/version conflicts and require the owning service's permissions. Export jobs store only purpose-scoped results, use short-lived grants and reauthorize at download. Disable production policy/template activation if evidence or required review is missing. Do not imply templates have been reviewed merely because staff clicked Save.
- [ ] Run the named tests, typecheck and UI boundary checks. Validate chart/table data share the same server totals; charts are optional when a table explains the data better. No browser inspection is implied by these automated checks.
- [ ] Commit with `feat(pixelvault): add scoped operations and truthful analytics`.

### Task 5.3: Durable recovery, activation controls and deployment handoff

**Files:** create `apps/api/config/live_policy.py`, `apps/api/tests/{test_live_policy,test_recovery_scenario,test_security_scenario}.py`, `scripts/dev.py`, runtime Dockerfiles, environment-variable templates with no secrets, `docs/operations/{deployment,recovery,privacy,incident-response,launch-readiness}.md`, and a synthetic seed command in `apps/api/accounts/management/commands/seed_demo.py`. Extend phase 1 `apps/api/audit/outbox.py` with recovery/delivery and Compose/runtime configuration as needed. A Dockerfile is deliverable source; do not run its build without an explicit request.

**Interfaces:** consumes every prior domain contract; produces `assert_live_origination_allowed(*, member_id: UUID, routing_id: UUID, policy_id: UUID, at: datetime) -> None`, `recover_pending_work(*, at: datetime, limit: int) -> RecoveryReport`, and a seed command requiring test mode. Activation checks cover current model/lender eligibility, current policy/template/signing/privacy evidence, real KYC adapter and approved routing for disbursement, repayment, settlement and platform fees. A browser or environment flag alone cannot override missing records.

- [ ] Write `test_any_missing_live_dependency_blocks_origination`, `test_test_adapter_cannot_run_live`, `test_live_disabled_still_allows_existing_repayment`, `test_seed_refuses_live_and_real_contacts`, `test_worker_broker_outage_recovers_durable_work`, `test_restore_replay_keeps_same_financial_sources`, `test_complete_two_person_synthetic_lifecycle`, `test_no_secret_or_identity_document_in_logs`, `test_rate_limit_does_not_remove_complaint_access`. The lifecycle test uses actual domain services, local PostgreSQL and mocked external HTTP; it is not a browser or real-money test.
- [ ] Run `uv run pytest apps/api/tests/test_live_policy.py apps/api/tests/test_recovery_scenario.py apps/api/tests/test_security_scenario.py -q` and observe the missing activation/recovery guarantees.
- [ ] Implement fail-closed server gates, durable inbox/outbox sweeps and bounded retries, safe health endpoints, secure origin/CSRF/cookie settings, log redaction, backup/restore procedures and named recovery ownership. Document tested configuration separately from unexecuted deployment steps. Record secrets through deployment secret storage, never sample literal keys. Keep fixture seed data visibly fictional and all notifications captured locally.
- [ ] Run the named acceptance scenario plus a single consolidated targeted backend/component suite across changed domain boundaries, `npm run typecheck`, `npm run check:ui`, schema validation and dependency-boundary checks. Run no build or browser/visual/manual verification. Existing applications need no tests because they were not modified.
- [ ] Commit with `chore(pixelvault): document recovery and gate live origination`. Handoff reports actual automated results, simulated integrations, unresolved live providers and authorization evidence without claiming deployment or commercial readiness.

**Phase acceptance:** the complete test product covers community, private servicing and staff operations with reliable recovery. Launch-readiness records still distinguish missing legal/provider/signature approvals from implemented software. No phase changes the mandatory P2P model to conceal a blocker.
