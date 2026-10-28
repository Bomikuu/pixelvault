# Profile and offer interaction direction

Mode: Operate. This is an extension of PixelVault’s incumbent visual system, not a replacement world. Evidence: the supplied branding/illustration references, existing generated scenes and the committed profile/offer implementation. No external screen comp is authoritative.

## Intent and truth

Members should be able to personalize their identity, understand what profile/XP progress means, register private contact details, invite a consenting verified proposed co-borrower and discuss/compare an offer before applying. Recommendations are actual published moderated relationship reviews. There are no invented “trusted” counts, public debt labels or repayment guarantees. A proposed co-borrower invitation does not create joint liability.

## First viewport

The profile shows the original illustrated cover, a 120px desktop/104px mobile photo or character, member identity and level, factual recommendation counts, clear edit/appearance actions and active profile navigation. The offer exposes a named lender and the amount/term calculator before the first application action; actual original terms remain explicit. Contact and invitation pages state their private purpose and offer direct profile navigation.

## Signature interaction

An anchored earned-achievement popup lets the member choose one actual eligible award as a public reaction, replace it or remove it, with Escape dismissal and focus restored to the trigger. Amount and frequency/count edits recalculate using the server; stale responses cannot overwrite newer input. Alternate terms are labeled comparisons and never silently enter an application.

## System and responsive rules

Keep Manrope, blue/navy/white, thin-ink editorial illustration and the established semantic contrast pairs. Use canonical Shadcn controls. The cover is an original raster asset with prompt provenance, not CSS shapes or a cropped branding board. At 320px, action text keeps normal padding, tabs wrap and table scrolling remains local. Photos retain their circular frame, fall back to a character and are passed consistently through people lists. The private setup bar is separate from community XP and respects hidden-point settings.

## Quality bar and rejection criteria

Quality means complete, findable working controls with real data, readable states, keyboard access and no page overflow at 320/768/1024/1440px. The component/API suites, UI boundary, contrast checks and bounded authorized browser captures are evidence. Reject hidden or inline substitutes for the requested popup, application actions preceding useful comparison, fixed-height wrapped actions, unreadable focus controls, fabricated social metrics, arbitrary image URLs and private contact leakage. Do not add gradients, decorative dashboard cards, bought reputation or loan-taking rewards.

## Implemented evidence and finish scope

The extension preserves the incumbent palette, Manrope typography, native control foundation and illustration family. Evidence checked: `packages/ui/src/styles/tokens.css`, canonical Button/Popover and control CSS, profile CSS/components, offer calculator/social components, private contact/invitation screens, and final captures under ignored `.runtime/qa/profile-v2/final/`. The cover at `apps/web/public/illustrations/profile-community-cover.png` was created with the built-in image generator; [its exact prompt and provenance](../brand/profile-cover-prompt.txt) are also embedded in the PNG metadata, with unchanged pixel hashes verified.

Five-line system summary:

- Palette: existing blue `#0866FF`, navy `#0B1428`, ink `#0F172A` and pale/white working surfaces; no new theme.
- Type: existing self-hosted Manrope hierarchy, tabular money and readable control labels.
- Identity: 120px desktop/104px mobile photo or illustrated character, eligible frame/flair and safe photo fallback.
- Interaction: canonical anchored earned-badge popup with dismissal/focus recovery; server-calculated comparison before application actions.
- Layout: active wrapping profile tabs, separated private setup/public XP, padded mobile actions and local table scrolling.

A fresh finish reviewer returned **fix**, followed by one correction batch and one confirmation pass. Its subsequent **ship** disposition scored these four items resolved: earned-badge popup, calculator placement before application, narrow action fit and skip-link contrast. This is approval of that four-item correction list, not whole-application or production acceptance. Browser checks returned no console errors/warnings, and temporary viewport overrides were reset.

The documentation agent encountered model capacity before writing; the root completed this ordinary-extension record using the documenter guidance. Root `DESIGN.md` is preserved. Its pre-existing prose format and absent machine-readable sidecar were not migrated or repaired as a side effect. No defect or hypothetical new visual system was canonized.


## Optional coarse activity · 2026-10-28

The user chose optional public activity. `show_activity` defaults false and is editable under Avatar frames & flair. Owners see their own coarse label with “Private” while sharing is off; other viewers see “Last online not shared.” Opted-in public responses expose only a state and coarse label, never `last_active_at`. Labels distinguish Online now (90-second freshness), within the past hour, today, this week and over a week ago; unknown history remains unavailable. Profile responses are private/no-store and foreground profile queries renew every minute. Authenticated visible tabs renew the underlying timestamp, with a server write throttle. Room attendance remains participant-only and independent of this preference.

The bounded visual review confirmed the owner’s private label, another member’s hidden label, the unchecked default control and successful save. The synthetic preference remains off. Automated privacy/regression tests were not run under the user’s visual-only instruction.
