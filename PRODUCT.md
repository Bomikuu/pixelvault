# PixelVault product

<!-- impeccable:product-schema 1 -->

Implementation context: 2026-10-28, Asia/Manila. PixelVault is a standalone repository; the original planning record remains preserved in PixelCore.

## Platform

web

## Stack

User selected Django/DRF + React/TypeScript and authorized implementation on 2026-10-28. Implemented supporting stack: PostgreSQL, Celery/Redis, React Router, TanStack Query, Tailwind and upstream Shadcn. Dependencies are locked. Local development uses a same-origin API proxy; no hosted deployment or live service was created.

## Users

Philippine adults borrowing from or lending to another individual; members may hold both roles. Verification reviewers, support staff, finance operators and administrators have separate operational permissions. The initial product is mobile-first web, with desktop workspaces for frequent lenders and staff.

## Product Purpose

Let a person publish an amount they want to lend, let verified borrowers privately apply, and let the lender select an applicant. Both parties accept the same disclosed terms and retain a shared factual loan history. Success means people understand the cost and dates before accepting, can see what they actually owe or have received, and can address mistakes privately.

## Positioning

Individual-to-individual lending is mandatory. PixelVault combines nearby offers, social profiles and optional achievements with private agreements, payment schedules, documents and disputes. It must not silently become an institutional-lender-only marketplace. A listing is an intention to lend, not a deposit, wallet balance, approved credit line or guaranteed funding.

## Operating Context

- Philippines first; PHP integer centavos, en-PH formatting, Asia/Manila contractual dates and UTC event timestamps.
- Community discovery, private member dashboard and restricted administration are separate areas.
- Borrowers privately apply; lenders choose; both accept final terms. One lender and one borrower per loan in the first release.
- Proposed co-borrowers use private invitations, their own current identity/contact checks and explicit sharing consent. An application may reference an accepted invitation, but this does not add a contractual debtor, joint liability or loan/document access. Accepted invitation access is bound to member IDs, not a reusable email address.
- One-time commission per confirmed funded loan; no platform commission on repayments. Lender-paid commission is the proposed initial policy, not a confirmed price.
- PixelFlow is the shared payment-collection integration. Loan obligations and allocation records remain PixelVault's responsibility.

## Capabilities and Constraints

- Strict identity, contact, income/affordability and funding-account review, including freelancer evidence. Fake demo verification must remain visibly synthetic.
- Future individual-lender registration has its own evidence, authority, validity and review history. Identity checks do not confer legal lending authority.
- Lists and approximate maps, offer applications, agreements, payments, private documents, messaging, reviews, achievements, complaints and analytics are required.
- Public debt shaming, contact harvesting, automatic government referrals, threats of arrest, pooled investments and fractional loan trading are excluded.
- Lender authorization and the platform's regulatory classification remain unresolved live-launch dependencies. Plans do not establish that future registration permits operating today.
- PixelFlow collection success does not establish disbursement or settlement to an individual lender. The existing implementation has no payout/disbursement provider contract.
- Complete test-mode flows can be built while live origination remains disabled. No real identities, documents or funds are needed for fixtures.
- Mapbox is the implemented map and Philippine city/area-search provider; a public token is still unconfigured. No provider for real KYC/liveness, SMS, signatures or individual-lender disbursement/settlement has been selected. These remain explicit adapters and operational decisions.

## Brand Commitments

- Name: **PixelVault**.
- Supplied tagline: **Borrow today. Build tomorrow.**
- Preserve the supplied geometric blue P/keyhole, dark-and-blue wordmark, inverse identity and compact variants.
- The supplied board is the visual authority; labels inside its mock screen are not instructions or approved credit claims.
- Voice: clear, respectful and specific. Financial hardship is never a moral label.
- Preserve PixelCore's separate existing identity and application.

## Evidence on Hand

- [User-supplied branding board](docs/brand/pixelvault-brand-reference.png), preserved without editing; provenance in [brand/README.md](docs/brand/README.md).
- The user approved the preceding lending prompt, selected the stack and instructed implementation after the written planning deliverable.
- Static inspection of the existing PixelFlow service and SDK, recorded in [PIXELFLOW-INTEGRATION.md](docs/PIXELFLOW-INTEGRATION.md).
- The standalone repository contains test-mode product code and synthetic fixtures. No live lending authorization, payment approval, testimonials or production metrics are claimed. See [implementation status](docs/IMPLEMENTATION.md).

## Product Principles

1. Individuals remain the contractual counterparties; eligibility is explicit.
2. Exact costs and obligations precede acceptance; confirmed events drive balances.
3. Social recognition is optional; sensitive financial history stays private.
4. Verification, disputes and recovery are accountable human workflows.
5. Simulation, collection, disbursement and settlement are distinct facts.

## Accessibility & Inclusion

Target WCAG 2.2 AA. Support 320px layouts, keyboard and assistive technologies, reduced motion, readable money and dates, and list-based discovery without GPS or a working map. English is the first interface; keep messages translatable and preserve exact contract-language versions. Do not imply Filipino legal translations have been reviewed when they have not.
