# Investor contributions and agreement rooms implementation plan

**Goal:** Implement the approved room design in the existing test application, reusing borrower financial services and keeping unapproved investment money behavior blocked.
**Architecture:** One participant-scoped room engine, durable events and shared chat; separate borrower and investor agreement adapters. The current user has instructed proceeding in this session; use native execution and preserve visual-only verification.
**Tech Stack:** Django/DRF, PostgreSQL, existing SSE pattern, React/TypeScript, TanStack Query, Tailwind and canonical Shadcn controls.
**Spec:** ../specs/2026-10-28-investor-agreement-rooms.md

## Constraints and review focus

- No live investment activation, new price, loss guarantee or third-party call host is inferred. User accepted investor-allocated loss and a lender-paid separate fee. Numeric rate, return/exit dates and detailed fee policy remain unresolved.
- Money uses integer centavos/basis points; participation is not signing; signatures do not prove funding.
- No builds, automated tests, UI check, detector or typecheck in the current visual-only run. Record unrun financial/security validation honestly.
- Object access, stale revisions, retries, evidence privacy and duplicate funding must remain authoritative server checks.
- Preserve existing active loans and immutable agreement evidence.

## Tasks

- [x] Create `negotiations` app: participant-bound room, scheduled occurrence, own attendance, proposal revisions/approvals, hash-bound confirmations, command idempotency and durable events. Bounded list/detail/commands/stream routes reuse Thread/Message with a third context and reporting/rate limits. Own check-in and approval/waiting states were visually exercised by switching synthetic accounts; race/stale command rejection is source-only, untested.
- [x] Add investor pitches on a specific offer, contribution/share examples and blocked contract/funding/fee-policy presentation. Borrower rooms reuse application/reservation and exact agreement hash. Chat/receipt/acknowledgment never credits capital. Investment financial services are not implemented.
- [x] Implement shared room route/list, schedule/check-in, lender agendas, textual counterproposals, own approvals, evidence status/review, borrower contract adapter and honest call-unavailable state. Integrate offer, application, inbox and navigation with existing tokens, avatars, illustrations and Tailwind.
- [x] Add private room evidence sharing through explicit consent, authenticated participant checks on every download, revocation and existing file-safety quarantine. No expiring URL grants were added. Authenticity remains unverified and raw KYC remains private. Upload/download/revocation source paths have not been exercised.
- [x] Apply migrations and restart without a build; perform authorized desktop/mobile/light/dark visual review and sequential two-account checks. Correct mobile checklist/participant reflow and unreliable native date entry. Financial completion, independent simultaneous sessions, concurrency/security invariants and external providers remain unverified.
- [x] Record fresh Impeccable finish review and source-grounded surface/behavior documentation. After replacement of a malformed capture, the reviewer requested two material visual fixes; the same reviewer scored both resolved and returned **ship at the two-fix scope**. The full investment lifecycle remains outstanding.

## Deferred financial activation

Capital-credit ledger, funding-slice allocation, actual investment fee collection, default/withdrawal semantics, collected-interest payout/reversal services and public confirmed investor circles require the missing financial decisions and validated settlement integration. Do not create synthetic public investors or suggest that a receipt proves funding to fill these gaps. This plan delivers the safe room/pitch layer first and records the remaining slice explicitly rather than marking the whole financial extension complete.
