# PixelVault

Philippines-first individual-to-individual lending, with a community marketplace and a private, auditable loan workspace. Built with Django/DRF, PostgreSQL and React/TypeScript using the supplied PixelVault identity.

## Run locally

Requirements: Docker with Compose, uv, and Node >=22.12.0.

```bash
uv sync --group dev
npm ci
python3 scripts/dev.py --seed
```

Open [PixelVault](http://127.0.0.1:5178). API is at `http://127.0.0.1:8008`; Vite proxies `/api` to it. PostgreSQL/Redis bind only to localhost on 55438/56438. The launcher performs migrations and starts the API, web, Celery worker and scheduler processes without a build. Logs are in `.runtime`; `python3 scripts/dev.py --stop` stops only its recorded processes and preserves database data.

Interactive maps and place search require your own **public Mapbox token** in the repository-root `.env` as `VITE_MAPBOX_ACCESS_TOKEN`. The setting is blank in `.env.example`, and no token is currently configured. Restrict it to the intended website origins and restart the web process after changing it. Vite rejects non-public tokens before serving client code. Without the token, Explore explains that setup is needed; its offer sidebar and list remain usable.

Synthetic demo accounts, password **`PixelVaultDemo!2026`**:

| Account | Purpose |
| --- | --- |
| `maya@pixelvault.test` | Borrower: active/settled loan, applications and a conversation |
| `elias@pixelvault.test` | Lender: published offers, associated borrowers and fee records |
| `admin@pixelvault.test` | Test reviewer/finance/admin workspace |

The seed command refuses live mode, does not overwrite existing demo users, sends no notifications and moves no real funds. These are deliberately public test credentials for fictional local fixtures; never reuse them for a deployment. Staff sensitive reviews require fresh test password reauthentication through the administration screen. This is not production MFA.

## Implemented flows

- One account with borrower/lender views; private email and normalized Philippine mobile registration/settings; session/CSRF protection. Saving contact details does not verify ownership, and changes require fresh contact evidence. Email/SMS delivery remains unconfigured.
- Private encrypted evidence, quarantined uploads, explicit sandbox scanning, 60-second owner-bound download grants, assigned review, independent lender-registration records and audit history.
- Offers, private applications, capacity reservations, immutable disclosures, two-party exact-hash acceptance and reproducible private agreement PDFs.
- Reducing-balance schedules, weekly/twice-monthly/monthly/maturity frequencies, exact dated cost calculation, partial/early collection and compensating reversals.
- Explicit synthetic disbursement, separate unknown lender settlement, one-time lender-paid fee accrual and separate fee collection records.
- Actual PixelFlow SDK contract with persist-before-dispatch operations, signed events, replay/semantic deduplication, pending/orphan recovery and refund reservations.
- Mapbox GL discovery with a full map workspace, posting sidebar and list toggle. Avatar markers group approximate public area centers; city/municipality/neighborhood search uses Mapbox Geocoding v6 restricted to the Philippines.
- Recent public posts and server-sent revision updates, with bounded reconnection and an explicit once-per-minute REST fallback. A banner lets the reader apply updated postings without interrupting the current view.
- Private inbox, ten original achievements, evidence-based award correction, moderated transaction reviews and contribution/literacy progression. Optional community XP, an opt-in leaderboard, eight profile characters, unlocked avatar frames and eligible achievement flair.
- Larger profile pictures, a generated illustrated cover, active profile tabs, separate setup/XP progress and moderated transaction-review recommendations. Members can upload a validated JPEG/PNG/WebP photo or keep an illustrated avatar; photos are decoded and re-encoded without metadata, limited to 3 MiB input and 768px output, and shown consistently beside people.
- Persisted offer likes, moderated comments, current eligible earned-badge reactions and interactive server-calculated amount/term comparisons. Alternate preview terms never silently change the lender’s actual offer or application.
- Private co-borrower invitations with manually shared signed links, explicit recipient consent/current checks, withdrawal and optional application association. Phone/Facebook details stay between the inviting and consenting members; the lender receives identity and consent status only. No joint repayment liability or loan/document access is granted.
- Private complaints/hardship, mutual amendments without capitalizing old interest, policy-limited notices, period analytics and scoped formula-safe exports.
- Admin verification/registration, cases/moderation, commissions/reconciliation, policies, template status and audit records.

Community XP comes from completed literacy (100 points) and distinct moderator-approved educational contributions (50 each, up to 20 contributions). It does not depend on loan size, borrowing or repayment. Profile settings control public points, leaderboard participation, frames and eligible badge flair; Fresh Start stays private. The [leaderboard](http://127.0.0.1:5178/leaderboard) includes only opted-in members with visible points and shares ranks for equal scores. XP is recognition, not a credit or lending-authority assessment.

## Automated verification

```bash
uv run pytest -q
npm test
npm run typecheck
npm run check:ui
npm run check:contrast
uv run ruff check apps/api scripts
uv run python apps/api/manage.py check
uv run python apps/api/manage.py makemigrations --check --dry-run
uv run python apps/api/manage.py spectacular --validate --fail-on-warn --file docs/api/openapi.yaml
```

Tests use PostgreSQL and mocked external providers. Component tests run in jsdom. Builds, browser inspection and visual tests are intentionally outside routine verification; require an explicit request. OpenAPI preserves documented generic JSON boundaries where serializers have not yet supplied field-level schemas; client domain DTOs and integration tests provide the current exact response contracts.

## Operational limits

This is a working **test-mode implementation**, not an authorized live lending service. No real KYC/liveness, malware scanner, production MFA, approved legal template/e-signing service, SMS delivery, individual-lender disbursement or lender-settlement provider is configured. Mapbox tiles and city search are integrated but remain inactive until a public token is configured. Member markers still use the server’s synthetic coarse-area fixtures, never residential coordinates. Test-only branding/assets have derivative provenance, not designer-source certification.

Real PixelFlow checkout needs a configured approved test routing profile and server credentials. The local seeded experience does not claim that an uploaded screenshot, redirect or sandbox transfer is a gateway payment. Missing live arrangements keep origination disabled server-side. Ordinary collections and unknown settlement are different facts.

Private evidence uses encrypted local storage for development. A production S3-compatible storage adapter, reviewed retention schedule, secure key rotation, actual scanner/MFA, signing requirements, jurisdiction-specific rate/fee/tax rules, regulatory classification and approved per-lender money routing remain deployment work. No permissive production fallback is supplied.

See [implementation status](docs/IMPLEMENTATION.md) for automated verification results and deployment limits. The [artwork catalog](docs/brand/artwork-catalog.svg) shows all ten achievement illustrations and eight profile avatars; [scene prompts](docs/brand/illustration-prompts.md) and the [profile cover prompt](docs/brand/profile-cover-prompt.txt) record the built-in image-generation inputs. Open your profile editor to upload a photo or select a character. Portable SVGs live beside the UI source in packages/ui/src/assets; regenerate them with `node scripts/export-artwork.mjs`.

See [product context](PRODUCT.md), [design](DESIGN.md), [design specification](docs/specs/2026-10-28-pixelvault-design.md), [phase plans](docs/plans/2026-10-28-pixelvault-implementation.md), [PixelFlow evidence](docs/PIXELFLOW-INTEGRATION.md), and [operations](docs/operations/deployment.md).

Illustrated screens: [sign in](http://127.0.0.1:5178/sign-in), [how it works](http://127.0.0.1:5178/how-it-works), and the [not-found recovery screen](http://127.0.0.1:5178/page-not-found). The same recovery artwork appears in the real route-error boundary.
