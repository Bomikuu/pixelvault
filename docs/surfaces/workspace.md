# Member workspace surface brief

**Mode:** Operate. **Status:** implemented Overview refinement inside the user-pinned identity, 2026-10-28.

**Job:** understand the next obligation or decision and inspect one reliable loan history. A member may borrow and lend from the same account.

**Borrower first viewport:** next payment/date and remaining balance; a Pay action when eligible; application updates; active loans. Achievements are secondary and optional. Never show offers as “available credit.”

**Lender first viewport:** applications needing a decision; amount remaining in their offers; confirmed versus expected collections; private overdue exposure. An offer amount is self-declared lending capacity, not money held by PixelVault. Settlement stays visibly separate from collection.

**Routes:** `/dashboard?role=borrowing|lending`, `/applications/:id`, `/loans/:id`, `/loans/:id/payments/new`, `/loans/:id/documents`, `/loans/:id/cases`, `/payments`, `/people`, `/documents`, `/analytics`, `/inbox`, `/profile`, `/verification`, `/lender-registration`.

**Signature interaction:** shared loan timeline with dates, signed terms version, disbursement evidence, installments, receipts and private case events. Both counterparties see relevant shared facts; reviewers' private notes and identity records do not become timeline entries.

**Decision screens:** application comparison uses consistently disclosed attributes; acceptance shows the exact schedule/hash and separate fee payer. Payment confirmation summarizes amount, loan, allocation and fees. No small modal for contracts, affordability review or hardship forms.

**States:** first loan, no obligations, pending signature, awaiting/uncertain disbursement, pending provider payment, reversed payment, partial payment, early payoff, hardship, case under review, suspended new borrowing, retained repayment access, missing documents and interrupted network. Refreshing or reopening must not duplicate a commitment or financial operation.

**Responsive behavior:** desktop single sidebar plus work area; mobile stable primary navigation and role context. Keep primary action and financial summary readable at 320px and with long localized labels. Reduced motion never hides a status change.


## Overview revision · 2026-10-28

The greeting, descriptive introduction and Explore community action are removed. The header summary card owns the existing borrowing/lending tabs, preserving the role URL and unrelated parameters. Its four metric tiles link to loan records and have semantic hover/focus feedback: remaining active principal (exact integer-centavo sum, excluding interest), active count, repaid count and distinct lenders/borrowers across the returned records. Loading and errors do not masquerade as zero balances. Two columns support narrow screens; desktop uses four.

Next payment/expected payment remains the main action. A native horizontal bar chart shows actual role-scoped loan counts by current lifecycle status, including zero rows, with visible text counts, an accessible figure caption and a shared zero baseline. Unknown future statuses retain their own labeled rows. Empty history and unavailable data have explicit states. The chart sits beside the next-action card on wide screens and below it before loan/application history on mobile. No historical payment series, realized yield, trend or wallet claim is fabricated. The existing canonical Analytics route remains available. No new chart dependency or API was introduced.

The incumbent blue/navy/Manrope world is preserved. Canonical Shadcn tabs own perspective selection; existing semantic links own navigation; Tailwind handles layout, compact mobile tiles, focus/hover and reduced-motion-aware bar updates. The touched next-action/foundation sections use semantic theme roles.

Visual-only browser review covered 1440×1000 light/dark, 390×844 and 320×740, real borrowing counts, the lending empty state, role switching and mobile chart placement. A correction batch compacted the mobile summary, moved the chart before history and applied semantic colors. Captures are under ignored `.runtime/qa/overview-list/`. No builds, automated tests, typecheck, UI check or detector scripts ran. Sanitized Jev guidance favored a current-status chart (390 input / 31 output tokens); the existing 205-node graphify map located Dashboard and reporting relationships but is stale/truncated, so current source and browser observations govern the implementation. No subagents were used.
