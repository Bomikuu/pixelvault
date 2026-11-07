# Interactive marketplace surface

Mode: **Experience**, with **Operate** dialogs. Artifact: `/marketplace` and `apps/web/src/features/interactive-marketplace`. Visual authority: existing PixelVault system plus the user-selected sprite/map concept in `docs/brand/interactive-marketplace-concept.png`. The approved specification explicitly permits the original labeled plaza when Google Maps cannot run.

**THESIS:** People meet through an inhabitable city room, then inspect current offer terms before entering the existing private lending workflow.

**OWN-WORLD:** Preserve Manrope, the P/keyhole identity, blue/navy semantic colors and canonical Shadcn controls. New authored pixel grids are a functional character renderer with facing/walk frames; they do not replace profile portraits or the established illustration library.

**STORY:** Choose city → explicitly join → walk/post/meet → inspect real offer → existing full offer/application flow. Game presence never establishes financial eligibility, actual location, a guarantee or XP.

**FIRST VIEWPORT:** Compact room header and status, viewport-filling world, actual online sprites or a clear join invitation and separate unattended offer boards. Desktop uses small floating Room chat and People & offers panels; both collapse. Post bubble opens a focused dialog. Phones use panel buttons/dialogs and preserve the world/touch controls. No platform rail, marketing hero, fabricated crowd or seeded activity.

**FORM:** User-pinned direction; no concept roll or quality-bar substitution. Source-driven implementation, not pixel-for-pixel reproduction of the synthetic map image. Virtual positions project through a Google overlay or responsive original plaza; the provider is lazy and independently replaceable. Bubble/modals/drawer preserve keyboard and touch alternatives.

## Initial in-thread finish review

No independent reviewer was dispatched, as explicitly instructed. Source and supplied captures were reviewed directly; two browser composition passes covered desktop/mobile and the reported corrections. No detector ran under the visual-only instruction.

Disposition: **ship within the demonstrated browser/plaza-preview scope**.

- **Persistence:** Existing PRODUCT.md, DESIGN.md, canonical controls and semantic tokens were retained. This surface owns the game composition; no global identity or sidecar changes were made for it.
- **Fidelity:** Walking pixel sprite, room selector, short anchored bubble, current offer dialog, people/offer directory and minimal viewport chrome match the approved mechanism. A single actual participant replaces the concept's imaginary crowd. Google imagery is an approved conditional adaptation: the captured fallback is labeled and real provider delivery remains pending, not represented as a pass.
- **Ceiling:** Initial mobile modal intrinsic overflow and excess narrow-world letterboxing were corrected. Guest sign-in return state and the null-record path were corrected in source. No further cosmetic hunt ran after confirmation; production/provider/accessibility assurance is outside the visual evidence.
- **Material fixes:** No unresolved visual blocker in the captured fallback views. Source release gates, actual Google delivery and distinct-account verification remain open in the linked checklist.
- **Keep:** Real membership/counts, source-owned money/rate basis, optional achievements, explicit public audience and financial review outside game commands.

## Initial documenter comparison

No changes to the incumbent DESIGN.md or `.impeccable/design.json`. Checked this surface's components, shared button/dialog foundations, existing theme roles and final desktop/mobile captures.

1. Palette: existing semantic blue/navy working surfaces; pixel palettes are local decorative assets.
2. Type: existing Manrope; compact room metadata, 14–16px controls, 20px Dialog titles and exact tabular money.
3. Layout: slim header, flexible immersive world, bottom composer; narrow touch pad and wrapped dialog actions.
4. Interaction: one owned trajectory, focused movement keys, explicit bubble publication, current-cost modal and ordinary private-flow navigation.
5. Motion: short walk frames and server trajectory interpolation only while moving; reduced motion removes walk cycling, and hidden/idle work stops.

Not canonized/repaired: the missing Google key and unexecuted release checks remain explicit delivery limits; no incidental system-format drift was repaired. [Evidence and pending gates](../marketplace/release-checklist.md).

## Compact panels revision · 2026-11-06

The user pinned a reference with left chat/activity and right people/offers and requested smaller elements plus a modal replacing the page-footer composer. This refines the existing Experience surface. Desktop panels are 256px wide below 1280px, then 272px chat / 288px directory; their heights are bounded to leave map controls and the world visible. Both have collapse/reopen controls. Below 1024px, room chat and the directory open as dialogs. The full-width composer footer is removed; the visible Post bubble action opens one shared canonical Dialog. An open desktop chat panel supplies the single primary posting action; a floating action serves collapsed/mobile views.

Room chat renders current, unhidden public speech bubbles from the existing authorized snapshot. Entries expire with their bubbles; Activity shows factual current membership and available offer boards. It is not a newly persisted chat history. Current person photos/avatars, public reputation and exact source offer amounts remain in the directory. The composer preserves a failed/closed draft in component memory, resets it after successful publication and remounts it across member/city changes. Opening a dialog stops world movement. No room, financial or provider contract changed.

In-thread finish review: the reference's compact overlay structure is present, the world gains the footer's height, controls retain hover/focus behavior and 44px targets, and semantic dialog fields work in both themes. The first pass exposed an overlapping desktop reopen button and duplicate posting action; those were corrected. A dark portal field inherited a white background outside the page's theme adapter; explicit semantic field utilities corrected it. No feature stylesheet, global design-system rewrite, new raster asset or subagent was used.

Observed visual/browser scope: default 1280×720 desktop, 390×844 world/chat and 320×740 composer/directory; light/dark, real synthetic sign-in/join, two harmless bubble publications, expiry, Chat/Activity and People/Offers tabs, collapse/reopen, draft close/reopen and confirmed sign-out. Final 320px directory input measured 254px with dark card background `rgb(17, 30, 53)` and text `rgb(248, 250, 252)`; the 390px page document measured 390px without horizontal overflow. These are bounded observations, not automated accessibility or concurrency certification. Google delivery remains unverified without a key.

Captures are under ignored `.runtime/qa/plaza-panels-2026-11-06/`: `marketplace-panels-desktop.jpg`, `marketplace-panels-dark.jpg`, `bubble-modal-desktop.jpg`, `people-dialog-320-dark.jpg`, `bubble-modal-320-dark.jpg`. Original guest session, light theme and default viewport were restored; the updated marketplace tab was retained. No builds, automated tests, UI/type/lint/detector checks or financial actions ran. Existing composer test call sites were updated without executing them.

Graphify's scoped query found six older community/session/discovery nodes; current feature source governed the component boundaries. Jev's sanitized layout advisory chose `compact_panels` (confidence 0.92; 432 input / 39 output tokens). No secrets or member records were submitted. Existing PRODUCT.md, DESIGN.md and sidecar remain unchanged by this revision.
