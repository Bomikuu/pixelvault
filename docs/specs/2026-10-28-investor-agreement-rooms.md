# Investor contributions and live mutual-agreement rooms

Status: design approved by the user's “proceed”, 2026-10-28; room/pitch phase implemented in the test application. This document describes the full intended extension, not a claim that every phase is implemented or approved for live use. See [the surface and behavior contract](../surfaces/agreement-rooms.md) and [implementation status](../IMPLEMENTATION.md) for the delivered boundary. Investment financial activation and audio/video integration remain unimplemented.

## 1. Intent and confirmed scope

Allow an individual to request to contribute capital to a lender's specific offer and negotiate a percentage of the collected interest attributable to that contribution. Reuse the same private meeting room for lender–borrower offer acceptance. Participants schedule a meeting, check themselves in, negotiate structured proposals alongside chat, review evidence and the exact agreement, independently accept, then track verified funding.

The user confirmed that investor earnings come from **interest actually collected from loans funded by their contribution**, excluding principal, late fees and uncollected interest. The percentage is negotiated per agreement; this document does not set a commercial rate.

The user also requires lender-selected agendas, an interactive benefit calculation, microphone/camera options, public investor circles with an anonymous option, and a one-time platform commission on the investment transaction. Public pot availability increases only after confirmed funding, never after a pitch, meeting, signature or receipt upload.

The approved request extends PRODUCT.md with private test-mode investor pitches and negotiation rooms. Financial activation remains outside the delivered phase. Individual lenders remain counterparties. Nothing here claims that individuals, PixelVault or a provider have authorization to offer this investment model live.

## 2. Architecture options and recommendation

1. **Recommended: one shared room engine, two financial adapters.** A room coordinates scheduling, presence, chat, proposals, evidence and approvals. Borrower agreements continue through the existing loan acceptance/disbursement services. Investor agreements have separate contribution, allocation and earnings records. This avoids pretending an investor is a borrower or weakening existing loan invariants.
2. Separate investor and borrower rooms. Faster to specialize initially, but duplicates presence, signing, permissions, conflict handling and recovery; the two experiences would drift.
3. Chat messages plus an external meeting link and manual receipt confirmation. Smaller initial change, but messages cannot reliably establish which terms were accepted, funding attribution or actual settlement. This does not satisfy the requested mutual workflow.

Keep the existing Django/DRF, PostgreSQL, Redis, React/TypeScript, React Router, TanStack Query and canonical Shadcn stack. REST commands mutate state; authenticated server-sent events notify participants of committed room revisions. The existing public discovery SSE endpoint is a pattern reference, not a private-chat transport that can be reused unchanged.

## 3. Three lender-led agendas

| Agenda | Lender opens | Other participant can do | Shared outcome |
| --- | --- | --- | --- |
| Funding plan | Amount, offer/use of capital; borrower principal in borrowing rooms | Accept the proposal, counter or request changes | One agreed amount and funding context |
| Earnings and responsibilities | Investor share, duration, capital-return/loss terms; borrower interest and repayment schedule instead | Adjust a counterproposal and inspect the calculation | Agreed commercial terms with costs and risks visible |
| Documents and agreement | Evidence checklist, redacted shared documents and the generated contract | Inspect, flag a mismatch, acknowledge and independently accept | Both accept the same current contract version |

The lender controls which agenda is pinned to the room. That does not let the lender answer for the other person, mark their attendance, approve their documents or bypass prerequisites. Both people may send messages or counterproposals. A counterproposal is visible as a separate proposal until the lender publishes a new shared revision; it never silently overwrites the current agreed terms.

## 4. Workflow and reordered sidebar

1. **Schedule and check in.** Both accept one Asia/Manila meeting time. Each presses “I'm here” themselves. Show invited, accepted, checked in, away and disconnected distinctly.
2. **Review required evidence.** Check the relevant identity/contact, funding-account and authority statuses. Share only explicitly selected, safe, appropriately redacted evidence. An automated file-safety scan is not proof of authenticity.
3. **Agree on the amount.** Choose the contribution or loan principal and target offer. Show capacity and any existing reserved amount.
4. **Agree on earnings or repayments.** Investor rooms show the contribution-based interest-share example, duration and capital-return/loss terms. Borrower rooms show total cost, fees, dates and repayment schedule.
5. **Review the contract and fees.** Generate a versioned, hash-bound document from the agreed terms, evidence references, policy and fee disclosure. Flag the demo template as unreviewed for live use.
6. **Both accept this version.** Each participant independently accepts the same hash with authenticated provenance. The lender cannot complete both sides. Attendance and proposal acknowledgments are not signatures.
7. **Transfer and verify.** Track contribution transfer, loan disbursement and platform fee collection as separate operations. Submitted evidence, recipient acknowledgment and independently confirmed settlement are separate states.
8. **Activate and track.** On authoritative confirmation, credit capacity once or activate the loan through its existing service. Show funding history, statements, capital allocation, earned amounts and pending versus confirmed payouts.

Steps are a checklist with explicit blockers, not a decorative percentage that implies legal readiness. Chat remains available while a review is pending. Participants can reopen an earlier discussion; material changes create a new contract version and invalidate draft approvals for the superseded revision. Already recorded acceptances remain immutable evidence.

After both parties have accepted, edits require a separate amendment/new agreement. A scheduling change does not rewrite signed documents. The final confirmation is explicit and names the amount, recipient, fees and exact contract version.

## 5. Room layout and design contract

Mode: Operate. Inherit the existing blue PixelVault P/keyhole, Manrope, cool-white/navy semantic themes, header area switch, collapsible navigation and Tailwind-first component styling. No replacement visual identity is proposed.

Desktop room topology:

```text
Meeting title · scheduled time · connection state · participant avatars
[Amount] [Earnings / repayments] [Documents and agreement]   [Audio] [Video]
+----------------------+----------------------------------+-----------------------+
| Agreement checklist  | Pinned current proposal          | Current agreed terms  |
| step + real blocker  | Both participants' responses     | Benefit/cost example  |
| completed evidence   |                                  | Evidence and version  |
|                      | Chat and factual event timeline  | My confirmation state |
|                      | Message composer                 | Next permitted action |
+----------------------+----------------------------------+-----------------------+
```

At narrow widths, use one route with “Conversation”, “Agreement” and “Documents” tabs and an accessible checklist disclosure. Keep the current amount/version and waiting-on-whom status visible. Do not stack a full desktop video grid, checklist and chat into an unreadable narrow panel. Calls can be minimized without stopping the room conversation.

Proposal changes receive a restrained highlight and an announced “New terms to review” state. Show person pictures with all people lists, distinct “You agreed”/“Waiting for …” statuses, and real timestamps. Keep exact financial values static; interactive inputs immediately recompute the clearly labeled example. No celebratory return counters or guaranteed-yield presentation.

A short explanatory popover may use existing branded agreement/verification artwork. Full agreements, signatures, funding evidence and multi-step reviews stay on the room route rather than a chain of modal dialogs. A disconnected or unconfigured call shows its actual state and preserves text chat.

Canonical owners: Button/ButtonLink-style ActionLink, Input, Textarea, Label, Select, Tabs, Dialog, Popover, Table and existing notifications in packages/ui and apps/web/src/components.tsx. Reuse shared token CSS and existing ThemeToggle. Room-specific layout and state styling use Tailwind classes; add shared behavior components only where both room variants use them. No build or new feature stylesheet is required to express this design.

## 6. Earnings calculation and ledger truth

The financial record is attributable loan funding, not the lender's entire book or a client-entered estimated profit. A contribution is tied to exactly one offer for the first release. It cannot increase every posting belonging to the lender.

For a funded loan:

- `P` = total principal actually disbursed, in centavos.
- `A_i` = this investor contribution's principal allocated to that loan, fixed at funding.
- `I` = eligible interest actually collected and not reversed.
- `s_i` = negotiated investor share, integer basis points from 0 to 10000.
- Attributable interest is the investor slice of `I` using `A_i / P`.
- Investor earnings are that attributable interest multiplied by `s_i / 10000`.

Illustration only: ₱10,000 of investor capital funds half a ₱20,000 loan. If that loan actually collects ₱1,000 interest, ₱500 is attributable to this capital. A negotiated 20% investor share yields ₱100. This is a conditional calculation, not a prediction or promised rate. Principal recovery is tracked separately from that ₱100.

Use integer/rational arithmetic, not binary floating point. Allocate each collection's interest and principal across funding slices with a deterministic largest-remainder rule and stable slice-ID tie-breaker, including the lender's own slice. For each investor slice, accrue the agreed percentage cumulatively and post only the difference from previously posted earnings, preventing rounding gains from splitting one payment into many. The residual remains in the lender earnings ledger; no centavo disappears or is paid twice.

No share applies to principal, unpaid future interest, late fees, platform fees, provider fees or unrelated loans. Reversals reference the original allocation and post compensating entries. If earnings were already paid, a negative adjustment creates a recovery/payout hold for review; it must not silently debit a bank account. Show earned, due, requested, payout-pending, paid and reversed separately. “Earned” never means the investor has received money.

The initial proposal is non-revolving: recovered capital does not automatically fund another loan. Any reinvestment requires another mutually accepted allocation policy/agreement. Capital-return deadlines, exit rights and default losses are mandatory terms, not implied by a profit percentage.

### Confirmed capital/default direction; remaining terms

The user answered “go with your suggestion” to the proposed terms. The accepted direction is allocated investor loss with no capital guarantee; the lender does not guarantee capital repayment following borrower default. Exit mechanics, capital-return dates and a reviewed investment agreement remain unresolved. They must appear in the eventual contract before investment finalization; an interest-share percentage does not settle them.

### Platform commission decision for review

A one-time investment-transaction platform fee is requested. The user accepted a lender-paid fee charged separately so the full investor contribution enters the pot. No numeric rate was proposed or selected. The rate, tax treatment and refund/reversal rule remain unresolved. The future financial phase needs a separate versioned `ContributionFeePolicy` with exact payer, basis, rate, cap, tax treatment, refund/reversal rule and evidence. “Not configured” blocks finalization; do not show an invented 0% or silently copy the loan-origination fee policy.

The confirmed pricing presentation is a separately disclosed, lender-paid fee in addition to the investor's contribution, preserving full contributed capital. Disclose whether the existing funded-loan origination commission also applies later; do not hide two fees on different events. Investor earnings share and platform commission have different labels, ledgers and recipients. No recurring platform repayment commission is introduced.

## 7. Verified funding and the public pot

Retain `LendingOffer.declared_amount` as the total capacity projection used by its existing reservation invariant, while introducing an explicit `lender_declared_amount` source component backfilled from existing offers. The derived total is lender-declared capacity plus eligible confirmed investor credits, less capital withdrawals/reversals that can be safely applied. A lender editing their own declaration must not overwrite investor credits.

Maintain a separate immutable capital ledger and funding-slice reservations. Under one offer lock, a reservation allocates exact own-capital and investor slices using an explicit oldest-confirmed-first rule with stable IDs; each slice and the offer must have sufficient unreserved capacity. Lock order is offer, contribution/slice IDs, reservation, agreement. Release slices on reservation expiry/cancellation. Convert reserved slices to committed on both acceptances, and mark the actual funding allocation only on valid confirmed loan disbursement. Existing acceptance commits capacity before disbursement, so this distinction must be preserved.

A confirmed contribution event has one unique source key and amount/currency/recipient checks. Replay cannot increase capacity twice. Contribution interest cannot accrue before its capital actually funds a loan. Public labels distinguish lender-declared availability from verified investor contribution; neither is a PixelVault wallet or a claim that PixelVault holds the funds.

A receipt image, OCR match, both parties saying “received”, completed chat checklist or video attendance cannot independently prove settlement. Use an approved provider's authenticated, reconciled evidence or a recorded finance review of independent bank records. Sandbox-only fixtures may simulate these facts with visible synthetic provenance. An unknown/timeout outcome remains uncertain and is reconciled with the original operation ID, not re-dispatched.

Unexpected amount, currency, destination, contract hash, expired funding date or duplicate reference creates a review exception and no automatic capacity increase. A receipt can be rejected and replaced without destroying its audit history. If a transfer is reversed after its capacity was committed, freeze new lending and route the shortfall to finance review; never reduce the offer below reserved + committed or silently remove active obligations.

Only confirmed and eligible contributors appear on the posting. Deduplicate by investor, show up to three circles and the true hidden +N count. Named appearance is an explicit opt-in. Anonymous appearance uses a generic portrait and label, with no member ID, handle, photo URL, reputation, link or stable cross-offer pseudonym in the public response. An investor remains known to their counterparty and authorized staff for the agreement. Pending pitches, private documents and amounts per investor do not enter the public feed. A participant may switch named visibility off without changing their financial agreement.

## 8. Scheduling, presence and real-time behavior

Meeting times are UTC in storage and displayed with Asia/Manila and the explicit date/time. One participant proposes; the other accepts or counters. Rescheduling makes the old meeting occurrence obsolete and requires new check-ins. Warn about scheduling conflicts; never mark “both arrived” from a scheduled start alone.

Each authenticated participant confirms their own arrival for the accepted occurrence. Heartbeat every 15 seconds; after 45 seconds without one, show away/disconnected. “Both here” requires current check-ins and overlapping current presence. This is session presence, not face/identity verification. The lender cannot override the other participant's check-in.

Money-affecting confirmations and proposal acceptance are disabled while the client is offline, stale or missing the other participant's current presence. Reconnect fetches the authoritative snapshot before re-enabling them. Preserve message drafts; do not queue financial acceptances for later automatic submission. After signing, provider verification can complete asynchronously without requiring both browsers to remain online.

Commands carry `operation_id` and `expected_revision`; contract acceptances additionally carry the exact hash. Reusing a key with different data returns 409. Every command checks current membership/role/eligibility and stage server-side; hidden buttons are not authorization.

Events have per-room monotonic sequence IDs and are published only after the database transaction commits. SSE resumes after the last observed ID; a retention gap triggers a snapshot refresh. Recheck session/membership during streaming and stop on revocation or expiry. Redis notification loss cannot lose durable chat or financial state. On stream failure, show “Reconnecting” and use bounded snapshot polling every 3 seconds while visible; no claim of live connectivity while polling. Bound concurrent connections, messages, file access and presence requests per account/room. A state/event payload never includes raw document bytes, download grants or provider secrets.

## 9. Voice and camera

Recommended open-source integration: [Jitsi Meet](https://github.com/jitsi/jitsi-meet) through its [React SDK](https://jitsi.github.io/handbook/docs/dev-guide/dev-guide-react-sdk/) or [IFrame API](https://jitsi.github.io/handbook/docs/dev-guide/dev-guide-iframe/). It supports embedded meetings and exposes mute/camera/participant events. These events describe the call, not legal acceptance or funding proof.

Use a configured, approved service origin and server-issued, room-bound, short-lived participant credentials. The default public meeting service is not an acceptable fallback for private financial rooms. Jitsi's [token-authentication guide](https://jitsi.github.io/handbook/docs/devops-guide/token-authentication/) permits anonymous-domain arrangements; simply adding a token does not prove room privacy. The selected deployment must require authorized membership for every join, disallow empty/anonymous admission and enforce room scope, expiry, revocation and participant limits. Verify this before enabling calls. The older secure-domain authentication setup is deprecated according to current upstream documentation.

The app starts neither microphone nor camera automatically. Participants choose “Join audio” or “Start video” after a provider/privacy notice and browser permission. Permission denied, device absent/in use, unsupported browser, connection failure, call ended and provider unavailable have explicit states; text negotiation remains usable. No recording, transcription, screen sharing or document forwarding is enabled for this first release. Unmount/end-call releases devices and listeners. No signing key or JWT is persisted in URLs, local storage, analytics or chat.

Without an approved configured deployment, show “Audio/video isn't configured yet”; do not simulate an active call or silently transmit room/identity data to a public host. Provider setup is its own deployable workstream, not an assumed frontend feature.

## 10. Private documents, authenticity and authorization

Reuse the existing private Document upload, quarantine, file limits, audit and actor-bound grant pattern. The current `documents.services.permitted_document` permits owners and assigned verification staff; it does **not** authorize counterparties. Do not weaken that policy globally.

Introduce explicit room-scoped evidence and grants with owner, room, selected recipient, purpose, version, expiry and revocation. Sharing a redacted derivative never shares the raw identity/income file. Each grant/content request rechecks current room membership, owner consent, file safety and reviewer scope. Downloads are private/no-store and audited. Case staff access requires a purpose, role and case assignment; no blanket admin endpoint over all rooms.

Keep file safety, authenticity review, ownership/account match, validity/expiry and counterparty acknowledgment as separate facts. Show “Pending review”, “Review passed”, “Expired”, “Mismatch” or “Rejected” with source and review date. Never label a document “real” from an upload or sandbox scan alone. Superseded/revoked required evidence blocks final acceptance until corrected and, if material, re-versioned. All fixtures are synthetic; no real KYC or bank document is needed to develop the feature.

Live retention periods and lawful bases need the reviewed privacy policy before real personal data is collected; do not invent a retention duration here. Existing retention/legal-hold controls remain applicable. Closed rooms preserve required financial/audit facts while file access follows consent and approved retention.

## 11. Domain boundaries and source map

| Unit | Responsibility / intended source location |
| --- | --- |
| `negotiations` Django app | Room, accepted meeting occurrence, presence, agenda, immutable proposal revisions, acknowledgments, durable event outbox and read projections |
| Existing `community` messaging | Reuse rate-limited, idempotent message service. Extend Thread's exactly-one-context constraint to include an investment request; loan/application threads remain valid. Room references its unique thread rather than duplicating chat storage |
| `investments` Django app | InvestmentRequest, immutable InvestmentAgreementVersion/acceptances, CapitalContribution, FundingSlice, CapitalLedgerEntry, InterestShareEntry and separate payout/fee operations |
| Existing agreements | Keep borrower-only AgreementVersion and Acceptance invariants; adapter calls `agreements.acceptance.prepare_agreement` and `accept_agreement` rather than treating investor as borrower |
| Existing marketplace | Extend offer own/total-capacity projection and source-slice reservations alongside `marketplace.reservations.select_application` and expiry handling |
| Existing servicing | Connect confirmed `servicing.transfers` and `servicing.allocation` facts to investment slices; never derive collected interest from a scheduled installment |
| Existing documents | Extend scoped grants without bypassing `documents.services.permitted_document`; append dedicated room-evidence/proof purposes and consent records |
| Existing payments/PixelFlow | Collect approved platform fees only under an explicit payable contract. PixelFlow collection success is not investor-to-lender transfer settlement or an investor payout |
| Web `features/negotiations/` | Shared AgreementRoom, room list/scheduling, agendas, proposal card, presence, chat, checklist, evidence and optional call panel |
| Web `features/investments/` | Pitch form, investor dashboard/statement, contribution/earnings display and public privacy-safe investor circles |
| Existing routes/features | Integrate Shell navigation, router, OfferDetail/OfferRow/DiscoveryWorkspace, application detail, AgreementPage and InboxPage using adapters |
| Shared contracts | Typed room snapshots, command results, investment DTOs and anonymous public projections in `packages/contracts/src/api.ts` |

New routes: `/meetings`, `/meetings/:roomId`, `/investments`, `/investments/:requestId`. Add “Meeting rooms” in the community/navigation area and “Investments” in the private dashboard. Existing `/inbox` links into context-specific rooms; it does not become a second negotiation engine.

A borrower room can start when a lender reviews an application, before capacity reservation. Final agreed terms must first be committed to a new policy-validated application/disclosure revision accepted by both parties, then selected/reserved and rendered through existing agreement services. Never edit immutable signed terms or bypass the capacity check to fit a room proposal. For newly submitted applications after rollout, the old direct-select/accept endpoints must enforce the same room prerequisites server-side. Existing active loans and already accepted contracts remain accessible and unchanged; explicit provenance/rollout rules handle in-progress legacy applications rather than silently migrating signatures.

## 12. Independently reviewable delivery slices

1. **Shared meeting and borrower-room engine:** authenticated scheduling/check-in, durable chat/events, proposal negotiation, private evidence and adapter-backed exact-version borrower acceptance. No investment money behavior yet.
2. **Investor agreement and capital allocation:** pitch, separate acceptance, explicit risk/exit terms, approved contribution fee policy, reconciled funding and exactly-once capacity credit with private/public projections. Test-only activation.
3. **Collected-interest statements and reconciliation:** slice allocation, cumulative share calculations, reversals, capital-return and payout records with distinct pending/confirmed states. Synthetic settlement adapters only until approved provider contracts exist.
4. **Configured audio/video deployment:** provider isolation and membership credentials, device UX and revocation verification. Text rooms remain independently usable while provider setup is absent.

Do not introduce live investment solicitation, investment checkout or money transfer as a frontend flag. Live activation requires separate reviewed product/legal/provider and operational evidence. Contracts in these slices are visibly test/demo agreements, not assertions of enforceability.

## 13. Acceptance evidence required at implementation

This design-only change runs no application tests or builds. The user's preceding visual-only/no-build instruction remains in force until changed. The following describes required coverage, not checks already run or permission to run them:

- Two independent accounts see schedule/agenda/chat/proposal changes; one cannot check in, agree or sign for the other. Reconnect catches up without duplicate messages or stale financial commits.
- A counterproposal after the first approval makes the previous proposal obsolete; stale revision/hash acceptance returns 409; old contract evidence remains intact. Concurrent accept/withdraw/edit paths have one deterministic outcome.
- Unauthorized room IDs, event streams, evidence grants, provider tokens and public DTOs expose no other participant or anonymous investor identity. Grant revocation/session expiry stop access.
- Receipt upload, both-party acknowledgment, duplicated/out-of-order provider notifications and a transfer timeout do not mint available capital. A valid confirmation credits once; wrong amount/recipient/date remains an exception.
- Simultaneous borrower selections and investment withdrawals cannot overspend a slice or violate the offer reservation invariant. Reserved/committed/actually funded states remain distinct.
- Interest attribution uses only confirmed allocation facts; principal, penalties and uncollected interest never generate investor earnings. Partial/reversed collections conserve centavos; splitting a collection cannot create extra returns. Payout reversal after paid earnings creates a reviewed recovery state.
- Named/anonymous investor circles use real confirmed unique investors and true +N overflow; pending pitches do not appear. Capital is shown on its one offer, never multiplied across the lender's listings.
- Desktop, 390px and 320px, both themes, keyboard, reduced motion, meeting conflicts, long names, expired evidence, disconnected counterparties, device denial and provider-unavailable states stay usable. No automatic microphone/camera/recording.
- Automated PostgreSQL concurrency, service/privacy and frontend interaction coverage must be authorized before executing that verification phase; visual inspection alone cannot certify these financial/security invariants for release.

## 14. Evidence and live-launch boundary

Source review: current private messaging, agreement hashing/acceptance, reservation locks, document-owner/staff permissions, confirmed disbursement, collection/reversal allocation and one-time loan commission. Existing scoped Graphify graph: 205 nodes; bounded DFS returned 94 related nodes and displayed 52 within its 1,600-token budget. It is incomplete/stale for backend relationships; current source was checked directly. No graph extraction/model cost was incurred for this query.

Sanitized Jev advisory preferred versioned room confirmations with independent settlement evidence over chat/receipt-based funding, confidence 1.0 (414 input / 36 output tokens). It is advisory, not legal or provider approval; no secrets or personal records were submitted.

Legal inference for review: a contribution made for a share of a lender's earnings can implicate investment-contract/profit-sharing securities requirements. [RA 8799 §3.1 and §8.1](https://elibrary.judiciary.gov.ph/thebookshelf/showdocs/2/3988) defines covered instruments and the registration framework; [Power Homes v. SEC](https://elibrary.judiciary.gov.ph/thebookshelf/showdocs/1/44720) explains the investment-contract test. This design does not decide the exact classification, applicable exemption, licensing, crowdfunding eligibility, tax treatment or contract enforceability. The [SEC's 2019 crowdfunding rules index](https://www.sec.gov.ph/mc-2019/mc-no-14-s-2019-rules-and-regulations-governing-crowdfunding-cf/) was located, but its page returned 403; current rule text/amendments and applicability require direct authoritative review before any launch decision.

Jitsi source and current SDK/authentication documentation were read for the technical recommendation. No service was installed, deployed or configured, no camera/microphone was opened, no public meeting was created and no data was transmitted to a meeting provider. A chosen host, privacy/retention agreement, credentials, verified room-join controls and a service-capacity plan are needed before calls can be enabled.

The user approved this written design with “proceed”. The first implementation slice is recorded in the surface and implementation documents. Later financial/call slices and the acceptance criteria above remain outstanding; the room UI and source do not establish a launch-ready investment product. Live flags remain disabled.
