# PixelVault

<p align="center"><img src="packages/ui/src/assets/brand/pixelvault-glyph.svg" alt="PixelVault logo" width="120" /></p>

Philippines-first individual-to-individual lending, with a community marketplace and a private, auditable loan workspace. Built with Django/DRF, PostgreSQL and React/TypeScript using the supplied PixelVault identity.

![PixelVault community members planning together around an open book and calendar, framed by blue arches and plants.](apps/web/public/illustrations/profile-community-cover.png)

**Borrow today. Build tomorrow.** Original PixelVault community illustration · [artwork provenance](docs/brand/profile-cover-prompt.txt).

## Run locally

Requirements: Docker with Compose, uv, and Node >=22.12.0.

```bash
uv sync --group dev
npm ci
python3 scripts/dev.py --seed
```

Open [PixelVault](http://127.0.0.1:5178). API is at `http://127.0.0.1:8008`; Vite proxies `/api` to it. PostgreSQL/Redis bind only to localhost on 55438/56438. The launcher performs migrations and starts the API, web, Celery worker and scheduler processes without a build. Logs are in `.runtime`; `python3 scripts/dev.py --stop` stops only its recorded processes and preserves database data.

Interactive maps and place search require your own **public Mapbox token** in the repository-root `.env` as `VITE_MAPBOX_ACCESS_TOKEN`. The example setting is blank; local configuration is not committed. Restrict it to the intended website origins and restart the web process after changing it. Vite rejects non-public tokens before serving client code. Missing tokens or unavailable WebGL expose a direct offer-list fallback.

The [interactive marketplace](http://127.0.0.1:5178/marketplace) is a separate full-screen city-room experience: explicitly join, walk an original pixel character, post a short public bubble and inspect current offers. It uses the existing Redis/API services. Its optional Google Maps background needs `VITE_GOOGLE_MAPS_API_KEY`; without one it shows a labeled original plaza. See [setup](docs/marketplace/development.md) and [visual evidence and remaining release checks](docs/marketplace/release-checklist.md). The current preview has not passed automated or Google-provider verification.

Synthetic demo accounts, password **`PixelVaultDemo!2026`**:

| Account | Purpose |
| --- | --- |
| `maya@pixelvault.test` | Borrower: active/settled loan, applications and a conversation |
| `elias@pixelvault.test` | Lender: published offers, associated borrowers and fee records |
| `admin@pixelvault.test` | Test reviewer/finance/admin workspace |

The seed command refuses live mode, does not overwrite existing demo users, sends no notifications and moves no real funds. These are deliberately public test credentials for fictional local fixtures; never reuse them for a deployment. Staff sensitive reviews require fresh test password reauthentication through the administration screen. This is not production MFA.

## Implemented flows

- One account with borrower/lender views; private email and normalized Philippine mobile registration/settings; session/CSRF protection. Saving contact details does not verify ownership, and changes require fresh contact evidence. Separate recovery-email ownership links and single-use password-reset links use local test capture or configured SMTP; SMS remains unconfigured.
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
- Private action center and inbox read receipts, saved offers with up to three exact server previews, Manila repayment calendar with dates-only ICS export, and a lender decision desk. These use current member-owned records rather than invented activity.
- Native, mutually accepted WebRTC audio/video in meeting rooms, with camera off initially, optional local preview, participant-only signaling, track cleanup and no recording. Configure a TURN relay for reliable calls across networks.
- Frozen test investment agreements, separate party acknowledgments for simulated funding, FIFO capital attribution to subsequent new loans, a private contribution portfolio and mutual simulated payouts. The disclosed **2% lender-paid investment fee is demonstration pricing only**. Live funding and payouts remain disabled.

Recovery mail is captured in ignored `.runtime/mail` in test mode. The Celery worker must run for password-reset delivery. Ownership links expire after 30 minutes and are consumed separately from a contact evidence review. Live SMTP and coturn settings are documented in `.env.example`; no credentials or default external relay are shipped. Responsive WebP illustrations preserve the original PNG artwork and provenance; regenerate delivery sizes with `uv run python scripts/optimize-illustrations.py`.

Community XP comes from completed literacy (100 points) and distinct moderator-approved educational contributions (50 each, up to 20 contributions). It does not depend on loan size, borrowing or repayment. Profile settings control public points, leaderboard participation, frames and eligible badge flair; Fresh Start stays private. The [leaderboard](http://127.0.0.1:5178/leaderboard) includes only opted-in members with visible points and shares ranks for equal scores. XP is recognition, not a credit or lending-authority assessment.

The leaderboard pairs an original illustrated podium with neutral top-three cards, XP count-up, circular showcased badges and a dynamic +N badge popup. Person summaries and table columns show lifetime lent, loans funded, distinct people helped, reputation and badges. Lending figures count confirmed funding and require a separate member sharing preference, off by default; they never affect XP rank. The demo's known fictional accounts share existing synthetic records. A shared-header light/dark toggle remembers the choice and initially follows the system. Surface styling uses Tailwind classes; shared tokens and canonical control foundations retain their existing stylesheets. Reduced motion shows final XP immediately, and narrow tables provide a named keyboard-scroll region and visible scrolling cue. See the [surface record](docs/surfaces/leaderboard.md) and [art prompt](docs/brand/leaderboard-podium-prompt.txt).

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

Tests use PostgreSQL and mocked external providers. Component tests run in jsdom. Builds, browser inspection and visual tests are intentionally outside routine verification; require an explicit request. OpenAPI now has an explicit source-reviewed catalog and operation inventory. New declarations require separate runtime projection and permission validation; see docs/api/README.md.

## Operational limits

This is a working **test-mode implementation**, not an authorized live lending service. No real KYC/liveness, malware scanner, production MFA, approved legal template/e-signing service, SMS delivery, individual-lender disbursement or lender-settlement provider is configured. Mapbox tiles and city search require a public token and WebGL. Member markers still use the server’s synthetic coarse-area fixtures, never residential coordinates. Test-only branding/assets have derivative provenance, not designer-source certification.

Real PixelFlow checkout needs a configured approved test routing profile and server credentials. The local seeded experience does not claim that an uploaded screenshot, redirect or sandbox transfer is a gateway payment. Missing live arrangements keep origination disabled server-side. Ordinary collections and unknown settlement are different facts.

Private evidence uses encrypted local storage for development. A production S3-compatible storage adapter, reviewed retention schedule, secure key rotation, actual scanner/MFA, signing requirements, jurisdiction-specific rate/fee/tax rules, regulatory classification and approved per-lender money routing remain deployment work. No permissive production fallback is supplied.

See [implementation status](docs/IMPLEMENTATION.md) for automated verification results and deployment limits. The [artwork catalog](docs/brand/artwork-catalog.svg) shows all ten achievement illustrations and eight profile avatars; [scene prompts](docs/brand/illustration-prompts.md) and the [profile cover prompt](docs/brand/profile-cover-prompt.txt) record the built-in image-generation inputs. Open your profile editor to upload a photo or select a character. Portable SVGs live beside the UI source in packages/ui/src/assets; regenerate them with `node scripts/export-artwork.mjs`.

See [product context](PRODUCT.md), [design](DESIGN.md), [design specification](docs/specs/2026-10-28-pixelvault-design.md), [phase plans](docs/plans/2026-10-28-pixelvault-implementation.md), [PixelFlow evidence](docs/PIXELFLOW-INTEGRATION.md), and [operations](docs/operations/deployment.md).

Illustrated screens: [sign in](http://127.0.0.1:5178/sign-in), [how it works](http://127.0.0.1:5178/how-it-works), and the [not-found recovery screen](http://127.0.0.1:5178/page-not-found). The same recovery artwork appears in the real route-error boundary.


## Phone interface and private API reference

The separate phone UI lives in `apps/mobile` and shares the existing accounts/API. Run `npm run assets:mobile`, then `npm run dev:mobile`; open [mobile preview](http://127.0.0.1:5185/m/explore). Stop that Vite process with Ctrl+C. It uses the existing backend, with no emulator or second Django server. Read [mobile development](docs/mobile/development.md) for deployment/start-stop details.

Run `npm run assets:api-docs` to prepare the pinned local renderer, then open [API reference](http://127.0.0.1:5185/api/docs/) with active developer/admin staff sign-in. The same guard protects raw schema and renderer assets. Search, guides and snippets are available; the request playground is disabled. [Reference setup](docs/api/README.md), [operation inventory](docs/api/operations.md) and [release evidence](docs/mobile/release-checklist.md) explain the scope.

Browser/PWA source is implemented; PWA package/offline verification and native Android session/file/device checks remain pending. Native authenticated transport intentionally fails closed. No APK, signing credential, store publication or iOS release is included.

## Repository guide

- `apps/api`: Django/DRF services, domain models, permission checks, background jobs and private API documentation.
- `apps/web`: React/TypeScript desktop and responsive browser application.
- `apps/mobile`: separate mobile-first browser interface and native-wrapper groundwork; not a published native app.
- `packages/ui`: shared controls, design tokens, illustrations and brand assets.
- `packages/contracts` and `packages/api-client`: shared API types and client transport.
- `docs/api`, `docs/mobile` and `docs/operations`: integration guides, release limitations and deployment procedures.

Keep `.env`, `.runtime`, private evidence, mail captures, databases and provider credentials outside version control. Commit the lockfiles for reproducible dependencies, but regenerate dependency installations and local delivery assets with the documented scripts. Review the operational limits above before considering deployment or processing real financial or identity data.
