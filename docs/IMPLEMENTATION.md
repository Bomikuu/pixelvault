# PixelVault implementation record

Implemented on 2026-10-28 in the standalone repository `/home/micxsz/projects/pixelvault`, branch `codex/implementation`, after the user instructed implementation. The original planning package remains in PixelCore commit `32a20f7`. Existing PixelCore, PixelFlow, Medframe and DineEase source was preserved.

## Delivered behavior

| Phase | Implemented test-mode scope |
| --- | --- |
| Foundation | Dual-role sessions and CSRF, private/public identity separation, literacy, check/registration review with step-up, encrypted quarantined evidence, expiring grants, role/object authorization, original brand derivatives and shared Shadcn shell |
| Origination | Offers and private applications, lender selection, locked expiring capacity, integer-centavo calculations, dated schedules/EIR, immutable policies/disclosures, two-party hash acceptance, private contract PDFs and renewed dates requiring new acceptance |
| Servicing | Explicit synthetic disbursement, append-only accrual/allocation/corrections, partial/installment/payoff checkout, receipts, separate one-time lender fee, unknown lender settlement, actual PixelFlow SDK adapter, signed inbox/deduplication, orphan/refund recovery and bounded event sweeps |
| Community | Anonymous offer list and coarse-area schematic, safe profiles, optional original badges and private corrections, learning/contributions, scoped inbox, moderated transaction reviews, replies and appeals |
| Operations | Private hardship/disputes, mutually accepted amendments preserving original terms and accrued interest, captured bounded notices, signed-delta analytics, expiring safe CSV exports, staff queues, recovery worker/scheduler and operational procedures |

Frontend routes use actual API calls. Provider errors and missing configuration are explicit states; no financial success is fabricated by the browser. Fictional fixtures exercise both member roles and staff workflows. No external money, identities, messages or notifications were used.

## Explicit implementation deviations and limits

- The original phase checklists remain planning baselines. They are not marked universally complete: production storage/scanning/MFA/signing, provider approval, operational drills and external acceptance are unfinished deployment dependencies.
- Native collaboration tools provided scoped parallel implementation; the named superpowers helper skills were absent. Impeccable's local launcher could not execute, so the product/design context and craft-floor guidance were read directly. No persistent workflow preference was changed.
- The frontend uses typed form/API handling rather than the originally proposed React Hook Form/Zod helpers. OpenAPI exports and generated types exist, with explicitly generic JSON boundaries for APIViews lacking field-level serializers; handwritten domain DTOs and integration tests cover the exact current response contracts.
- Private documents use encrypted local filesystem storage in development. S3-compatible production storage, actual malware scanning and KYC/liveness are unconfigured. Staff password step-up is test-only and is not production MFA. Agreement acceptance/PDF evidence is not certification of legal enforceability or an approved e-signing service.
- Maps use synthetic coarse areas and an explicitly labeled schematic. Licensed tiles/geocoding and designer-source vector exports remain unconfigured.
- PixelFlow collection is implemented against the inspected SDK contract and mocked HTTP/events. No approved test route or real credentials are seeded. Disbursement is synthetic; lender settlement stays unknown without separate evidence. Complex historical allocation ordering enters explicit reconciliation instead of rewriting history.
- The launcher starts development API/web/worker/scheduler processes and Compose PostgreSQL/Redis. No application build, hosted deployment, browser inspection, visual test, backup restore or real-money acceptance was performed.
- Live origination is disabled independently in policy/eligibility. The [launch-readiness list](operations/launch-readiness.md) records unresolved legal, provider and operational work; passing tests does not approve it.

## Verification evidence

Consolidated verification completed successfully:

- Backend: **185 passed** on PostgreSQL (36.38s), including transaction/concurrency, privacy/access, lifecycle, mocked SDK transport, refund/correction, recovery, reporting and API contract checks.
- Frontend: **22 passed** across 8 component/API test files; TypeScript passed.
- Shared UI boundary: **41 TSX modules** passed. All **10 semantic contrast pairs** passed, minimum **4.82:1**.
- Independent PostgreSQL review reproductions: **4 passed** after corrections; the lasting regressions are in the repository's module suites.
- Ruff, Django system checks, migration drift detection and OpenAPI validation passed. Generated TypeScript schema output was refreshed. Relative documentation links and the original brand image hash were checked.

Providers are mocked and component tests use jsdom. These results do not certify browser appearance or external acceptance.

Independent review reproduced and then verified fixes for partial fee-refund overcharging, a refund webhook arriving before its request response, and earned-interest reports omitting compensating accrual corrections. Same-key refund retries also recover uncertain requests without a second reservation. Public financial badge projections now recheck current qualifying evidence before asynchronous reevaluation, with private reasons retained privately. Regression tests cover these findings.

`manage.py check`, migration drift detection, Ruff, OpenAPI validation, generated client types, TypeScript, component tests, the shared-control boundary and semantic contrast checks are the authorized checks. No build command is used as verification.

## Graphify and Jev

Scoped graphify traces cover payments, community and frontend relationships. Frontend extraction: 29 code files, 205 nodes, 1,120 edges and 11 communities; `PaymentForm → apiRequest` and `ApiForm → operationId` were traced and checked against source. The scoped frontend graph reports **109 dangling external references and one collapsed test relation**, with no missing endpoints/self-loops. These diagnostics limit graph completeness; they are not claimed as application test failures. Community extraction: 209 nodes/567 edges. Payment extraction: 145 nodes/389 edges. Ignored graph outputs remain local.

Sanitized Jev questions were advisory only. No credentials, personal records, private messages or evidence documents were submitted. Direct source inspection and automated tests determine implementation correctness.

## Illustration and avatar update

The user requested supporting illustrations based on a new reference, named achievement artwork and profile-picture choices. The delivered update includes two built-in-generated product scenes, six original vector achievement illustrations and eight original vector avatar portraits. Server-owned achievement names/criteria drive the collection and detail pages; preset avatar choices persist to the current member and appear in public and private participant summaries. Existing earning rules, private recovery recognition and the three-award showcase limit are preserved.

The [artwork catalog](brand/artwork-catalog.svg) displays the full vector collection. Portable files live in packages/ui/src/assets/badges and packages/ui/src/assets/avatars; `node scripts/export-artwork.mjs` regenerates these and the catalog without building the app. Exact [scene prompts](brand/illustration-prompts.md) and [surface decisions](surfaces/illustrations.md) record provenance and intent.

Final verification for this update: **72 targeted PostgreSQL tests passed**, **31 frontend/artwork tests passed**, TypeScript passed, **44 TSX modules** passed the shared-control boundary, all **10 semantic contrast pairs** passed (minimum 4.82:1), scoped Ruff/Django/migration checks passed and the OpenAPI/types were refreshed. All 15 SVG exports/catalog parse with unique IDs and valid internal references. A fresh source review found and verified fixes for stale revoked-badge selections and missing avatars in shared participant summaries. No application build, browser inspection or manual/visual app test was run.

Graphify traced the incumbent profile/achievement dependencies; its stale scoped graphs and legacy-ID warnings were treated as advisory, with changed relationships checked directly against source. Sanitized Jev responses informed review priorities and did not decide award eligibility.

See [README](../README.md) for local startup, fictional login accounts and test commands; [operations](operations/deployment.md) for recovery/privacy procedures; and [PixelFlow evidence](PIXELFLOW-INTEGRATION.md) for the verified external contract and pagination correction.

## Login, infographic, recovery and expanded awards

The user identified missing login, infographic, error and additional-award coverage. The follow-up adds three new built-in-generated scenes, responsive login/register artwork, public `/how-it-works` with seven accessible ordered steps, illustrated catch-all 404 and actual route-error boundaries. Raw internal error details are hidden; errors never establish a payment outcome. Auth, navigation and Help link the infographic. Exact prompts and scene locations are in the existing illustration prompt record.

Bright Start, Good Neighbor, Shared Wisdom and Community Guide extend the catalog to ten achievements using actual literacy completion and 1/3/10 distinct moderator-approved contributions. Existing six earning rules remain unchanged, including Helping Hand at five. Public educational-award projections recheck current facts immediately after a moderation correction; durable evaluation preserves private correction history. No borrowing or loan-size incentive is added. Ten badge SVGs and eight avatars are exported with a count-driven responsive catalog.

Final scoped verification: **85 targeted PostgreSQL tests passed**, **39 frontend/artwork tests passed**, TypeScript passed, **46 TSX modules** passed UI boundaries and all ten semantic contrast pairs passed (minimum 4.82:1). Scoped Ruff, Django checks, migration drift checks and SVG/reference validation passed (20 files, including two identical catalog copies). Fresh source review corrected accrual-versus-collection wording and overly absolute synthetic-member copy. No app build, browser inspection or visual/manual app test was run. Scoped graph warnings remain advisory and do not substitute for direct source and automated checks.
