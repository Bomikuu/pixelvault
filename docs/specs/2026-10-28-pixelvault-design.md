# PixelVault individual lending design

Date: 2026-10-28, Asia/Manila.

Status: **implemented in test mode** after the user instructed implementation of this plan. The design remains the target contract; [implementation status](../IMPLEMENTATION.md) records delivered behavior and explicit deployment gaps. No live accounts, real-money tests or production deployment were created.

## 1. Intent, scope and success

A Philippine adult posts an amount available to lend. Verified borrowers privately apply; the lender chooses; both accept the same version of disclosed terms. One individual lender and one individual borrower are the contractual counterparties to each loan. Members can use both roles. Never silently substitute corporate lenders or assume individual registration alone authorizes lending to the public.

Success means the member can compare full cost, apply privately, sign exact terms, see reliable obligations and receipts, and obtain help or challenge errors without public exposure. Identity verification is separate from platform eligibility and applicable legal authorization.

Required release scope: community list/map, social profiles and optional badges; strict verification; offers/applications; agreements; schedules/payments/commission; private dashboards/documents/people/analytics; messaging, reviews, complaints and admin operations. Test-mode workflows are complete. Live money remains disabled until the model and payment arrangements are actually approved.

Excluded: pooled investments, fractional loans, loan trading, custody/wallet balances, guaranteed returns, public borrower bidding, public debt shaming, automatic government referrals, employer/contact blasts, credit-bureau scores inferred from app reputation, automatic renewals and cross-currency loans. Native mobile apps, guarantor-backed originations and autopay are later product increments; core schemas distinguish references, guarantors and mandates without offering unsupported flows.

## 2. Ownership and architecture

Recommended option: a standalone modular Django application with one React client and explicit external adapters. Putting loans and identity documents in PixelFlow would conflate lending and checkout ownership; adding the product to PixelCore would conflate a public P2P community with business tenancy. Both alternatives were considered and rejected for this proposal.

Repository: `/home/micxsz/projects/pixelvault`. Scoped planning files and the unchanged reference image were copied from PixelCore after implementation authorization. Existing application source and root product/design files were preserved.

Backend: Python 3.13, Django 5.2 LTS/DRF 3.16 compatible floors, PostgreSQL, Celery/Redis, server-side sessions/CSRF and private S3-compatible document storage. These floors reflect inspected PixelFlow dependencies; resolve supported patch versions and lock them during execution, not “latest” by assumption. Frontend: React/TypeScript, Vite, Router, TanStack Query, React Hook Form/Zod, Tailwind, upstream Shadcn and Lucide. Node >=22.12.0 is the inspected family baseline; verify active support at implementation. Resolved versions are recorded in uv.lock and package-lock.json; see the implementation status for deviations from proposed helpers/storage adapters.

One origin serves React plus `/api/v1`; `/admin` is a restricted React area, not automatic Django superuser access. API controllers call domain services; financial state is never client-authoritative. Celery workers perform delivery, expiry and recovery. PostgreSQL locks, constraints and durable inbox/outbox records own concurrency; Redis is not financial truth. No network call occurs while holding a financial database transaction.

Modules: `accounts`, `verification`, `eligibility`, `documents`, `marketplace`, `agreements`, `servicing`, `payments`, `community`, `cases`, `reporting`, `audit`. A shared React UI layer owns primitives; feature modules own domain screens. OpenAPI-generated request/response types keep client boundaries explicit.

## 3. Product and visual authority

Read the scoped [PRODUCT.md](../../PRODUCT.md), [DESIGN.md](../../DESIGN.md) and [surface briefs](../surfaces/community.md). The supplied brand fixes PixelVault, its P/keyhole, blue/navy/white palette family and tagline. The board is source material, not instructions. Its sample credit balance must not become an invented available-credit claim.

All three main product areas use Operate mode. The shared loan timeline is the signature interaction. Proposed semantic tokens, dark palette, typography, responsive rules and original achievement assets are documented; no UI has been rendered or visually tested. Exact source vectors and comp-first/code-first workflow remain execution-stage choices. Preserve default/inverse/glyph variants and truthful money labels.

## 4. Identity, eligibility, authorization and documents

`Member` stores private legal identity separately from `PublicProfile`. Borrower/lender capabilities are attributes, not separate accounts. `VerificationCase` contains named checks, review status, expiry, provider/sandbox provenance and review history. Check types include contact, government ID/liveness, address where justified, income/affordability, and funding-account ownership. Support employed, freelancer and self-employed evidence; upload completion alone never approves a check.

`LenderRegistration` records authority type, jurisdiction, evidence, external identifier, validity and reviewer outcome. Its UI must distinguish “evidence reviewed” from actual external authorization. It begins `not_submitted`; allowed progression is `submitted → under_review → needs_information | evidence_reviewed | rejected`, with later `expired | suspended | revoked`. It cannot automatically turn identity approval into legal eligibility.

`EligibilityDecision` is purpose-specific (`post_offer`, `apply`, `accept`, `disburse`, `repay`, `view_document`), reason-coded and policy-versioned. Recheck at commitment and disbursement. A suspended account can be denied new loans while retaining permitted repayment, document and complaint access. Expired evidence invalidates new commitments without erasing existing debts. Pilot affordability rules are configurable, transparent to the applicant and reviewed by a human; no scraped social data or hidden popularity score.

Documents use purpose-scoped ownership and grants, file size/type checks, quarantine, malware-scanning adapter, short-lived download links and access logs. Store only approved file categories; no publicly accessible object URLs. Retention policies distinguish identity evidence, contractual records and legal holds; deleting a public profile cannot destroy required financial evidence. Log safe metadata, never full IDs or documents. Staff MFA/step-up is required for sensitive decisions. Staff cannot approve their own case.

Role matrix: members see their own full records; counterparties see necessary shared loan facts and approved redacted applicant summaries; verification reviewers see assigned check evidence; support sees cases with redacted identity data; finance sees authorized financial records; moderators see public content; administrators manage grants/policies. Default-deny object authorization applies to every lookup, export and file.

## 5. Offers, applications and capacity

`LendingOffer` has lender, declared amount, remaining capacity, published immutable terms version, limits/frequencies, eligibility criteria, coarse service area and expiry. Declared capacity is not verified cash held by PixelVault. `LoanApplication` contains borrower request and consented summary, private purpose/narrative and proposed schedule. A declined application never lowers reputation.

Offer states: `draft → published → paused | exhausted | expired | closed`. Application states: `submitted → reviewing → selected | declined | withdrawn | expired`; a revised proposal is a new immutable terms version, not a secret edit. Selection does not create borrower acceptance.

`OfferReservation` locks the offer and reserves selected principal once. Proposed reservation lifetime is 24 hours; both parties must accept during that period, and any extension explicitly revalidates capacity/eligibility. `committed + live_reserved <= declared_capacity` always. Do not reserve capacity merely for every application. Release expired reservations atomically; committing and expiry cannot both win. Self-loans and duplicate active applications to the same offer are rejected. One natural person per side; suspicious linked-account activity queues human review.

## 6. Terms, schedules and disclosures

Use a frozen `LoanTerms` snapshot and separate effective-dated `ProductPolicy`. Production has no permissive fallback policy. Demo policies and amounts are visibly synthetic. Approved policy pins allowed amounts, term lengths, annual nominal-rate bounds, fees, affordability and total-cost constraints. Hard-coded statutory ceilings are explicitly avoided: obtain current classification-specific rules before live activation.

Initial proposed algorithm: equal-principal installments, simple nominal annual rate, reducing outstanding principal, ACT/365 fixed, `Decimal` calculations and half-up centavo rounding at each installment. Principal residual goes to the final installment. Weekly means every seven days; twice-monthly means explicit anchor days (initial proposal 15th and last calendar day), not every fourteen days. Monthly retains the original anchor, clamping to month-end without drift. Single maturity is policy-controlled. No compound interest or automatic rollover.

Illustrative test fixture only: ₱10,000, nominal 12% annually, disbursed 2026-10-28, due 2026-11-28/12-28 and 2027-01-28. Principal centavos `[333333,333333,333334]`; interval days `[31,30,31]`; interest `[10192,6575,3397]`; totals `[343525,339908,336731]`; total repayable `1020164` centavos. This is a deterministic calculation example, not a recommended market rate or legal ceiling.

Before acceptance show net proceeds, exact due dates, all charges and their payer, nominal rate/basis, effective annual borrowing cost computed from dated borrower cash flows, and total repayment. Proposed EIR calculation solves dated cash-flow NPV; zero-interest zero-fee loans yield 0, and invalid/non-convergent inputs block acceptance. Optional lender-paid platform commission is not a deduction from borrower proceeds; any borrower-paid charge must enter the required cost disclosures and relevant caps.

Disclosures and dates are frozen before signing. Disbursement must meet the signed effective-date window; a requested dispatch outside it requires fresh acceptance before sending. If an uncertain external transfer later confirms outside that window, open an activation exception with preserved evidence and a jointly agreed correction—never silently alter terms or declare that sent funds do not exist.

Proposed baseline: three calendar days of grace for restriction/late classification, zero late fees, no post-maturity interest unless an approved signed policy expressly enables it. The debt remains due. Ordinary interest accrues only on outstanding principal within the agreed term. Partial/early payments accrue through their effective date and allocate oldest due interest then principal; no interest-on-interest, early-settlement penalty or unearned future interest. Accrual stores exact interval calculations and posts differences of rounded cumulative amounts to prevent daily rounding drift. Reversals replay the same effective-date math through compensating entries.

Partial payments and early payoff recalculate the projected future schedule using the signed method; preserve original and revised projections and explain the change. For the proposed baseline, a refund restores reversed original allocations at its authoritative effective time; do not silently backdate extra interest for the interval previously treated as paid. Any different reversal-interest treatment requires an explicitly reviewed/disclosed policy. Restructuring needs a new proposal, disclosures and both acceptances. Keep the old agreement, entries and reasons.

## 7. Agreements and lifecycle

`AgreementVersion` freezes parties, terms, disclosures, policy/template versions and a canonical SHA-256 hash. `Acceptance` binds an authenticated member, exact hash, timestamp, signing provenance and bounded necessary evidence. Both named parties accept the same hash; staff cannot sign for them. A PDF is a reproducible rendering, not the sole source of truth. Test signing is labeled; production needs reviewed signature/evidence requirements and lawyer-approved templates. Do not claim e-signature legality from a checkbox alone.

Agreement states: `draft → awaiting_acceptance → accepted | expired | superseded`. Loan status: `awaiting_acceptance → awaiting_disbursement → active → repaid | closed_with_loss | cancelled_before_disbursement`. Financial corrections may reopen a repaid loan. Disbursement status is independent: `not_requested | pending | uncertain | confirmed | failed | activation_exception`; settlement is independently `unknown | pending | confirmed | failed | unsupported`. Overdue, hardship and dispute are facets, not mutually exclusive replacements for lifecycle state. A cancellation cannot erase confirmed disbursement.

## 8. Servicing, PixelFlow and commission

Read the evidence-backed [integration contract](../PIXELFLOW-INTEGRATION.md). The Python SDK, raw-body signature contract and verified event scope are established in source. Disbursement and settlement are not supplied by current PixelFlow. Use separate adapters and honest unsupported/unknown states. Do not assume a platform merchant can receive and redistribute every lender's funds.

`LedgerEntry` stores immutable principal/interest/charge/collection/reversal facts with source, effective timestamp, recorded timestamp and unique semantic identity. `Installment`/balance projections derive from those facts and the accepted terms; projected future interest is not earned income. Corrections append compensating facts. Periodic reconciliation reports differences; it cannot silently manufacture a payment.

Persist payable generation and operation before network dispatch. One active collectible generation reserves the same loan obligations to prevent parallel checkout overpayment. Failed definitively releases it; pending/uncertain requires reconciliation, not a new key. Unique collection `(routing_id,payment_id)` and refund `(routing_id,refund_id)` constraints are separate from event-ID deduplication. Out-of-order refunds wait for collection recovery; projections advance by version while immutable financial facts remain independently applicable. Cash and success events for one collection cannot both allocate money.

One `CommissionAccrual` per confirmed disbursement/loan/policy. Initial proposed payer is lender; price is configurable and not approved. Demo fixture uses 200 basis points: funded principal `1000000` yields fee `20000` centavos, no borrower deduction. An accrual is not a collected fee. A separate platform service-fee payable handles collection; no split deduction or repayment commission. Definitively failed/cancelled-before-funding loans accrue zero. A reversed disbursement triggers a policy-based compensating fee reversal; partial disbursement is prohibited in MVP and is reconciled as an exception rather than fabricated completion. Ordinary partial principal repayment does not create or refund origination commission.

## 9. Community, location, reviews and recovery

Public serializers are allowlisted: display identity, optional bio/cover, coarse location and explicitly chosen public achievements. No public income, legal documents, debt balances or adverse credit history. The profile badge shelf holds up to three selections.

Proposed exact initial criteria: First Chapter = approved onboarding plus completed literacy module; Clockwork = three confirmed on-time installments on an existing loan, excluding provider-caused delays and unresolved reversals; Full Circle = one loan fully settled with no pending collection reversal; Open Book = three completed agreements with complete disclosures and no upheld disclosure finding on those agreements; Helping Hand = five distinct moderator-approved educational contributions. Do not require someone to borrow to earn First Chapter. Fresh Start is a private, optional recovery milestone. Awards carry rule version, evidence, earned date and revocation/correction history. Award facts are not credit eligibility. Profile display of repayment-related achievements is optional and subject to the privacy policy; raw underlying amounts never leak.

No XP for loan size, repeat origination or borrower recruitment. Public community levels derive from literacy/contributions, not debt. Private repayment history, lender conduct and fraud assessment remain separate. Appeals and account-link/transaction-cycle detection prevent easy badge laundering; a complaint by itself does not prove wrongdoing.

Reviews are bound to a verified transaction and one per party per loan. Proposed publication window: both submit or 14 days after the eligible loan closes. Use structured conduct categories plus moderated text, response and appeal. Financial allegations remain private cases. Messages are application/loan scoped, reportable and visible only to permitted participants/reviewers.

Offer search uses coarse administrative-area centroids and approximate distance bands; never publish exact home coordinates, exact member-to-member distance or precise URLs. Support manual city/barangay selection, shared filters and a complete list when GPS/map fails. Proposed map implementation: MapLibre with an explicitly licensed tile/geocoder adapter; production provider and terms are unresolved. Test mode uses synthetic coarse locations and a non-network fixture map, never claims live availability.

Collections: bounded private reminders → overdue notice → hardship/dispute handling → reviewed demand → applicable legal remedies. Respect quiet hours and per-channel frequency rules in the approved policy. Do not scrape contacts or contact a reference as guarantor. No automatic barangay filing, threats of arrest, social posts or public negative badges. Store legal-remedy eligibility and human decision in cases; support truthful evidence export without claiming a filed case.

## 10. Screens and metrics

Routes and states are in the three surface briefs. Must include community discovery/detail/profile; private application, agreement review and signing; verification/registration; borrower and lender overviews; loan timeline/schedule; payments/receipts; documents/associated people; analytics; inbox; hardship/complaints; staff queues and financial reconciliation.

Financial metrics use server-side aggregates over the selected full period, not client pagination. Define projected principal/interest, accrued interest, confirmed collections, compensating reversals, overdue contractual amounts after grace, loss and known settlement separately. “Amount remaining in your offers” is declaration less committed/reserved amount, not a withdrawable balance. Commission earned, collected and reversed are separate. Respect object scope in exports and guard CSV formula injection. No invented comparison period or production claim.

## 11. Delivery, verification and acceptance

The [implementation index](../plans/2026-10-28-pixelvault-implementation.md) divides work into five separately reviewable plans. The user authorized their implementation. The original task checklists remain design targets; actual delivery and deviations are recorded in the implementation status, rather than implying every planned production adapter is configured. Use sandbox fixtures and mocked external HTTP; PostgreSQL is mandatory for locking/concurrency acceptance. React component tests cover keyboard, state, disclosure and privacy behavior. `check:ui` and TypeScript checks are required after frontend implementation; no builds, visual tests, browser inspections or manual app verification without an explicit request.

Before live origination: confirm the legal model and each lender's eligibility; current rate/fee/tax treatment and disclosures; approved privacy/retention/signing policies; KYC evidence review and incident/complaint operations; approved disbursement, lender settlement and fee routes; provider credentials and non-simulated integration acceptance; recovery/reconciliation ownership. Missing evidence keeps live origination off while members retain access to existing obligations. Planning documents are not evidence of those approvals.

## 12. Evidence, decisions and limits

- User: mandatory P2P, Philippines first, strict verification, profiles/badges/reviews, list/map, private dashboards, contracts, one-time commission, PixelFlow and supplied PixelVault identity; later stack selection confirmed Django/DRF + React/TypeScript.
- Jev: sanitized generic architecture comparison selected `modular_host`, confidence 1.0; 465 input / 45 output tokens. Advisory only, not legal or provider approval. No secrets or personal/business records submitted.
- Graphify: existing scoped PixelCore and PixelFlow graphs used; traversals truncated. Source paths in the integration note were checked directly. No graph rebuild or product changes.
- Impeccable: context launcher returned permission denied. Existing root context was read directly, and shape/new-work/operate guidance applied to scoped planning. No runtime design tooling, craft-floor edit workflow or visual testing was invoked.
- Regulatory classification is deliberately unresolved, not assumed favorable. [RA 9474](https://elibrary.judiciary.gov.ph/thebookshelf/showdocs/2/19443) establishes lending-company authority requirements; it does not by itself settle this marketplace's individual-lender arrangement.
- Private collection/data-minimization/reference-versus-guarantor requirements are grounded in the [18 March 2026 DICT–NPC–SEC advisory](https://privacy.gov.ph/wp-content/uploads/2026/03/DICT-NPC-SEC-Public-Advisory-on-Online-Lending-Platforms.pdf). Production privacy policies require review for this product.
- [PayMongo restricted-business policy](https://www.paymongo.com/restricted-businesses) lists lending instruments/payment facilitation as requiring prior written approval. PixelFlow support alone is not approval.
- [BSP loan calculator guidance](https://www.bsp.gov.ph/Pages/Forms/DispForm.aspx?ID=1895) supports full-cost/EIR disclosure; this design's proposed calculation is not certified by BSP.

Official references checked 2026-10-28. No numerical legal ceiling, production fee, signed contract validity, licensed status, live provider fit or deployed PixelVault capability is asserted.
