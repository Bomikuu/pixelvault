# PixelVault Origination Implementation Plan

> Original task definition. Native collaboration tools were used because the named helper skills were not installed. Actual delivered behavior, verification and remaining deployment dependencies are recorded in [implementation status](../IMPLEMENTATION.md); original task checklists are retained as the planning baseline.

**Goal:** Deliver comparable offers, private borrower applications, exact disclosures and mutual agreement without overcommitting an individual lender's declared capacity.

**Architecture:** Pure financial/date calculations feed immutable terms; transactional marketplace services reserve capacity; authenticated acceptances bind two individuals to one hash. React routes consume those server records.

**Tech Stack:** Phase 1 runtime; Python Decimal/date, PostgreSQL locks, DRF, React/Shadcn, pytest and Testing Library.

**Spec:** [PixelVault design](../specs/2026-10-28-pixelvault-design.md), §§5–7. Depends on [phase 1](2026-10-28-pixelvault-1-foundation.md).

## Global Constraints

- One individual lender and one individual borrower are the contractual counterparties to each loan.
- Production has no permissive fallback policy.
- Financial state is never client-authoritative.
- No network call occurs while holding a financial database transaction.
- Live money remains disabled until the model and payment arrangements are actually approved.
- All exact calculation values below are synthetic test policy, not proposed legal ceilings or approved commercial rates. No builds/browser/visual/manual app checks; PostgreSQL for races; targeted automated UI/type/boundary checks.

## Review Focus

- Original day-of-month must survive a short February without March date drift — task 2.1.
- Bool/float amounts and non-convergent cost calculations must block acceptance — task 2.1.
- Concurrent selection, expiry and commitment must never reserve the same capacity twice — task 2.2.
- One party accepting a stale hash must not complete agreement — task 2.3.
- A client-edited price, terms version or private applicant URL must not change server truth — tasks 2.2–2.4.

### Task 2.1: Frozen terms, frequencies and complete disclosures

**Files:** create `apps/api/agreements/{types,schedule,disclosures,models}.py`, `apps/api/eligibility/policies.py`, `apps/api/agreements/tests/{test_schedule,test_disclosures}.py`.

**Interfaces:** consumes policy/eligibility from phase 1; produces frozen `Fee(code: str, amount: int, timing: str)`, `LoanTerms(principal: int, currency: str, annual_rate_bps: int, frequency: str, installment_count: int, effective_date: date, due_dates: tuple[date, ...], policy_version: str, borrower_fees: tuple[Fee, ...], lender_fees: tuple[Fee, ...])`, `InstallmentLine(due_date: date, principal: int, interest: int, charges: int, total: int)`, `Schedule(lines: tuple[InstallmentLine, ...], total_repayment: int, net_proceeds: int)`, `generate_due_dates(*, effective_date: date, frequency: str, count: int, anchor_day: int | None = None) -> tuple[date, ...]`, `build_schedule(terms: LoanTerms) -> Schedule`, `effective_annual_rate(*, net_proceeds: int, start: date, dated_payments: tuple[tuple[date, int], ...]) -> Decimal`, `build_disclosure(terms: LoanTerms) -> DisclosureSnapshot`. `Fee.timing` is `upfront` or a specified contractual due event; the borrower/lender tuple fixes payer, with no ambiguous fee ownership.

- [ ] Write the exact numerical test:

```python
def test_monthly_act365_fixture():
    schedule = build_schedule(monthly_fixture())
    assert [x.principal for x in schedule.lines] == [333333, 333333, 333334]
    assert [x.interest for x in schedule.lines] == [10192, 6575, 3397]
    assert [x.total for x in schedule.lines] == [343525, 339908, 336731]
    assert schedule.total_repayment == 1020164
    assert schedule.net_proceeds == 1000000
```

  `monthly_fixture()` is exactly the spec's 2026-10-28/2026-11-28/2026-12-28/2027-01-28, principal `1000000`, annual `1200` bps synthetic example. Also write `test_january_31_clamps_february_then_restores_march_31`, `test_twice_monthly_is_15th_and_month_end`, `test_weekly_is_seven_calendar_days`, `test_final_installment_gets_principal_residual`, `test_reject_bool_float_negative_and_unsupported_currency`, `test_zero_interest_zero_fee_eir_is_zero`, `test_borrower_fee_increases_eir`, and `test_unapproved_policy_blocks_acceptance`.
- [ ] Run `uv run pytest apps/api/agreements/tests/test_schedule.py apps/api/agreements/tests/test_disclosures.py -q` and observe failures for the intended calculations.
- [ ] Implement equal principal, ACT/365 fixed, half-up centavo rounding and the pinned date semantics. EIR uses dated borrower cash flows with Decimal precision 36: bracket from annual rate 0 to 1, double the upper bound until sign change or 1024, then bisect for at most 256 iterations until NPV error is below `0.005` centavo and the rate interval below `1e-10`. Reject failure or invalid cash flows instead of returning zero. This numerical bound is not a permissible product rate. Store unrounded EIR to at least ten decimal places; display annual percentage to two places alongside the exact schedule/fees. Production policy activation requires a named reviewer and evidence reference.
- [ ] Run the same tests. Add property-based or parameterized coverage that principal sums exactly, amounts stay integer, dates strictly increase and disclosed cost equals schedule/fee cash flows. Do not add redundant tests of dataclass getters.
- [ ] Commit with `feat(pixelvault): add disclosed reducing-balance schedules`.

### Task 2.2: Private applications and locked offer reservations

**Files:** create `apps/api/marketplace/{models,offers,applications,reservations,serializers,views}.py`, `apps/api/marketplace/tests/{test_applications,test_capacity}.py`. Add marketplace routes in `apps/api/config/urls.py`.

**Interfaces:** consumes `LoanTerms`, `build_disclosure`, `authorize`, `check_eligibility`; produces `publish_offer(*, lender_id: UUID, terms: LoanTerms, declared_amount: int, operation_id: UUID) -> LendingOffer`, `apply_to_offer(*, borrower_id: UUID, offer_id: UUID, requested_terms: LoanTerms, operation_id: UUID) -> LoanApplication`, `select_application(*, lender_id: UUID, application_id: UUID, expected_offer_version: int, operation_id: UUID, at: datetime) -> OfferReservation`, `expire_reservations(*, at: datetime) -> int`.

- [ ] Write `test_applicants_cannot_read_each_other`, `test_lender_sees_only_consent_scoped_summary`, `test_self_loan_rejected`, `test_duplicate_active_application_rejected`, `test_client_amount_is_not_trusted`, `test_same_operation_returns_original`, `test_changed_payload_same_key_returns_409`. PostgreSQL `transaction=True` tests `test_two_selections_cannot_exceed_1000000_capacity` and `test_selection_expiry_commit_race_has_one_winner` use separate connections and barriers; total live reservations/commitments must never exceed `1000000` in the fixture.
- [ ] Run `uv run pytest apps/api/marketplace/tests/test_applications.py apps/api/marketplace/tests/test_capacity.py -q` with PostgreSQL and observe the missing invariants.
- [ ] Implement offer/application state transitions, immutable published versions and transaction-safe 24-hour reservations. Use row locks plus constraints/unique operation identities; no browser-only or Redis lock. Apply current eligibility and capacity at selection, not only list time. Return redacted summaries rather than uploaded evidence. Endpoints: `POST /offers`, `POST /offers/{id}/publish`, `POST /offers/{id}/applications`, `POST /applications/{id}/select`, `POST /applications/{id}/withdraw` under `/api/v1`; object ownership is server-derived.
- [ ] Run the named tests. Verify a lender's declaration is not recorded as received cash or a withdrawable balance, and application declines produce no adverse reputation event.
- [ ] Commit with `feat(pixelvault): add private applications and reserved offers`.

### Task 2.3: Immutable agreement and mutual acceptance

**Files:** create `apps/api/agreements/{canonical,acceptance,rendering,views}.py`, extend `agreements/models.py`, create `apps/api/servicing/models.py` for the initial loan lifecycle, and add `apps/api/agreements/tests/test_acceptance.py`. Document routes in OpenAPI.

**Interfaces:** consumes reservation, terms/disclosures and purpose eligibility; produces `prepare_agreement(*, reservation_id: UUID, actor_id: UUID) -> AgreementVersion`, `accept_agreement(*, member_id: UUID, agreement_id: UUID, expected_hash: str, operation_id: UUID, at: datetime) -> AcceptanceResult`, `render_agreement(*, agreement_id: UUID, actor_id: UUID) -> DocumentRecord`. Canonical serialization pins parties, terms/disclosures, template and policy versions before SHA-256. `AcceptanceResult` includes agreement state and optional created `loan_id`.

- [ ] Write `test_both_named_parties_accept_same_hash`, `test_stale_hash_returns_409`, `test_staff_cannot_sign_for_member`, `test_expired_reservation_cannot_commit`, `test_acceptance_rechecks_expired_eligibility`, `test_concurrent_second_acceptance_creates_one_loan`, `test_template_change_creates_new_version`, `test_terms_are_not_overwritten`, `test_signed_document_private_to_parties` and `test_test_signature_is_not_claimed_live`. Assert commitment moves reserved principal to committed exactly once and creates `awaiting_disbursement`, never `active`.
- [ ] Run `uv run pytest apps/api/agreements/tests/test_acceptance.py apps/api/marketplace/tests/test_capacity.py -q` and observe failures before acceptance implementation.
- [ ] Implement atomic acceptance/commitment, explicit expiry, template approval metadata and private reproducible document rendering. Test templates are labeled unreviewed and cannot unlock live money. E-signing provider is an adapter; demo authenticated acceptance is not misrepresented as a reviewed production signature. Routes: `GET /agreements/{id}`, `POST /agreements/{id}/accept`, `GET /agreements/{id}/document`.
- [ ] Run the named checks plus schema validation. Test an attempted post-acceptance term edit fails and a genuine amendment preserves the old agreement.
- [ ] Commit with `feat(pixelvault): bind mutual acceptance to immutable terms`.

### Task 2.4: Offer, application and agreement routes

**Files:** create `apps/web/src/features/origination/{OfferForm,OfferDetail,ApplicationForm,ApplicationCompare,AgreementReview}.tsx`, `apps/web/src/features/origination/{OfferFlow,AgreementReview}.test.tsx`, and generated request types. Extend router with the routes in the community/workspace briefs.

**Interfaces:** consumes the exact preceding APIs; produces a full-page flow from offer to private application to final review. Comparison shows the same authorized attributes for each applicant. A lender selection never renders borrower agreement as already accepted.

- [ ] Write tests asserting total repayment, net proceeds, fee payer, exact dates, rate basis and effective cost appear before the acceptance action; `test_terms_changed_requires_fresh_review`, `test_select_is_not_borrower_acceptance`, `test_private_application_inaccessible`, `test_pending_review_explains_missing_action` and `test_reservation_expiry_preserves_entered_non_sensitive_form_state`. Use keyboard navigation and accessible error-summary assertions.
- [ ] Run `npm test -- apps/web/src/features/origination/OfferFlow.test.tsx apps/web/src/features/origination/AgreementReview.test.tsx` and observe the missing flows.
- [ ] Implement focused routes using shared controls, pending/expired/changed-term states and server-generated financial previews. No client-authoritative calculator, hidden cost, highest-interest bidding pressure or real loan claims from demo data. Read Impeccable craft-floor immediately before UI edits.
- [ ] Run the two component files, `npm run typecheck`, `npm run check:ui` and regenerate/validate API types after endpoint changes.
- [ ] Commit with `feat(pixelvault): add transparent origination screens`.

**Phase acceptance:** two synthetic individuals can publish, privately apply, compare, reserve, review exact disclosures and mutually accept one immutable loan. Capacity remains correct under concurrency. The result awaits disbursement; no cash, commission collection or live authorization is fabricated.
