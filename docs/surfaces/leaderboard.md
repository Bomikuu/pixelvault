# Community leaderboard

Mode: Operate. Extend the existing opt-in XP board using the user's supplied podium reference; preserve the surrounding PixelVault shell and the privacy/earning rules.

## Direction contract

**THESIS:** Celebrate useful community participation with a real illustrated podium, then make the actual rankings easy to compare. The reference supplies composition, never fictional names or metrics.

**OWN-WORLD:** Inherit Manrope, cobalt/navy/white, canonical controls and thin-ink isometric art with teal, coral and mustard. Silver/blue, gold and bronze distinguish podium places while text states every rank.

**STORY:** Understand what earns XP, see the top contributors and their factual learning/contribution breakdown, visit a profile or manage participation. Borrowing/lending volumes stay private; the user's reputation option uses existing community XP.

**FIRST VIEWPORT:** A two-column pale-blue hero, large left-aligned title/actions and original award scene on the right. A four-part factual summary strip leads into a 2–1–3 podium at desktop; a member table follows. Mobile puts the first contributor first and stacks the podium without horizontal page overflow.

**FORM:** User-pinned reference, code-led extension; no concept seed or alternative identity. Use server ranks, including ties, and an honest all-time scope. Missing positions remain absent.

**FINISH:** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Motion and quality bar

The single focal moment is the top-three XP count-up: at most 600ms, once per mounted member, no currency counters, no loops. Final values are always available to assistive technology. Reduced motion displays final numbers immediately. Refreshes and pagination do not restart existing counters.

Pass when the illustration uses the actual brand vocabulary, the reference's hierarchy is recognizable, every displayed count comes from opted-in current evidence, ranks/ties remain authoritative, profile links and privacy actions work, and 320px layouts retain names and metrics. Preserve loading/error/empty/pagination states and existing shared UI boundaries.

## Advisory evidence

Graphify traced incumbent community/profile relationships; its existing graph is scoped/stale, so current source and tests govern new relationships. Jev 0.7.0 selected `community_xp` over unconsented financial-volume ranking at confidence 1.0 using only sanitized product rules. This is advisory, not a privacy or creditworthiness certification. Impeccable context loading was already unavailable in this session; PRODUCT.md, DESIGN.md and applicable references were read directly.

## Shipped comparison and system fit

Recorded 2026-10-28 from the finished [leaderboard component](../../apps/web/src/features/leaderboard/Leaderboard.tsx), [surface stylesheet](../../apps/web/src/features/leaderboard/leaderboard.css), [XP counter](../../apps/web/src/features/leaderboard/XpCount.tsx), [shared explanation](../../apps/web/src/features/leaderboard/CommunityXpInfo.tsx) and [appearance settings](../../apps/web/src/features/ReputationPages.tsx). [PRODUCT.md](../../PRODUCT.md) and [DESIGN.md](../../DESIGN.md) remain the incumbent authority; this is an ordinary surface extension, not a new visual world or approved system change.

The user-pinned composition (`/tmp/codex-clipboard-d08df3aa-9755-4ff4-b78f-4b2d3e37d889.png`) is recognizable in the split pale-blue hero, prominent two-line heading, award scene, four-part summary, desktop 2–1–3 placement and comparison table. The shipped work inherits PixelVault's existing navigation, Manrope, blue/navy identity, white surfaces and thin-ink isometric illustration vocabulary. The original [podium raster](../../apps/web/public/illustrations/community-podium.png) supplies the scene; its [exact prompt and provenance](../brand/leaderboard-podium-prompt.txt) are recorded and provenance is embedded in the PNG. The pixel SHA was verified unchanged after metadata embedding. The scene contains no embedded interface copy or money imagery.

The implementation deliberately reports current opted-in community XP, completed learning checks and distinct approved educational contributions. It uses the user's reputation alternative; private lending/borrowing totals are excluded. Summary totals describe the current participating set. The only period is the supported “All time” scope. Server dense ranks and ties remain authoritative: tied first-place members retain first-place color/crowns even when placed in different podium positions. The reference's sample counts, invented activity categories and unsupported period controls are not presented as live capabilities.

Surface-specific type uses a bold hero heading (2.5rem, narrowing to 2.125rem and 1.875rem), section heading (1.25rem), XP figures (1.5rem), supporting copy (0.875rem) and compact labels (0.6875–0.8125rem). These describe this surface, not a replacement global type scale. Rounded panels (14px), light borders, flat tonal grouping and canonical outline actions continue the incumbent material language. Shared controls preserve their visible focus and primary touch target (44px).

At 800px and below, hero content and podium entries stack, server entry order puts the first contributor first, and the summary becomes two columns. Comparison columns remain in the canonical table. Its named, keyboard-focusable horizontal region has a visible blue focus outline and a narrow-screen scroll cue. Loading, error/retry, empty and load-more states remain explicit. The 560ms XP count-up runs once per mounted member; exact final values are exposed to assistive technology throughout. Reduced motion, hidden documents and changed preferences resolve to final values. Financial totals never use this counter.

## Completion evidence and limits

- Finished captures: [desktop](../../.runtime/qa/leaderboard-v2/desktop.png), [mobile](../../.runtime/qa/leaderboard-v2/mobile.png), [narrow](../../.runtime/qa/leaderboard-v2/narrow.png), [tablet](../../.runtime/qa/leaderboard-v2/tablet.png) and [focused mobile table](../../.runtime/qa/leaderboard-v2/mobile-table-focus.png). The implementation pass reported viewport checks at 1440×1000, 390×844, 320×740 and 1024×900: no document overflow or console warnings/errors, with temporary overrides reset. Full-page raster widths are respectively 1425, 375, 305 and 1009px because captures omit the classic 15px scrollbar; these widths are distinct from the configured viewport widths.
- Final scoped verification reported 52 PostgreSQL tests and 10 frontend tests across three files passing, plus TypeScript and the 77-module UI boundary check. Semantic contrast checks passed (10 pairs); 12 additional leaderboard body-text pairs were at least 5.50:1 and the large blue heading was 4.46:1 against its 3:1 requirement. OpenAPI validation, Django checks, Ruff and migration-drift checks also passed.
- The detector ran once on changed UI and returned `[]` with exit 0. The finish reviewer initially requested only scroll accessibility. After that single fix batch, the same reviewer's verdict-only confirmation resolved the finding and returned **ship** within that one-fix scope, with no regression observed. This is bounded review evidence, not whole-product acceptance.
- The documenter checked the current source and supplied captures, without running a browser, application build or additional application tests. No external action, deployment or production acceptance is claimed. The captures show the explicitly labeled synthetic test environment; displayed fixture values are not production metrics.

Pre-existing drift remains uncanonized: root DESIGN.md uses its incumbent prose format rather than the current canonical token/section format, its proposed scale and some proposed colors differ from current source, and `.impeccable/design.json` is absent. This extension does not repair that root documentation drift or promote its page-specific hero, podium colors or compact labels into global rules. A sanitized Jev boundary judgment also selected surface-only documentation (confidence 1.0); direct scope and source checks govern the decision.

## Five-line design-system summary

1. **Palette:** inherited cobalt/navy/white; pale ice-blue hero with rank-aware gold, blue and bronze podium fills.
2. **Type:** inherited Manrope; bold 2.5→2.125→1.875rem hero, 1.5rem XP, 1.25rem sections and compact supporting labels.
3. **Form:** flat tonal grouping, 14px panels, light separators and canonical controls with visible focus.
4. **Truth rule:** opt-in current XP evidence, authoritative dense ties and private financial activity excluded.
5. **Access rule:** first-entry-first mobile stacking, named keyboard-scrollable comparison and immediate reduced-motion totals.
