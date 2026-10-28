# Development deployment and live boundary

The delivered launcher starts Django on localhost:8008 and Vite on localhost:5178 and starts a Celery worker/scheduler, with separate PostgreSQL/Redis Compose services. It never runs an application/image build. Use locked `uv sync --group dev` and `npm ci`; copy `.env.example` only for local test configuration. Empty/absent secrets use test-only behavior; do not reuse development credentials or document keys for any real deployment.

No hosted service, domain, TLS endpoint or production deployment was created. Production requires one trusted origin for the app/API, strict allowed hosts/CSRF origins, secure cookies, independent secrets and database roles, private object storage and encryption keys, scanner and MFA, approved template/signing/retention policies, legal model and lender eligibility, provider-approved routes and a completed non-simulated acceptance procedure. Live origination currently fails closed regardless of a browser flag.

The existing PixelFlow service and all PixelCore/Medframe/DineEase applications remain unchanged. Configure an explicit test-only routing profile before any PixelFlow sandbox connection; do not reinterpret a platform merchant as a pooled lender account. Payout/disbursement and lender settlement are not implemented by the inspected PixelFlow SDK.

Read [recovery](recovery.md), [privacy](privacy.md), [incident response](incident-response.md) and [launch readiness](launch-readiness.md) before changing the operational boundary. Future image/application builds require the user's explicit authorization under AGENTS.md.
