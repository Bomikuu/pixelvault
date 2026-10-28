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

Synthetic demo accounts, password **`PixelVaultDemo!2026`**:

| Account | Purpose |
| --- | --- |
| `maya@pixelvault.test` | Borrower: active/settled loan, applications and a conversation |
| `elias@pixelvault.test` | Lender: published offers, associated borrowers and fee records |
| `admin@pixelvault.test` | Test reviewer/finance/admin workspace |

The seed command refuses live mode, does not overwrite existing demo users, sends no notifications and moves no real funds. These are deliberately public test credentials for fictional local fixtures; never reuse them for a deployment. Staff sensitive reviews require fresh test password reauthentication through the administration screen. This is not production MFA.

## Implemented flows

- One account with borrower/lender views; separate public display identity and private email; session/CSRF protection.
- Private encrypted evidence, quarantined uploads, explicit sandbox scanning, 60-second owner-bound download grants, assigned review, independent lender-registration records and audit history.
- Offers, private applications, capacity reservations, immutable disclosures, two-party exact-hash acceptance and reproducible private agreement PDFs.
- Reducing-balance schedules, weekly/twice-monthly/monthly/maturity frequencies, exact dated cost calculation, partial/early collection and compensating reversals.
- Explicit synthetic disbursement, separate unknown lender settlement, one-time lender-paid fee accrual and separate fee collection records.
- Actual PixelFlow SDK contract with persist-before-dispatch operations, signed events, replay/semantic deduplication, pending/orphan recovery and refund reservations.
- Coarse list/map discovery, private inbox, optional original badges, evidence-based award correction, moderated transaction reviews and contribution/literacy progression.
- Private complaints/hardship, mutual amendments without capitalizing old interest, policy-limited notices, period analytics and scoped formula-safe exports.
- Admin verification/registration, cases/moderation, commissions/reconciliation, policies, template status and audit records.

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

This is a working **test-mode implementation**, not an authorized live lending service. No real KYC/liveness, malware scanner, production MFA, approved legal template/e-signing service, SMS delivery, individual-lender disbursement or lender-settlement provider is configured. The map uses synthetic coarse-area data rather than live tile/geocoder services. Test-only branding/assets have derivative provenance, not designer-source certification.

Real PixelFlow checkout needs a configured approved test routing profile and server credentials. The local seeded experience does not claim that an uploaded screenshot, redirect or sandbox transfer is a gateway payment. Missing live arrangements keep origination disabled server-side. Ordinary collections and unknown settlement are different facts.

Private evidence uses encrypted local storage for development. A production S3-compatible storage adapter, reviewed retention schedule, secure key rotation, actual scanner/MFA, signing requirements, jurisdiction-specific rate/fee/tax rules, regulatory classification and approved per-lender money routing remain deployment work. No permissive production fallback is supplied.

See [implementation status](docs/IMPLEMENTATION.md) for automated verification results and deployment limits. The [artwork catalog](docs/brand/artwork-catalog.svg) shows all six achievement illustrations and eight profile avatars; [scene prompts](docs/brand/illustration-prompts.md) record the built-in image-generation inputs. Open your profile editor to select and save a character. Portable SVGs live beside the UI source in packages/ui/src/assets; regenerate them with `node scripts/export-artwork.mjs`.

See [product context](PRODUCT.md), [design](DESIGN.md), [design specification](docs/specs/2026-10-28-pixelvault-design.md), [phase plans](docs/plans/2026-10-28-pixelvault-implementation.md), [PixelFlow evidence](docs/PIXELFLOW-INTEGRATION.md), and [operations](docs/operations/deployment.md).
