# PixelVault Implementation Plan

> Original task plan, executed with native collaboration tools because the named helper skills were not installed. See [implementation status](../IMPLEMENTATION.md) for actual delivered behavior and remaining deployment dependencies.

**Goal:** Build a standalone Philippines-first individual lending product with the supplied PixelVault identity, private servicing and truthful PixelFlow integration.

**Architecture:** Modular Django/DRF backend, PostgreSQL financial records and background workers, one React/TypeScript app with community/member/admin areas, private object storage and isolated external adapters. PixelVault owns lending; PixelFlow owns supported payment collection. Disbursement and individual-lender settlement remain separate capabilities.

**Tech Stack:** User-confirmed Django/DRF + React/TypeScript; proposed PostgreSQL, Celery/Redis, Vite, Tailwind/Shadcn, React Router, TanStack Query, React Hook Form/Zod. Python 3.13, Django 5.2/DRF 3.16 compatible family; lock and verify supported patches at execution.

**Spec:** [2026-10-28-pixelvault-design.md](../specs/2026-10-28-pixelvault-design.md).

## Global Constraints

- Individual-to-individual lending is mandatory.
- One individual lender and one individual borrower are the contractual counterparties to each loan.
- Production has no permissive fallback policy.
- Financial state is never client-authoritative.
- No network call occurs while holding a financial database transaction.
- Projected future interest is not earned income.
- No platform commission on repayments.
- Live money remains disabled until the model and payment arrangements are actually approved.
- Preserve PixelCore's and PixelFlow's applications, data and root product/design files. Never modify `/home/bomiku1/projects/dineEase-web`.
- Tests use synthetic people/documents and mocked providers; PostgreSQL for transaction/concurrency acceptance. No builds, visual tests, browser inspections or manual app verification without an explicit user request. Run UI boundary/type/component checks for future frontend changes.

## Review Focus

1. Wrong-person access through a guessed member/document/loan URL must fail without leaking private data — phase 1 member/document authorization tests, extended to actual loan objects in phase 3.
2. Selection colliding with expiry or another applicant must never overcommit capacity — phase 2 PostgreSQL concurrency tests.
3. Month-end dates, partial/early payment and centavo residuals must preserve disclosed obligations — phase 2 schedule and phase 3 accrual tests.
4. Provider timeout, duplicate/cash events, orphan refunds and stale versions must not create or erase a financial fact — phase 3 inbox/recovery tests.
5. Suspension, hardship or a reversed payment must preserve repayment/appeal access and correct misleading public awards — phases 1, 4 and 5 tests.

## Implementation status and execution boundary

The user authorized implementation on 2026-10-28. The standalone repository now exists at `/home/micxsz/projects/pixelvault`, with the copied scoped context and byte-identical image. Native collaboration tools executed disjoint backend/frontend work; the named superpowers helpers were not installed. No additional helper was installed silently.

The five phase files preserve the original task definitions. Check [implementation status](../IMPLEMENTATION.md) for delivered test-mode behavior, actual verification and explicit deviations. Unchecked original production-adapter tasks must not be interpreted as approvals or completed deployment work. No real identities, production onboarding, real loans or real-money tests were authorized or performed.

## Delivery phases and dependencies

| Phase | Working deliverable | Depends on | Detailed plan |
| --- | --- | --- | --- |
| 1 | Secure member accounts, private verification/registration review and branded application shell | Written-plan review | [Foundation](2026-10-28-pixelvault-1-foundation.md) |
| 2 | Private offer/application/terms/signing flow with reserved capacity | 1 | [Origination](2026-10-28-pixelvault-2-origination.md) |
| 3 | Complete synthetic loan lifecycle, actual PixelFlow adapter contract, repayments and one-time fee records | 2 | [Servicing](2026-10-28-pixelvault-3-servicing.md) |
| 4 | List/map discovery, profiles, badges, messages and transaction-based reviews | 1–3 (read-only discovery can start after 2) | [Community](2026-10-28-pixelvault-4-community.md) |
| 5 | Hardship/disputes, operations, analytics, recovery and deployment readiness | 1–4 | [Operations](2026-10-28-pixelvault-5-operations.md) |

The first complete demonstrable vertical slice lands at phase 3: two synthetic individuals → reviewed eligibility → offer/application → shared agreement → sandbox disbursement → signed collection fixture → receipt/balance/fee. Phase 4 completes public social discovery; phase 5 completes operational readiness. No phase claims production authorization.

## Repository structure

```text
pixelvault/
  PRODUCT.md, DESIGN.md, AGENTS.md      copied scoped context and project rules
  docs/brand/, docs/surfaces/          reference/provenance and surface briefs
  docs/specs/, docs/plans/             reviewed spec and phased task plans
  apps/api/config/                    settings, URLs, Celery, OpenAPI
  apps/api/accounts/                  members, public identity, sessions, grants
  apps/api/verification/              check cases and review history
  apps/api/eligibility/               registration, policies, reasoned eligibility
  apps/api/documents/                 private upload, scan, grants and retention
  apps/api/marketplace/               offers, applications, locked reservations
  apps/api/agreements/                terms, schedules, disclosures, acceptance
  apps/api/servicing/                 ledger, accrual, transfers and commission
  apps/api/payments/                  PixelFlow adapter, inbox and recovery
  apps/api/community/                 discovery, achievements, reviews, messages
  apps/api/cases/                     complaints, hardship and private collections
  apps/api/reporting/                 scoped aggregates and safe exports
  apps/api/audit/                     append-only access/decision/outbox history
  apps/web/src/app/                   router, session and area shells
  apps/web/src/features/              feature-owned route/components/tests
  packages/ui/src/components/ui/      canonical Shadcn layer
  packages/ui/src/styles/             semantic tokens and dark theme
  packages/contracts/src/api.ts       generated OpenAPI client types
  scripts/                           dev/test/UI-boundary and contract commands
  compose.yaml                       local PostgreSQL and Redis; scripts/dev.py starts app/workers
```

Each backend module keeps models, policy/services, serializers/views and tests adjacent. Avoid a single giant services file: phase plans name separate reservation, accrual, acceptance and transport units. Module-level interfaces use keyword arguments and explicit typed results. Domain failures are stable reason codes, safe messages and appropriate HTTP statuses.

## Shared exact contracts

- `Money = int` centavos; per-transaction amounts must not exceed `9007199254740991`, and the approved product bound may be much lower. Reject booleans, floats, negatives where invalid and unknown currencies. Signed ledger deltas use the same absolute bound. Aggregates above JavaScript's safe-integer range serialize as decimal strings, never lossy numbers. PHP only initially.
- `EligibilityResult(allowed: bool, reasons: tuple[str, ...], policy_version: str)`; eligibility cannot be inferred from a public badge.
- `LoanTerms` and `Schedule` are frozen typed values. Rules and the exact numerical fixture are in spec §6. Request `version` and event `payable_version` are deliberately different PixelFlow field names.
- Member sessions use secure HTTP-only cookies/CSRF; server SDK keys never enter frontend payloads. Every endpoint reauthorizes object/action scope.
- Financial mutation operation IDs are persisted UUIDs bound to actor, action, scope and canonical payload. Exact retries return the original result; conflicting reuse is 409. Terminal failures and uncertain outcomes differ.
- Exact source evidence and proposed transport interfaces: [PIXELFLOW-INTEGRATION.md](../PIXELFLOW-INTEGRATION.md).

Result values shared across phases have these minimum fields, defined in the owning module's `types.py` or `contracts.py` and serialized through generated OpenAPI types. Models named in interfaces keep their field definitions in the design/owning phase; do not invent a second incompatible result shape in a later phase.

| Type | Owning task | Minimum fields |
| --- | --- | --- |
| `UploadGrant` / `DownloadGrant` | 1.2 | document UUID, URL, expiry; upload also required headers |
| `DisclosureSnapshot` | 2.1 | terms/policy version, net proceeds, schedule, fee payer/timing, annual nominal basis, EIR, total repayment, canonical hash |
| `AcceptanceResult` | 2.3 | agreement UUID/state/hash, optional loan UUID |
| `TransferResult` | 3.1 | transfer UUID, operation UUID, status, authoritative reference, effective timestamp or null, safe reason |
| `AccrualResult` | 3.1 | loan UUID, through date, newly posted interest, ledger version |
| `AllocationResult` | 3.1 | loan UUID, source key, principal/interest/charge allocations, unallocated amount, ledger version |
| `LoanProjection` | 3.1 | loan UUID, lifecycle, overdue/case facets, principal outstanding, accrued/projected interest separately, current amount due, next installment, settlement status, version |
| `InboxReceipt` / `ApplyResult` | 3.2 | inbox UUID/state; applied result additionally event UUID, semantic source key, financial entry UUID or null |
| `RecoveryResult` | 3.2 | routing UUID, processed count, deferred count, next cursor, safe failures |
| `CoarseArea` / `OfferPage` | 4.1 | area code/name/centroid/granularity; page results, normalized filters, approximate-distance labels and next cursor |
| `PublicProfileView` | 4.1 | display handle/name/avatar/optional bio/cover/coarse area, exact public check indicators, optional selected awards; no private fields |
| `AwardEvaluation` | 4.2 | rule version, awarded/revoked/held award UUIDs; reasons remain private |
| `ConductRatings` | 4.3 | communication/clarity/reliability/respect integer ratings 1–5; no debt-status rating |
| `ModerationResult` | 4.3 | content UUID, decision, version, public availability; internal reason access-controlled |
| `NoticeBatch` / `RetentionReport` | 5.1 | queued/deferred/suppressed counts and IDs; retention adds deleted/held counts and dry-run flag |
| `MemberMetrics` / `OperationsMetrics` | 5.2 | period instants, as-of/version, spec-defined separate money measures and their data completeness |
| `ExportFilters` / `ExportJob` | 5.2 | purpose, authorized role/member scope, period and resource filters; job UUID/state/expiry and authorized grant when ready |
| `RecoveryReport` | 5.3 | attempted/completed/deferred counts, safe exception IDs and next scheduled retry |

## Automated verification convention

Implemented verification commands:

```bash
uv run pytest apps/api/<module>/tests/test_<behavior>.py -q
npm test -- apps/web/src/features/<feature>/<Component>.test.tsx
npm run typecheck
npm run check:ui
uv run python apps/api/manage.py spectacular --validate --file docs/api/openapi.yaml
```

`npm test -- <path>` uses root Vitest; every named backend path uses pytest-django configuration. PostgreSQL test URL is explicit; transaction tests must not silently run on SQLite. These are targeted checks, not build commands. Feature tasks write failing tests, implement the minimum coherent behavior, run the named checks, then commit only the task files. Do not run every phase's full test suite after every small change; broaden only for new failures or changed shared contracts.

## Requirements coverage

| Requirement | Owner |
| --- | --- |
| Dual-role accounts, identity/income/liveness adapters, strict document access, lender registration | 1.1–1.3 |
| Supplied identity, accessibility, separate areas and shared controls | 1.3 and all feature UI tasks |
| Interest frequencies, EIR, fee disclosure, dates and immutable policies | 2.1 |
| Offers, private applications, selection, capacity and mutual agreement | 2.2–2.4 |
| Disbursement, private loan history, partial/early payments, PixelFlow, refunds and reconciliation | 3.1–3.2 |
| One-time commission, no repayment commission, associated parties/documents/payments | 3.3–3.4 |
| Approximate list/map, profiles, reviews, badges and messages | 4.1–4.3 |
| Hardship, disputes, private notices, retention, audit and staff permissions | 5.1 |
| Full-period member/admin analytics, losses, unknown settlement and safe exports | 5.2 |
| Recovery, incident readiness, deployment, data truth and live-launch dependencies | 5.3 |

## Execution handoff

See [implementation status](../IMPLEMENTATION.md), [README](../../README.md) and [operations](../operations/deployment.md). Production approvals, real external adapters and non-simulated acceptance remain required before any live origination. The original proposal and approval history remain in the PixelCore planning commit.
