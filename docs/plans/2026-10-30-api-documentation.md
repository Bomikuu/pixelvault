# PixelVault API documentation implementation plan

> Execute natively, one task at a time. No subagents. This is a proposed plan, not authorization to run builds, automated verification or live financial operations.

**Goal:** Deliver a staff-protected, branded API reference that explains real PixelVault contracts and can support the web and mobile clients.

**Architecture:** Render self-hosted Scalar from Django, reading the protected drf-spectacular schema. Put contract annotations beside each domain and authored guides in `docs/api`; generate client types from the reviewed local export. Keep API behavior and authorization in their existing owners.

**Tech Stack:** Existing Django/DRF, drf-spectacular, OpenAPI 3.0.3, TypeScript/openapi-typescript; one pinned `@scalar/api-reference` renderer distributed as a local static asset.

**Spec:** [Mobile UI and developer documentation](../specs/2026-10-30-mobile-ui-and-api-docs-design.md), especially §§5–7 and 9.

## Global constraints

- Documentation access requires active, unsuspended staff with `staff_role` equal to `developer` or `admin`; no other API authority follows from the developer role.
- Keep `/api/schema`; protect all its formats and any downloads. New reference entry: `/api/docs/`.
- Request execution is off initially. No hosted proxy, credential persistence, external scripts/fonts, telemetry or hosted SDK/MCP integration.
- Preserve existing operation IDs, wire formats, financial rules and OpenAPI 3.0.3. Examples contain synthetic values only.
- Keep live origination/funding disabled. A reference page is not provider or legal approval.
- Preserve the existing worktree changes and do not alter other repositories. Use exact task paths for atomic commits; do not use `git add .`.
- Current verification instruction is visual-only. All automated cases below are deferred release requirements; do not run them until separately authorized. No builds. This planning change needs no application verification.

## Review focus

1. Guessing a raw schema URL or alternate format must not bypass staff access — task 2's permission matrix.
2. A generic JSON response must not masquerade as a typed mobile contract — tasks 1, 3 and 6's coverage gates.
3. A document or stream must not be described as JSON, or leak a sample private file — task 4's media cases.
4. Generated snippets must not omit CSRF/revision requirements or imply universal retry safety — task 5's lifecycle review.
5. The staff browser must not transmit cookies/schema content to a third party — task 2's asset/configuration checks and task 6's network review.

## File ownership

| Paths | Responsibility |
| --- | --- |
| `apps/api/config/api_docs.py` (new) | Shared staff guard, protected schema/reference views, reference description assembly |
| `apps/api/config/templates/api_reference.html` (new) | Minimal local Scalar mount; no credential form or custom control framework |
| `apps/api/config/static/api-docs/` (new generated assets) | Pinned renderer, existing local font and logo only; no schema/examples |
| `apps/api/config/settings.py`, `urls.py` | Template/static discovery and protected routes |
| `apps/api/<domain>/schema.py` (new where absent), existing views | Domain schema serializers and explicit method annotations |
| `docs/api/operations.md`, `contract-coverage.json`, `guides/*.md` (new) | Human inventory, explicit coverage status and lifecycle guidance |
| `docs/api/openapi.yaml`, `packages/contracts/src/generated.ts` | Reviewed generated outputs, not separate handwritten truth |
| `scripts/sync-api-doc-assets.mjs`, `check-api-contracts.py` (new) | Reproducible local asset copy and focused contract gate |

## Task 1: Inventory the real API and pin the mobile slice

**Files:** Create `docs/api/operations.md` and `docs/api/contract-coverage.json`; read domain `urls.py`, views, projections and `apps/api/config/schema.py`.

**Interfaces:** Inventory entries use `{method, path, tag, access, owner, contract_status}`. `contract_status` is `typed`, `partial` or `generic`. Coverage records use existing stable operation IDs, never UI route names.

- [ ] Enumerate all registered methods and paths, including admin, recovery, co-borrower, member tools, investments and integrations. Record actual status/media types and ownership checks; do not infer methods from route names.
- [ ] Identify the first mobile slice: session/sign-in/sign-out/register, discovery/areas, offer detail/calculator/social actions, applications, member profiles, hub actions/saves/calendar, threads and meetings. Record unsupported fields and untyped operations explicitly.
- [ ] Distinguish `GET /api/v1/engagement/offers/{offer_id}/calculator` from mutations; document integer-centavo query parameters, actual frequency choices and installment bounds from its parser.
- [ ] Record existing error shapes, operation/revision requirements and binary/SSE exceptions. Preserve current generated names as a compatibility baseline.
- [ ] Commit only these inventory files: `docs(api): inventory endpoints and mobile contract gaps`.

**Acceptance:** A developer can locate an operation's source owner, permission, method and contract status without guessing. No operation is marked typed merely because it has a generic schema.

## Task 2: Deliver the protected local reference shell

**Files:** Create `apps/api/config/api_docs.py`, `apps/api/config/templates/api_reference.html`, `scripts/sync-api-doc-assets.mjs` and `apps/api/config/tests/test_api_docs.py`; modify `apps/api/config/settings.py`, `urls.py`, root `package.json`/`package-lock.json`, and deployment documentation.

**Interfaces:** `require_api_docs_staff(request) -> Member` checks authenticated identity then `staff_for(request.user.pk, roles=("developer",))`. `ApiDocsSchemaView` applies that same rule before invoking Spectacular; `api_reference(request) -> HttpResponse` applies it before HTML. No new auth endpoint.

- [ ] Define the deferred permission cases in `test_api_docs.py`: guest, ordinary member, inactive staff, suspended staff and staff with another role all receive 403 for reference/schema; active developer/admin succeed. Include accepted JSON/YAML formats and attempted format/query bypasses. No denied response contains the operation inventory.
- [ ] Add the guarded views and preserve `/api/schema`; add `/api/docs/`. Return `Cache-Control: private, no-store` and vary on Cookie. A denied HTML response links to existing sign-in; schema denial is a normal API error. Do not redirect schema fetches to HTML.
- [ ] Pin the renderer at execution using an exact compatible version and lockfile. Copy its standalone browser asset, logo and local Manrope font using the explicit sync script. Configure Django template/static directories; document static collection in the existing deployment procedure. Do not make the reference depend on a CDN or another Node server.
- [ ] Mount Scalar with `/api/schema`, `hideTestRequestButton: true`, `persistAuth: false`, telemetry off, default remote fonts off and developer tools/client launch hidden. Inspect that version's proxy defaults; explicitly disable hosted proxying. Restrict network connections and asset/font loading to self with the page CSP; use an external bootstrap or nonce for initialization. Do not populate real auth values, remote schemas, plugin URLs or MCP integrations.
- [ ] Use Scalar's light/dark and search UI, PixelVault blue/navy configuration and a local brand mark. Keep custom styling restricted to shared semantic theme configuration; no feature CSS or custom credential/action primitives.
- [ ] Commit only shell/asset/configuration files: `feat(api): add staff-only Scalar reference`.

**Acceptance:** An authorized developer sees a searchable branded reference at the existing API server; ordinary members cannot fetch the source schema. Browsing cannot send a loan/payment command. Role provisioning remains an explicit admin operation outside this task.

## Task 3: Type authentication, discovery and member tools

**Files:** Create schema modules in `accounts`, `community`, `marketplace`, `engagement`, `connections` and `memberhub`; annotate the corresponding existing views. Add `apps/api/config/tests/test_api_contracts.py` and `docs/api/guides/browser-sessions.md`.

**Interfaces:** Reusable schema serializers describe actual response projections. Use `extend_schema` on individual methods for request/query/response differences; no universal response envelope. Existing operation IDs remain unchanged.

- [ ] Define request/response schemas for the mobile slice from task 1, using concrete required fields, nullability, enums, numeric bounds, public versus private projections and actual list envelopes. Reuse valid existing serializers.
- [ ] Describe anonymous session bootstrap, CSRF rotation after sign-in, HttpOnly cookie behavior, contact/recovery verification distinctions and logout. Mark public operations explicitly; do not claim bearer/API-key authentication exists.
- [ ] Type offer calculator queries/results, like/reaction/comment state, photos/avatar choices, optional activity sharing, co-borrower invitations, private read receipts, saved offers and calendar states. Keep unauthorized/profile-private fields absent from public examples.
- [ ] Record proposed fixture assertions in `test_api_contracts.py`: session member/null variants, empty discovery, calculator centavo result, invalid field error, revoked private resource, saved-offer unavailable state and a nullable photo. These compare actual serializers/projections with schema expectations rather than only snapshotting text.
- [ ] Replace generic fallback use for these operations; leave remaining generic operations accurately marked in coverage. Commit `docs(api): type member and discovery contracts`.

**Acceptance:** Every initial mobile-screen operation has a usable typed response and realistic synthetic request/error example. A caller can distinguish no results, missing access and invalid input.

## Task 4: Type financial, meeting and non-JSON operations

**Files:** Create schema modules in `agreements`, `servicing`, `payments`, `negotiations`, `investments`, `documents`, `verification`, `reporting`, `cases` and `eligibility` where necessary; annotate their views and remaining admin views. Modify `apps/api/config/schema.py` and the contract tests.

**Interfaces:** Method-specific schema declarations override `PixelVaultSchema`; retain its operation-ID function. Use named command variants for discriminated meeting actions, tied to the runtime parser's `action` values.

- [ ] Describe application selection/reservation, frozen agreements, step-up, signing, disbursement, payment preview/checkout, servicing receipts, commission and settlement using their actual request versions and statuses. Keep principal, fees, collected interest and future interest separate.
- [ ] Describe investment negotiation, separate mutual agreement/funding, allocations, reversals, losses and simulated payouts. The 2% demonstration fee is explicitly test policy, not a newly approved live tariff. Public contributor circles preserve anonymity; portfolio data remains private.
- [ ] Specify room read/command/action schemas, attendance versus record mode, expected revisions, operation IDs, ephemeral call state and evidence access. Describe both activity and room SSE event formats and reconnect behavior as implemented, without promising replay that is absent.
- [ ] Specify multipart uploads and actual size/type constraints; PDF, JPEG, ICS and text downloads with their response headers/media types. Add explicit annotations for room streams and investment agreement downloads rather than class-name guesses.
- [ ] Describe signed PixelFlow callbacks from the existing integration contract, including verification and duplicate processing. No secret/signature material is generated or embedded. Document all remaining staff methods without granting the developer role permission to invoke them.
- [ ] Add deferred assertions for method variants, 409 conflicts, private object refusal, MIME/header accuracy, unknown settlement, partial payment and large aggregate decimal strings. Remove the generic request/response fallback only after every inventoried operation has an explicit contract, retaining intentionally free-form fields with explanations.
- [ ] Commit `docs(api): describe financial and meeting protocols`.

**Acceptance:** A mobile implementer can consume each operation without guessing money units, command variants or file formats. The reference clearly labels simulation and unknown/incomplete financial state.

## Task 5: Add lifecycle guides and regenerate compatible types

**Files:** Create `docs/api/README.md`, `guides/money-and-errors.md`, `guides/loan-lifecycle.md`, `guides/meetings-and-investments.md`, `guides/native-client.md`, `guides/events-and-files.md`; update `browser-sessions.md`, `config/api_docs.py`, `config/settings.py`, `docs/api/openapi.yaml`, `packages/contracts/src/generated.ts`, and compatible aliases in `packages/contracts/src/api.ts`.

**Interfaces:** `reference_description() -> str` assembles only fixed, source-controlled guide files into the protected OpenAPI overview/tag descriptions. Generated types remain sourced from `docs/api/openapi.yaml` through `scripts/generate-api-types.mjs`.

- [ ] Write concise getting-started guidance and one complete synthetic loan lifecycle. Link each step to a stable operation; distinguish application, selection, mutual acceptance, funding, collection and settlement. Document centavos, aggregate strings, UTC instants/Manila display, errors and endpoint-specific retry/reconciliation rules.
- [ ] Document upload/download authorization, paging and stream behavior, room privacy and the native compatibility gate. Provide cURL, JavaScript fetch and Python examples using placeholders and explicit CSRF bootstrap. Mark optional prerequisites rather than pretending snippets are executable with a copied session secret.
- [ ] Include guides in the protected schema description; no arbitrary file-path/Markdown input, remote includes or separate public guide route. Make the deployment package contain the fixed source files. Keep authoring Markdown out of static-served directories.
- [ ] When contract generation checks are authorized, export/validate with `uv run python apps/api/manage.py spectacular --validate --file docs/api/openapi.yaml`, then `npm run generate:api`. Review diffs for operation-ID stability and unintended public/private fields. These commands are deferred under the present verification instruction.
- [ ] Preserve handwritten exports until consumers compile against generated equivalents; never replace an unknown schema with `any` to silence a client problem. Commit `docs(api): add lifecycle guides and generated contracts` only after permitted generation/review.

**Acceptance:** A developer can follow a lifecycle, understand failure/retry states and use generated operation types without changing existing web behavior.

## Task 6: Record release evidence and maintain contract coverage

**Files:** Create `scripts/check-api-contracts.py`; complete `apps/api/config/tests/test_api_docs.py`, `test_api_contracts.py`, coverage manifest and `docs/api/README.md`. Update root scripts and README with reference/type-generation entry points.

- [ ] Implement the focused schema check: unique stable operation IDs, inventory coverage, concrete request/success schemas for required operations, expected non-JSON media types and explicit reasons for intentionally unconstrained fields. Reject undocumented generic roots, not legitimate map/metadata fields.
- [ ] Document the deferred automated sequence: targeted config tests with PostgreSQL fixtures, schema export/validation, generated contract check, then TypeScript/UI checks only if their owning client files changed. Preserve the current visual-only instruction until the user explicitly changes it; leave this gate unchecked meanwhile.
- [ ] When visual review is authorized, inspect staff and denied states, keyboard search/deep links, snippets, schema loading failure, light/dark and 390px/1440px layouts. Confirm network traffic stays local to approved origins and that no request-client controls appear. Do not execute financial operations for a screenshot.
- [ ] Record exact permitted checks and unresolved cases. A visual review cannot mark access-control or contract tests as passed. Keep release status incomplete while those checks remain unverified.
- [ ] Commit only the final documentation/coverage changes: `docs(api): record reference coverage and release checks`. No deployment or push is implied.

**Done means:** Staff-protected reference and raw schema; complete inventoried contracts; useful guides; compatible generated types; permission/contract evidence from authorized checks. A polished shell with generic JSON is an intermediate milestone.

## Implementation record · 2026-10-30

The approved source work is implemented. Mobile feature files are consolidated by feature under `apps/mobile/src/features`; the protected renderer, explicit domain schema modules, source inventory and generated contracts are in place. See `docs/mobile/release-checklist.md` for the precise source/evidence boundary and `docs/mobile/development.md` for startup. Mobile preview uses 5185 because existing web previews occupy 5178–5184.

The original verification/commit checkboxes remain unclaimed: no builds, automated tests, type/UI checks or detector scripts were run under the visual-only instruction. Export/type generation and asset copies are authoring operations, not a passing test suite. Native device validation, packaging, store delivery and iOS remain explicit later gates. Existing uncommitted audit work was preserved; implementation has not been pushed.
