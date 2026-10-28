# Agreement rooms and investor pitches

**Mode:** Operate. **Status:** room/pitch phase implemented in test mode, 2026-10-28. The [approved full design](../specs/2026-10-28-investor-agreement-rooms.md) includes financial and call phases that are not implemented yet.

## Direction

**THESIS:** Two people discuss the same current terms, make their own decisions and see exactly what remains before a contract or transfer.

**OWN-WORLD:** Preserve the existing PixelVault blue P/keyhole, self-hosted Manrope, cool-white light and navy dark semantic roles, chosen avatars and thin-ink isometric illustration. Reuse `shared-plan.png` for contextual empty/info views. This is an ordinary code-led extension, not a new visual world or comp reproduction.

**STORY:** Open a pitch from an offer or a borrower room from an application; accept a scheduled Manila time; check yourself in; discuss one of three lender-led agendas; review current evidence statuses; approve the current proposal independently. Borrower rooms then reuse the existing exact-hash test agreement service. Investor rooms clearly stop before contract/funding activation.

**FIRST VIEWPORT:** Meeting title and offer, connection status, both pictured participants and personal attendance action. Desktop shows schedule/checklist, tabbed conversation and current proposal beside one another. Mobile shows participants and scheduling first, with a collapsed checklist before the same tabs and summary.

**FORM:** Incumbent code-led extension; no concept-roll seed or new comp applies. At `xl`, the room has a 210px checklist, flexible center and 285px proposal column; below it, one-column reflow. Canonical controls, Tailwind utilities, semantic colors and inherited focus/hover/motion remain the owners. Exact peso amounts do not animate.

Investment checklists end at the four implemented room/pitch steps and keep the future contract/transfer/activation notice visible, including while collapsed on mobile. The proposal introduction uses a divider, and the conversation log relies on spacing rather than another rounded enclosure; individual message bubbles remain distinct.

## Canonical UI map

| Concern | Owner |
| --- | --- |
| Buttons, fields, textarea, tabs, dialog, select, checkbox | `@pixelvault/ui`, backed by `packages/ui/src/components/ui` |
| Links, status/error feedback, contextual illustration | `apps/web/src/components.tsx` |
| Identity/avatar/earned flair | existing member/avatar components and server member summary |
| Routes, navigation, themes and area switch | `apps/web/src/app/router.tsx`, `Shell.tsx`, existing ThemeToggle |
| Private command state and stream recovery | `features/negotiations/useMeeting.ts` |
| Loan costs, reservations and exact contract acceptance | existing `marketplace` and `agreements` services |
| Private evidence storage and file-safety state | existing documents service plus participant-bound room evidence endpoints |

## Behavior contract

- `/meetings` and `/investments` show up to 100 current permitted rooms, newest update first; investments filters to pitches. `/meetings/:id` is scoped to the lender and participant. Application, offer, inbox and navigation entry points use this shared room.
- Lender schedules a timezone-aware meeting; UI labels typed date/time as Manila and 24-hour. Both accept the current occurrence; rescheduling clears attendance. Each checks in themselves within an hour. Foreground heartbeat expires after 45 seconds without renewal; old attendance is not proof of current presence.
- Lender pins Funding, Earnings/responsibilities or Documents/agreement. Either participant sends a message or textual counterproposal. Only lender publication creates a new shared amount/share revision. Old approvals never apply to a new version/hash.
- Authenticated SSE notifies changes; snapshots are the authoritative catch-up. UI labels connecting/reconnecting and polls as fallback; this is not a claim of uninterrupted delivery. Chat drafts survive failed sends. History and messages are bounded; earlier messages are indicated, without a full archive browser in this phase.
- Contribution amounts use integer centavos; investor share uses integer basis points. Example return is conditional on collected interest attributable to the contribution, excludes principal/penalties and is not a yield forecast. Investor bears allocated loss; lender-paid platform fee is separately disclosed and unpriced.
- Proposal approval is separate from evidence review and contract acceptance. Each action belongs to its authenticated participant. Financial acceptance requires both present and current independent proposal/evidence approvals; borrower contract acceptance is bound to the existing agreement hash. Once prepared, proposal editing is frozen; amendment handling is outside this phase.
- Evidence upload requires explicit sharing consent for this room. PDFs/PNG/JPEG remain quarantined pending existing file-safety review. Only clean, unrevoked room files can be downloaded by a participant; owner may revoke access. No raw identity/income application files are shared implicitly. Safety scan and a recorded identity status do not establish document authenticity. This phase has no independent authenticity-review tool.
- Evidence acknowledgments bind to the current proposal and evidence/check fingerprint. Changed or revoked files/checks invalidate the effective review. Checking a review box alone does not validate identity, create debt or transfer money.
- Pending investor appearance defaults anonymous; investor can choose named. No pending pitch is publicly published. Public confirmed-investor circles have no data source until confirmed contribution records exist.
- Audio/video opens an illustrated explanation of unavailable private call infrastructure. No public room URL, device permission or fake connected state is created. Provider integration is still required.
- Borrower flow delegates reservation and agreement acceptance to existing services, preserving eligibility, capacity and operation checks. Legacy applications without a linked room retain their existing actions; opening a room moves subsequent acceptance through its prerequisites.
- Investment contract execution, contribution/fee collection, capital ledger/allocation, public pot increases, investor circles and earned/payout/reversal records remain unimplemented. Uploading a receipt cannot credit capacity. Live origination stays disabled.

## Verification boundary

This change uses the user's explicit visual-only instruction. Migrations were generated/applied and sources formatted. No builds, automated application tests, typecheck, UI check, contrast check or detector were run. Historical automated results do not validate this extension.

Authorized browser review covered 1440×1000 desktop and 390×844/320×844 narrow layouts, light/dark end states, investor pitch, lender scheduling/agenda, each account's own check-in/proposal approval, evidence acknowledgment, unavailable-call dialog and borrower/list entry. Synthetic accounts were switched sequentially in one browser context; independent simultaneous sessions, transactional races, authorization attacks and actual borrower contract completion were not verified. File upload/download/revocation and external provider behavior remain unverified. Captures are under ignored `.runtime/qa/agreement-rooms/`.

The fresh Impeccable reviewer first requested replacing a malformed list capture; a settled viewport replaced it. Full review then requested explicit unavailable investment stages and flatter conversation grouping. One correction batch addressed both. Updated desktop, mobile/full-mobile and dark captures earned **ship at the two-fix scope**, with no visible regressions reported. Other captures are historical evidence of the initial pass, not final renders. This verdict does not certify the full investment lifecycle, financial services or security invariants.

The Impeccable documenter checked DESIGN.md, its sidecar, shared tokens and the negotiation sources, and found no durable system change requiring a rewrite. Existing sidecar missing component `refersTo` links and incomplete color tonal ramps were reported and left unchanged; planned financial/call capabilities were not recorded as shipped design rules.
