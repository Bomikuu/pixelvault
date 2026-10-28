# Offer detail · reference-led refinement

**Mode:** Operate. **Status:** implemented in the incumbent PixelVault identity, 2026-10-28.

The user supplied a two-column offer reference and requested the composition with smaller titles and icons instead of numbered sections. Keep the existing shell, blue/navy semantic roles, Manrope, actual member portraits and canonical controls. The screenshot supplies visual composition only: its inconsistent financial examples, generic Verified claim, completion counts, response rate and review score are not product facts.

## Composition

A small breadcrumb precedes the content grid. The left column has a 24px phone/28px desktop title, lender identity, Plan your loan, Full cost breakdown, Repayment schedule and About the lender. Section headers use 19px Lucide icons on 36px accent surfaces and 16px titles, without section numbers. The right 300px summary is sticky at the wide breakpoint and contains actual self-declared capacity, lender profile, application/investor-pitch actions, the current estimate and same-page section links. At narrower widths it follows the comparison and lender information in normal document flow. Discussion spans the content width below the grid, with its existing moderated composer before published comments. No shell replacement or new stylesheet was introduced.

## Behavior and truth

The existing authenticated offer query and calculator service remain authoritative. One current calculator response drives the payment summary, cost rows, exact schedule, geometric repayment-composition donut and side-card estimate. Request cancellation/sequence protection remains. The donut shows principal, interest and fees included in repayments; upfront lender fees remain explicit disclosure rows and are not counted as borrower repayment slices. Summary uses first payment rather than implying equal installments under equal-principal amortization.

Alternate frequency/count is clearly comparison-only. The side card names that state and requests carry only the amount into the original offer terms. Pending/invalid calculations clear estimate values and remove the enabled borrowing link. Application, publisher and pitch commands retain server validation and ownership rules. The compact pitch variant reuses the existing dialog; it does not create a second submission flow. Owner application review/publishing remains available.

The lender section reads the actual public profile and displays shared community XP, public showcased achievements and published-review counts. Hidden XP stays Not shared; unavailable profile data is explicit. No lender verification, payment reliability, response-time or lending-volume claim is invented. The existing private-support route replaces the screenshot’s offer-report action because the current report API accepts reviews/messages, not offers.

Buttons, inputs, selectors, dialog and table use the canonical @pixelvault/ui layer. Links are semantic navigation. The narrow schedule is a named focusable horizontal-scroll region with a visible instruction. Amounts use the existing exact centavo formatter; definition-list terms precede values semantically while visual order follows the reference. Cost and comparison states remain readable in both themes.

## Verification

Visual/browser only under the continuing user preference. No builds, automated tests, typecheck, UI/contrast checks or detector scripts ran. Browser observations covered 1440px light/dark, 390px and 320px, the real three- and six-payment server results, side-card/schedule synchronization, invalid-amount recovery, public lender facts, discussion composition, and the investor dialog with Escape dismissal. A correction batch added the narrow schedule cue and corrected definition-list order; the focusable schedule/cue was confirmed. Source review then found the canonical table’s nested scroll wrapper was intercepting the outer region; the feature now gives that region scroll ownership, and actual ArrowRight presses exposed principal/interest columns at 320px. No comment, application, pitch, contract or funding was submitted. Original amount, three-payment comparison, light theme and normal viewport were restored.

Local captures: ignored `.runtime/qa/offer-reference/`. Sanitized Jev guidance chose actual source data over screenshot values (404 input / 31 output tokens). The existing graphify graph located OfferDetail, Schedule, CostDisclosure and their route/shared-component relationships; its 205-node stale/truncated output is advisory, with current source and browser state governing this implementation. No subagents were spawned.
