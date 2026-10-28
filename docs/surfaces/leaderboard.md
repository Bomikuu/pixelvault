# Community leaderboard

Mode: Operate. User-directed lending-statistics and theme revision inside the existing PixelVault brand. The user's latest request supersedes the earlier educational comparison columns and rank-colored cards.

## Direction contract

**THESIS:** Make the people and lending facts comparable: lifetime lent, loans funded, distinct people helped, reputation and showcased achievements. Keep financial aggregates separate from community XP ranking.

**OWN-WORLD:** Inherit Manrope, the blue P/keyhole and the original thin-ink/isometric podium illustration. All three podium cards use the same neutral surface and blue interactions. Light uses cool white surfaces; dark uses navy canvas, elevated blue-navy surfaces and readable pale-blue actions.

**STORY:** See current member-chosen badges and consented lending aggregates, open the badge overflow collection, visit a profile or manage participation. Exact peso totals remain static. Separate consent defaults off for lending totals; XP participation alone never publishes them.

**FIRST VIEWPORT:** Preserve the illustrated split hero and summary strip. The top-three cards lead with lifetime lent and funded-loan/people counts, then circular overlapping badges and animated reputation. The table uses lending columns and member pictures. At narrow widths, cards stack and the named keyboard-scroll region keeps all columns available.

**FORM:** User-pinned, code-led extension. Tailwind classes replace the leaderboard's feature CSS. Shared semantic token/control foundations remain in their existing system stylesheets. Visible hover/focus states apply to cards, rows, profiles and badges. The header theme toggle persists the choice and respects system preference initially.

**FINISH:** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Required interactions and truth

- Two circular showcased badges are visible; the dynamic +N control opens the complete selected public collection. Existing three-badge showcase limits and current eligibility still apply; +3 is never fabricated when only one badge is hidden. Tooltip/focus labels, real achievement links, Escape dismissal and focus return are retained.
- Lending totals use confirmed loan and disbursement records, including completed loans; amounts are integer centavos serialized as decimal strings. Borrower identities, borrowing totals and individual debt records remain private. The total strip includes only members who explicitly share aggregates. Sharing/amount changes invalidate the pagination snapshot.
- Reputation ordering and dense ties remain unchanged. The 560ms count-up applies only to XP, once per mounted member, with immediate reduced-motion values.
- New accounts default to private lending totals. Only six existing known synthetic @pixelvault.test fixtures were given demo sharing visibility. Current awards were evaluated against existing learning/funding evidence and up to three selected for those fictional showcases; no loan or contribution facts were fabricated.

## Verification boundary

The user explicitly requested **visual-only testing**, with no builds or automated tests/check scripts. The visual pass covers light/dark desktop, tablet, mobile and 320px, badge overflow and hover states, theme persistence and the sharing control. Static detector, UI-boundary check, typecheck, application tests and production builds are intentionally not run in this revision. Previous passing automated results belong to the preceding implementation, not this change.

Graphify's existing scoped/stale graph was advisory; current source governs new relationships. A sanitized Jev judgment favored a separate aggregate-sharing choice over reinterpreting past XP consent. No secrets or personal records were submitted.

## Finished implementation

The shared semantic theme is implemented in `packages/ui/src/styles/tokens.css` and the existing canonical control foundation. `ThemeToggle.tsx` initializes the document theme before React mounts, follows system preference until an explicit choice and persists that choice. The shell exposes the toggle in both desktop and compact headers. The leaderboard's feature stylesheet was removed; layout, type, responsive behavior and states now live in Tailwind utilities in its TSX components.

All three podium cards use the same neutral surface. Each shows the member's picture, static lifetime lent amount, funded-loan count, distinct people helped, selected circular badges and separate community reputation. Private aggregates read “Not shared.” The remaining members use the same lending fields in the comparison table. Cards gain a blue border and restrained shadow on hover; rows gain an accent tint; profile links and badges retain their own hover/focus feedback.

Two selected public badges are visible before the actual hidden count. The existing public showcase cap remains three, so a three-badge selection shows **+1**. The collection popover lists those selected, currently eligible awards and links to their details. Empty showcases have a textual state. No new badge capacity or fabricated **+3** count was introduced.

The demo still represents six known fictional participants. Existing evidence supports Elias Cruz's **₱10,000.00**, **two funded loans** and **one distinct person helped**; no new loan activity was invented for the presentation. Canonical award evaluation materializes existing facts, and the synthetic showcase selections demonstrate two circles plus one true overflow item. Community XP sorting and dense ties remain unchanged; shared lending amounts do not set ranks. The original podium raster and its existing provenance remain unchanged.

The aggregate-sharing checkbox is separate from XP visibility and board participation. `show_lending_totals` defaults to false for new accounts. The six existing synthetic fixtures explicitly share for the demonstration. The visible sharing label names lifetime lent amount, funded-loan count and people helped; it does not authorize borrower identities or individual debt disclosure.

## Current visual evidence and finish verdict

The current capture set covers requested viewports of **1440 × 1000**, **1024 × 900**, **390 × 844** and **320 × 740** in both themes. Full-page capture heights vary with content. Raster widths are 15px narrower where the browser reserves a classic vertical scrollbar; the 320px viewport has a 305px content client width.

| State | Light evidence | Dark evidence |
| --- | --- | --- |
| Desktop | [Capture](../../.runtime/qa/leaderboard-lending/light-desktop.png) | [Capture](../../.runtime/qa/leaderboard-lending/dark-desktop.png) |
| Tablet | [Capture](../../.runtime/qa/leaderboard-lending/light-tablet.png) | [Capture](../../.runtime/qa/leaderboard-lending/dark-tablet.png) |
| Mobile | [Capture](../../.runtime/qa/leaderboard-lending/light-mobile.png) | [Capture](../../.runtime/qa/leaderboard-lending/dark-mobile.png) |
| Narrow | [Capture](../../.runtime/qa/leaderboard-lending/light-narrow.png) | [Capture](../../.runtime/qa/leaderboard-lending/dark-narrow.png) |

Additional current captures show [dark badge overflow](../../.runtime/qa/leaderboard-lending/badges-dark.png), [narrow badge overflow](../../.runtime/qa/leaderboard-lending/badges-narrow.png), [dark hover feedback](../../.runtime/qa/leaderboard-lending/hover-dark.png) and [the separate sharing choice](../../.runtime/qa/leaderboard-lending/sharing-dark.png).

The implementation browser pass reported no page overflow and an empty console; the wide comparison dataset remains available inside its named horizontal-scroll region. It observed card border/shadow and row tint, Escape dismissal with focus returning to the overflow trigger, and dark choice persistence after reload. The narrow collection measured 281px wide, from x=12 to x=293 inside the 305px client width. The initial light preference and viewport were restored after inspection.

**Finish verdict: ship within this visual extension's scope.** A fresh reviewer opened all twelve current captures and found no material visual fixes. Documentation was grounded in the current token/control, theme, shell, leaderboard and sharing source, with a direct read of the supplied desktop, narrow collection and sharing captures. This evidence does not independently certify financial aggregation, persistence or keyboard behavior beyond the supplied source and implementation browser observations. Application tests, UI checks, typecheck, contrast scripts, detectors and builds were not run for this revision; updated fixture expectations and harness remain unrun. Prior passing counts are not current validation.

The approved global semantic roles and Tailwind-first rule are recorded in root `DESIGN.md`; `.impeccable/design.json` carries source-derived control previews, state timing, hover/overlay shadows and breakpoint metadata. Unrelated legacy design prose and styling drift were preserved rather than expanded into new rules.
