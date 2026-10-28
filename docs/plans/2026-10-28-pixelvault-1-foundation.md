# PixelVault Foundation Implementation Plan

> Original task definition. Native collaboration tools were used because the named helper skills were not installed. Actual delivered behavior, verification and remaining deployment dependencies are recorded in [implementation status](../IMPLEMENTATION.md); original task checklists are retained as the planning baseline.

**Goal:** Deliver secure dual-role accounts, controlled verification and lender-registration review, and the PixelVault application shell without live origination.

**Architecture:** Standalone Django session API and PostgreSQL authorization records, private document adapters and React/Shadcn shells. Establish the testable boundary before offers or payments.

**Tech Stack:** Django/DRF, Python 3.13, PostgreSQL, Celery/Redis, React/TypeScript, Vite, Vitest/Testing Library, pytest-django and private object storage.

**Spec:** [PixelVault design](../specs/2026-10-28-pixelvault-design.md), §§2–4; shared contracts and constraints in the [master plan](2026-10-28-pixelvault-implementation.md).

## Global Constraints

- Individual-to-individual lending is mandatory.
- Production has no permissive fallback policy.
- Financial state is never client-authoritative.
- Live money remains disabled until the model and payment arrangements are actually approved.
- Synthetic fixtures only; use PostgreSQL for acceptance. Preserve existing repositories. No builds/browser/visual/manual app checks; run targeted automated tests and `check:ui` after UI work.

## Review Focus

- A member guessing another document UUID receives no metadata or URL — task 1.2.
- Suspended members keep repayment/document/complaint access while losing new borrowing — task 1.1.
- Upload completion, sandbox liveness or expired income evidence cannot imply live approval — task 1.2.
- An individual registration review cannot imply an external license — task 1.2.
- Mobile navigation and empty states cannot fabricate available credit — task 1.3.

### Task 1.1: Runtime, sessions and purpose-specific authorization

**Files:** create `pyproject.toml`, root and `apps/web`, `packages/ui`, `packages/contracts` `package.json` manifests, `compose.yaml`, `apps/api/manage.py`, `apps/api/config/{settings,urls,celery}.py`, `apps/api/accounts/{models,permissions,services,views}.py`, `apps/api/eligibility/{models,services}.py`, `apps/api/audit/{models,services,outbox}.py`, `apps/api/accounts/tests/test_access.py`, `apps/api/tests/conftest.py`, `scripts/check-ui.mjs`, `vitest.config.ts` and the root TypeScript/pytest configuration. Copy reviewed planning/brand files into the new repository; create its AGENTS.md with verification and shared-control rules. Generate and commit dependency locks for reviewed compatible versions.

**Interfaces:** consumes reviewed spec only; produces `register_member(*, email: str, password: str, accepted_policy_version: str) -> Member`, `authorize(*, actor_id: UUID, action: str, subject_id: UUID | None) -> None`, `check_eligibility(*, member_id: UUID, purpose: str, at: datetime) -> EligibilityResult`, `record_audit(*, actor_id: UUID, action: str, subject_id: UUID, reason: str) -> UUID` and `enqueue_event(*, kind: str, subject_id: UUID, payload: dict, dedupe_key: str) -> UUID`. Outbox rows are durable and created in the owning transaction; delivery/recovery is completed in phase 5. Failed authorization returns a stable safe 403/404; CSRF remains enforced on session mutations. Auth routes are `POST /api/v1/auth/register`, `POST /api/v1/auth/sign-in`, `POST /api/v1/auth/sign-out`, `GET /api/v1/auth/session`; contact confirmation uses sandbox adapters until a production provider is selected.

- [ ] Write `test_registration_requires_policy_acceptance`, `test_dual_role_member_uses_one_session`, `test_member_cannot_read_other_member_private_record`, `test_csrf_required`, `test_staff_role_requires_purpose_grant` and `test_suspension_preserves_repay_view_document_complain`. At this phase test the purpose-policy result (`apply` denied, `repay`/owned-document/complaint purposes retained), without constructing a Loan model that phase 2 has not introduced. Actual loan ownership/repayment is tested in phase 3. Role alone must not grant staff access.
- [ ] Establish the minimal pinned test harness and run `uv run pytest apps/api/accounts/tests/test_access.py -q`; observe failures in missing authorization/eligibility behavior rather than a database misconfiguration. Refuse SQLite for transaction acceptance.
- [ ] Implement accounts, grants, environment restrictions and safe audit entries; secure cookies, sign-in/sign-out, rate-limit hooks and staff step-up boundaries. Until phase 5's complete evidence gate exists, all live origination/disbursement service paths fail closed server-side. Create root `typecheck`, `test` and `check:ui` scripts without any routine build step. `check:ui` rejects raw action/form/table primitives outside `packages/ui/src/components/ui`.
- [ ] Run the named backend tests plus `npm run typecheck` and the UI-boundary script's own fixtures. Confirm protected-source paths and API credentials are absent from client configuration.
- [ ] Commit only this task's runtime/accounts files and copied planning context with `feat(pixelvault): add secure member foundation`.

### Task 1.2: Private evidence and independent registration review

**Files:** create `apps/api/documents/{models,storage,scanning,services,retention}.py`, `apps/api/verification/{models,providers,services,views}.py`, `apps/api/eligibility/registration.py`, `apps/api/documents/tests/test_document_access.py`, `apps/api/verification/tests/test_review.py`, `apps/api/eligibility/tests/test_registration.py`. Extend eligibility services to read named current evidence.

**Interfaces:** consumes `authorize`, `record_audit`, `EligibilityResult`; produces `request_upload(*, owner_id: UUID, purpose: str, content_type: str, size: int) -> UploadGrant`, `get_download_grant(*, actor_id: UUID, document_id: UUID, purpose: str) -> DownloadGrant`, `review_check(*, actor_id: UUID, case_id: UUID, expected_version: int, outcome: str, reason: str) -> VerificationCase`, `review_registration(*, actor_id: UUID, registration_id: UUID, expected_version: int, outcome: str, evidence_ref: str) -> LenderRegistration`. Download grants expire in 60 seconds as a proposed service default; no anonymous object URL is returned.

- [ ] Write `test_guessed_document_denies_metadata_and_url`, `test_quarantined_or_unscanned_file_cannot_download`, `test_grant_expires_after_60_seconds`, `test_upload_is_not_approval`, `test_expired_income_blocks_acceptance`, `test_sandbox_result_never_enables_live`, `test_registration_independent_of_identity`, `test_review_version_conflict` and `test_self_review_denied`. Assert an identity-approved member still has registration `not_submitted` and live origination disabled.
- [ ] Run `uv run pytest apps/api/documents/tests/test_document_access.py apps/api/verification/tests/test_review.py apps/api/eligibility/tests/test_registration.py -q` and confirm intended red behavior.
- [ ] Implement private storage/quarantine/scanning protocol, fake test-only KYC and scan adapters, typed evidence categories for employees/freelancers/self-employed members, assignment/version locking, expiry, evidence provenance and independent registration. Proposed upload bound is 10 MiB, PDF/JPEG/PNG only, magic-byte validation and safe filenames. Retention defaults are disabled deletion until an approved policy or legal hold is known; never silently retain everything forever as a production solution.
- [ ] Run the same tests and check that API/public serializers do not contain raw IDs, income files or direct storage keys. Provider credentials and document bodies cannot enter audit/error logs.
- [ ] Commit scoped files with `feat(pixelvault): add private verification and registration review`.

### Task 1.3: PixelVault identity, area shells and onboarding screens

**Files:** create `packages/ui/src/{components/ui,styles/tokens.css,BrandMark.tsx}`, `apps/web/src/app/{router,session,CommunityShell,MemberShell,AdminShell}.tsx`, `apps/web/src/app/api.ts`, `apps/web/src/features/onboarding/{RegisterPage,SignInPage,VerificationPage,RegistrationPage}.tsx`, `apps/web/src/features/onboarding/VerificationPage.test.tsx`, `apps/web/src/app/Navigation.test.tsx`, `packages/contracts/src/api.ts`, and `scripts/generate-api-types.mjs`. Brand exports belong in `packages/ui/src/assets/brand/` with provenance; the board remains reference material.

**Interfaces:** consumes session/eligibility/case APIs; produces shared `Button`, `Input`, `Select`, `Dialog`, `Table`, `Tabs` and related Shadcn controls, `MemberContext {memberId, capabilities, environment}`, `apiRequest<T>(path: string, init?: RequestInit): Promise<T>` with same-origin session/CSRF handling, and route guards driven by server permissions. Register/sign-in/verification are full routes. Use exact labels “Identity checked,” “Registration evidence under review” and “Test environment” only when those facts apply. Empty money panels show “No active loans,” not fictitious available credit.

- [ ] Write `test_member_switches_borrowing_lending_without_new_account`, `test_hidden_admin_route_is_also_server_forbidden`, `test_verification_errors_are_labeled`, `test_upload_pending_is_not_checked`, `test_suspension_keeps_repayment_navigation` and `test_no_fake_credit_balance`. Include keyboard focus and accessible-name assertions in Testing Library.
- [ ] Run `npm test -- apps/web/src/app/Navigation.test.tsx apps/web/src/features/onboarding/VerificationPage.test.tsx` and observe the missing UI behavior.
- [ ] Implement semantic light/dark tokens from the scoped design proposal, responsive shells and full-page account/evidence/registration forms; preserve the blue P/keyhole identity using provenance-bearing faithful standalone exports. Read Impeccable craft-floor immediately before UI edits. Use fixed UI typography and tabular money, no generated replacement brand. Track unapproved asset fidelity in implementation/brand documentation rather than adding technical provenance clutter to member flows; do not call a placeholder production-ready.
- [ ] Run the two component files, `npm run typecheck`, `npm run check:ui`, and OpenAPI schema validation. Run an automated semantic-token contrast check for the actual combinations; this does not authorize browser inspection.
- [ ] Commit scoped files with `feat(pixelvault): add branded onboarding and application shells`.

**Phase acceptance:** two synthetic individuals can sign in, submit clearly test-mode evidence, receive auditable reviewer outcomes, and use a dual-role shell with strict private access. There are no live credentials, real-money actions, approved-credit claims or legal-registration claims. Next phase consumes these interfaces without changing existing applications.
