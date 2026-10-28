---
name: PixelVault
description: Blue identity with explicit light and dark semantic surfaces.
colors:
  primary-light: "#0866ff"
  primary-hover-light: "#0755d4"
  primary-dark: "#76b0ff"
  primary-hover-dark: "#9bc6ff"
  background-light: "#f8fafc"
  foreground-light: "#0f172a"
  surface-light: "#ffffff"
  muted-light: "#f1f5f9"
  muted-foreground-light: "#52637b"
  accent-light: "#edf3ff"
  accent-foreground-light: "#1648a7"
  border-light: "#dbe3ee"
  input-light: "#8b9aaf"
  background-dark: "#0b1428"
  foreground-dark: "#f8fafc"
  surface-dark: "#111e35"
  popover-dark: "#16263f"
  muted-dark: "#182a45"
  muted-foreground-dark: "#b3c0d5"
  secondary-dark: "#1b3354"
  secondary-foreground-dark: "#d4e5ff"
  accent-dark: "#203c61"
  accent-foreground-dark: "#e3efff"
  border-dark: "#334965"
  input-dark: "#69809f"
  podium-gold-surface-light: "#fff6d9"
  podium-gold-border-light: "#e4b442"
  podium-gold-surface-dark: "#352b16"
  podium-gold-border-dark: "#806225"
  podium-silver-surface-light: "#edf4fc"
  podium-silver-border-light: "#9db5d2"
  podium-silver-surface-dark: "#1b2b40"
  podium-silver-border-dark: "#4a6687"
  podium-bronze-surface-light: "#fff0e7"
  podium-bronze-border-light: "#d6a086"
  podium-bronze-surface-dark: "#38261f"
  podium-bronze-border-dark: "#8c5b40"
  podium-gold-marker: "#f4c64d"
  podium-gold-marker-ink: "#503800"
  podium-silver-marker: "#c6d9ef"
  podium-silver-marker-ink: "#243f60"
  podium-bronze-marker: "#e6b197"
  podium-bronze-marker-ink: "#5b2e1b"
typography:
  control:
    fontFamily: "Manrope, sans-serif"
    fontSize: "14px"
    fontWeight: 700
    lineHeight: 1.4
  leaderboard-display:
    fontFamily: "Manrope, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 800
    lineHeight: 1.12
    letterSpacing: "-0.035em"
rounded:
  control: "10px"
  panel: "14px"
spacing:
  compact: "8px"
  related: "12px"
  group: "16px"
  panel: "24px"
  section: "32px"
components:
  shell-expanded:
    width: "244px"
  shell-collapsed:
    width: "80px"
  page-mobile:
    padding: "24px 16px"
  page-desktop:
    padding: "24px"
  podium-badge:
    size: "44px"
  table-badge:
    size: "44px"
  podium-first-light:
    backgroundColor: "{colors.podium-gold-surface-light}"
    rounded: "{rounded.panel}"
    padding: "20px"
  podium-second-light:
    backgroundColor: "{colors.podium-silver-surface-light}"
    rounded: "{rounded.panel}"
    padding: "20px"
  podium-third-light:
    backgroundColor: "{colors.podium-bronze-surface-light}"
    rounded: "{rounded.panel}"
    padding: "20px"
---

# PixelVault design

Date: 2026-10-28. User-pinned branding guides the implemented semantic tokens and original derivative assets. These are not sampled official brand standards or designer-source exports.

## Overview

The existing blue PixelVault identity frames an information-rich community and lending workspace. Manrope, cool white or navy surfaces, and thin-ink isometric artwork remain the incumbent visual world. The connected-shell revision expands usable space and makes displayed podium positions distinct while preserving factual amounts, visible XP and member-controlled sharing.

**Key Characteristics:**

- Permanent blue P/keyhole identity and original derivative artwork.
- Semantic light/dark working surfaces with restrained borders and interaction feedback.
- Responsive navigation, in-place achievement details and factual social counts.

### Visual authority and boundaries

The [supplied board](docs/brand/pixelvault-brand-reference.png) fixes the name, tagline, geometric P/keyhole mark, blue/navy/white identity and variant family. Preserve that world. PixelCore's root PRODUCT.md, DESIGN.md and theme remain authoritative for PixelCore and are unchanged.

The reference is a brand board, not a screen specification. Its illustrated “Available credit ₱50,000” does not establish an approved credit facility or a real product amount. Use factual offer amounts and member obligations instead. The permanent logo stays blue; green/violet/amber example marks do not require recoloring the logo for every status.

Original derivative standalone logo/glyph and achievement vectors are in packages/ui/src/assets/brand with provenance. Do not crop a panel of this board and ship it as the production logo, guess the wordmark font, or generate a replacement identity. No source vector was provided. Obtain or prepare a faithful vector asset under the authorized asset workflow, with provenance; do not claim it is an original designer export.

### Structural thesis

The signature interaction is **offer → full schedule → private application → lender selection → mutual acceptance → confirmed funding → shared loan timeline**. The timeline is the factual thread joining payments, documents and private cases. It is not an honor/shame meter.

Signed-in members use one navigation hierarchy within each area, a clear Community/My dashboard switch, and Messages. Their mobile primary navigation is Explore, Dashboard, Inbox, Profile. Guests use public community destinations, with Explore, Leaderboard, Learn and Sign in in the mobile navigation; workspace and private actions appear only after a session member is available. Borrowing/Lending changes dashboard context without changing account identity. Financial review, signatures and multi-section cases use full routes; dialogs serve short confirmations.

Use information-rich rows for comparing offers and managing loans. A listing shows one named lender, offered amount, total-cost example, frequency, approximate area and precise verification attributes. A dashboard leads with the next action, not a promotional hero. Loan detail leads with status and next obligation, then timeline and schedule, with documents/cases in adjacent navigation.

### Brand expression and social features

The user-supplied illustration reference expands the supporting artwork with thin charcoal outlines, isometric object planes, sparse stippling and cobalt/teal/coral/mustard fills. Original editorial scenes, ten named achievement illustrations and eight fictional profile portraits share this vocabulary. Financial controls and the blue PixelVault mark retain their established design. See [illustration surface](docs/surfaces/illustrations.md) and [artwork catalog](docs/brand/artwork-catalog.svg).

Profile covers, an equipped badge shelf (up to three public selections) and one-time milestone feedback carry personality. Badge artwork must be original and readable at 24/48px. Criteria, earned date and source are available by focus or tap, not hover alone. The earlier general motion guidance was 150–250ms, with milestone feedback up to 600ms once and a static reduced-motion equivalent. The approved shell and theme timing below are explicit current exceptions.

No confetti when taking another loan, flashing overdue numbers, repeated celebration on refresh, leaderboard of indebted members, purchasable reputation or badges implying repayment insurance. Verification labels describe a specific check, such as “Identity checked”; never an unqualified “Trusted.”

### Planning and verification limits

Surface-specific priorities live in [surfaces/community.md](docs/surfaces/community.md), [surfaces/workspace.md](docs/surfaces/workspace.md), and [surfaces/admin.md](docs/surfaces/admin.md). The implementation follows code-first design with shared Shadcn controls. Initial automated verification and the preceding community browser revision are historical evidence recorded in [IMPLEMENTATION.md](docs/IMPLEMENTATION.md); they are not validation of this connected-shell change. No Impeccable workflow preference was stored.

Canonical controls have explicit native CSS foregrounds, backgrounds, padding and icon gaps, with the anchor reset excluding action controls. Dialog centering uses one native translation, with a viewport-bounded scrolling surface. Compact navigation and profile action rows wrap rather than overflowing. Community XP comes only from recorded learning and approved educational contributions; avatar frames and eligible award flair are cosmetic, and leaderboard participation requires opt-in with visible points.

The current user explicitly authorized visual-only verification: no automated tests, UI check, typecheck, contrast script, detector or build was run for this revision. The finish reviewer inspected the supplied current captures and returned **ship within the current extension**, with no material visual fixes. Static theme captures establish end states; source establishes the intended circular motion, not a frame-by-frame animation certification. The collapsed-rail capture establishes the shell state while the board is loading. Bounded browser observations and capture links are recorded in [the leaderboard contract](docs/surfaces/leaderboard.md). This is not exhaustive accessibility, financial, persistence or production validation. No new raster assets were introduced.

Future implementation must read Impeccable's craft-floor immediately before UI edits and use shared Shadcn controls. Verification follows repository policy and the user's current authorization; the current visual-only override takes precedence over the earlier automated-check guidance.

## Colors

Implemented theme update, 2026-10-28: the frontmatter records the actual shared theme values from `packages/ui/src/styles/tokens.css`. This approved light/dark update supersedes the earlier proposed color values for these roles; the earlier proposal is retained below as historical planning context.

### Primary

The blue identity remains permanent. Light mode uses the saturated primary for actions; dark mode uses the pale-blue primary with the dark canvas foreground for filled actions. Hover has its own primary value in each theme. The theme changes semantic UI roles, not the supplied brand or illustration assets.

### Neutral

Light mode pairs a cool page ground with white cards and popovers. Dark mode pairs navy ground with lighter navy cards, a distinct popover surface and pale text. Muted text, borders, input boundaries, secondary surfaces and accent states resolve independently in each mode. Ring color follows the active primary. The frontmatter's light accent values also serve the light secondary roles; light primary foreground is the white surface value, dark primary foreground is the dark background value.

**The Semantic Theme Rule.** Use shared semantic roles for new UI so foregrounds, surfaces and interaction states change together across light and dark modes.

### Displayed podium positions

Gold, silver-blue and bronze now distinguish first, second and third displayed positions. The frontmatter records their actual light/dark card surfaces and borders plus the fixed marker face/ink pairs from `Leaderboard.tsx`. These are positional treatments for the leaderboard, not new trust, repayment or financial-status colors. Ordinary cards retain the semantic neutral surface. Displayed positions follow the server's stable order; equal XP remains visible and does not become a claim of different reputation.

### Historical starting palette

The following incumbent proposal predates the implemented semantic theme and distinct-podium revision. Its values and automated-check wording are historical, not competing current tokens or authorization for checks.

| Role | Light starting value | Usage |
| --- | --- | --- |
| Primary | `#0866FF` | Primary actions and active selection |
| Highlight | `#398BFF` | Brand artwork and restrained emphasis |
| Navy | `#0B1428` | Inverse branding and proposed dark base |
| Ink | `#0F172A` | Primary text |
| Secondary text | `#64748B` | Supporting text, subject to contrast checks |
| Page / surface | `#F8FAFC` / `#FFFFFF` | Page ground and working surfaces |
| Border | `#E2E8F0` | Separation; interactive boundaries need stronger contrast |
| Success | `#047857` | Confirmed positive status plus readable text |
| Warning / error | `#92400E` / `#B42318` | Attention and errors, never moral judgment |
| Achievement | `#7C3AED` | Achievement detail, not financial quality |

Validate every foreground/background state automatically before using it. Proposed dark UI uses navy ground, `#111E35` panels, `#F8FAFC` primary text, `#B3C0D5` supporting text and `#76B0FF` links. Solid primary actions can retain white text on the tested blue. Do not invert by multiplying colors or rely on decorative highlights for readable text.

## Typography

**Display and body font:** self-hosted Manrope with sans-serif fallback. The brand board does not identify its wordmark typeface; do not substitute a guessed font for the supplied mark. Canonical controls use the frontmatter control role. The current leaderboard display begins at the frontmatter size, steps to 2.125rem at 640px and 2.5rem at 1280px, and retains the recorded heavy weight, tight line height and tracking. Names, amounts and state labels remain the reading hierarchy; money uses tabular numerals.

### Incumbent type planning context

Proposed UI type: self-hosted Manrope, with system sans fallback; the board does not identify its typeface. Fixed rem scale: 0.75 metadata, 0.875 supporting UI, 1 body/controls, 1.125 section title, 1.5 route heading, 2 primary money figure. Body line-height 1.5; tabular numerals for money. Show pesos and full dates where context is ambiguous. Do not animate financial totals as counters.

## Layout

The desktop navigation rail begins at 1024px. Its collapse action sits beside the PixelVault title; the compact rail stacks its glyph and expand action. Expanded and collapsed widths, and page padding, are recorded in frontmatter. Main content no longer has a narrow maximum-width cap. Rail width and the corresponding content margin move together over 300ms ease-out; reduced motion removes those transitions. The collapsed preference persists under `pixelvault-sidebar-collapsed`, with session-only behavior if storage is blocked. Icon-only destinations retain accessible labels and tooltips.

On ordinary signed-in routes with a platform header, the header owns the Community/My dashboard segmented switch: a bordered muted rounded container, primary selected segment, and compact icons with text. Below 640px it occupies its own full-width header row; larger screens keep it in the header while desktop collapse remains beside the app title. Guests and unresolved sessions do not render either area-switch variant, workspace destinations or private member actions. Mobile retains the drawer and four-destination bottom navigation appropriate to the session. Route protection remains independent of navigation visibility.

Agreement-room detail is the dedicated protected-layout exception: it owns the dynamic viewport height without the platform rail, header, footer or mobile navigation. Room-local return, theme and confirmed sign-out controls retain access to shared navigation and session actions. Desktop columns scroll independently; narrow layouts reflow into one scrolling viewport. This layout retains the incumbent semantic theme and canonical controls; its column dimensions and conversation arrangement belong to [the agreement-room contract](docs/surfaces/agreement-rooms.md).

At desktop widths the podium uses three columns, with the first displayed position in the center; narrow screens stack in server order. The comparison table remains in its named horizontal-scroll region. The focused preview, separate public directory, search and showcased-badge filtering follow the current section of [the leaderboard contract](docs/surfaces/leaderboard.md); its older compositions and pagination rules are historical. Preview limits, directory page sizes and hero composition remain surface-specific requirements.

### Incumbent spacing and responsive contract

Use a 4px spacing base; 8/12/16/24/32px group spacing.

Minimum 44px design target for primary touch controls; avoid hover-dependent operation. Visible keyboard focus; associated labels and error summaries; accessible live status updates without repeatedly interrupting readers. Status always has text in addition to color. Dates include contractual timezone at confirmation.

At narrow widths, stack comparison rows into consistently labeled blocks; never hide total cost. Keep repayment actions and summaries above secondary achievements. Tables can scroll only where the dataset requires it and retain headers. Map/list toggles share filters and result semantics; list works without map/GPS. Long names, 0/large balances, 25+ installments, long contract text and suspended-account states must have explicit component checks.

## Elevation & Depth

Borders and alignment do most grouping; reserve shadows for overlays and subtle elevation. No arbitrary equal-card dashboard grid. Podium cards lift 4px on hover with the existing restrained blue shadow (200ms state timing); reduced motion suppresses the transform. Their ordinal circles use position-specific small shadows. Overlay surfaces use the canonical popover shadow. Exact shadow strings live in `.impeccable/design.json`, where the token schema permits them.

## Shapes

Controls retain gently curved corners and panels retain the larger radius recorded in frontmatter. Achievement backing and ordinal markers are circular. The header segmented-switch container is rounded (16px), with rounded segments (12px). The app icon's large radius does not determine button shape.

## Components

**The Tailwind First Rule.** Express new feature layout, typography, responsive behavior, hover, focus and motion directly with Tailwind utilities in TSX. Keep semantic tokens and canonical control foundations in their existing shared stylesheets; do not add feature stylesheets when utilities express the design. The browser root View Transition pseudo-element rules are the approved shared CSS exception for the theme reveal.

### Canonical controls and theme switch

Canonical Shadcn controls retain the existing native CSS foundation. Filled buttons use primary/primary-foreground; ghost buttons use transparent rest and accent hover; fields use card/foreground with input borders. The shared theme initializes before React renders, follows system preference until a choice is stored, and exposes an accessible light/dark toggle in the header. An explicit choice persists under `pixelvault-theme`; blocked storage leaves the session choice usable.

The theme control starts one circular reveal of the new root snapshot from the clicked button center (500ms, cubic-bezier(0.16, 1, 0.3, 1)). Reduced-motion and unsupported View Transition environments apply the new theme immediately; a failed transition still applies the choice. Concurrent clicks are guarded while the transition runs. Static captures confirm theme end states only.

### Podium and achievement details

The latest approved distinct-position treatment supersedes the earlier neutral-podium guidance. Card hover borders remain blue with restrained elevation; table rows use the semantic accent tint, and profile links retain emphasis. Selected badge artwork keeps a white circular backing in both modes. Podium and table triggers both retain 44px touch controls; podium art is 34px and table art is 28px. Individual details use 80px circles with 68px art, criteria and earned date. Badge and collection popovers open in place, with no badge redirect, viewport collision limits, Escape dismissal and focus return through the canonical popover behavior.

Two visible badges precede a count derived from the remaining selected public badges. The public showcase cap remains three, so three selected badges produce +1. Never fabricate +3 or enlarge the showcase capacity for presentation.

### Explore viewport and compact offers

Explore is a public viewport-layout exception: it retains the desktop navigation rail but removes the platform header, environment strip, footer, outer content padding, gaps and corner rounding. Desktop map and 380px posting container touch their available viewport boundaries. The mobile utility row retains the app title/drawer action; the map and compact feed use adjacent rows above the existing bottom navigation, with independent feed scrolling. Other routes retain their normal header and content spacing. Theme and confirmed sign-out move into navigation while Explore is active.

Explore keeps one local/provider search field, one destination-named map/list action and an Any distance / 5 / 10 / 50 km selector. Secondary area/amount/sort choices and discovery information use canonical popovers/dialogs. Location, zoom and fit/retry actions are map-owned overlays, not posting-container controls. One destination-named button switches the offer/recent feed. A compact test-mode notice remains visible.

Offer previews use compact divided rows with avatar/name/area, linked title, available amount, annual reducing rate and payment count. Cost examples and repeated dates/footer links are removed from map previews; complete terms and schedules remain on offer detail. The shared Like control has a compact heart/count variant in the upper-right corner, retaining saving/error/sign-in behavior. Other surfaces retain the labeled Like variant. Hover/focus still highlights grouped approximate markers without moving the camera. See [the community contract](docs/surfaces/community.md) for proximity, state and verification limits.

List mode uses its own full-width toolbar, a horizontally scrollable row of suggestion pills and larger offer cards that fill the available content width. Cards restore the principal-to-total example, labeled like action, payment plan and full-terms link. Both layouts share search, filters and feed state. Suggestions apply the existing recent/rate sort, minimum available amount and actual loaded-area filters; activating one returns to the offer feed.

### Overview dashboard

Overview opens with a single summary card containing the borrowing/lending switch and four factual metric tiles: active principal balance excluding interest, active loans, repaid loans and distinct counterparties. The greeting and promotional link are omitted. Tiles expose hover/focus feedback and link to loan records. Metrics use the same role-scoped loan list, preserve exact centavos and show pending/unavailable states instead of false totals. Two compact tile columns support phones; four columns fit desktop.

The next obligation remains the primary action. A horizontal bar chart beside it on desktop (below it on mobile) shows actual loan counts by lifecycle status, with text values and a zero baseline. Empty history explains when the chart will appear. This is a record snapshot, not a repayment trend, earned-income forecast or wallet balance. History and foundation links follow. Shared semantic colors and Tailwind utilities govern all new layout and interaction states.

### Meeting lobby and activity

Every room visit starts in a private lobby within the dedicated full-viewport layout. At desktop widths, scheduling, participant attendance and the existing shared-plan illustrated guide sit beside a 380px local device preview and entry panel. Mobile stacks these groups in one scroll area. Each person accepts the current Manila time before their own server-validated check-in. Lobby presence is distinct from room presence. Returning to the lobby removes the user’s active check-in; rescheduling requires fresh acceptance and check-in.

Pings are durable private-conversation messages, limited to one per sender per room per minute. Device access starts only after an explicit local control, is optional for entry, and stops on entering, leaving or hiding the tab. Mic input uses a real local level meter. No shared audio/video provider is configured. The illustrated three-step guide also opens in the canonical info dialog.

Profile activity is an independent, off-by-default public preference under Avatar frames & flair. Public labels are coarse; no exact timestamp is projected. Owners can see their own private label. Meeting participants retain short-lived, room-specific attendance regardless of public sharing. Foreground activity is renewed only for authenticated visible tabs.

### Offer likes

List offers and the map sidebar expose the same pill-shaped canonical Like control, selected filled-heart state and actual count. Saving disables the action; errors expose feedback and a retry when loading fails. Viewer-specific liked state and aggregate counts come from the existing desired-state PUT service and bulk discovery projection, with private no-store discovery responses. These counts express likes, not financial quality or repayment assurance.

## Do's and Don'ts

### Do:

- **Do** preserve the blue PixelVault identity and use shared semantic light/dark roles.
- **Do** use the recorded shell dimensions and main padding, exposing the header area switch and private destinations only for signed-in members; Explore and agreement-room detail follow their dedicated viewport layouts described above.
- **Do** keep lending aggregates consent-controlled, exact amounts static, XP ties visible and badge overflow factual.
- **Do** offer badge criteria and earned dates in place through canonical controls.

### Don't:

- **Don't** use podium colors or likes to imply trust, repayment ability or guaranteed funding.
- **Don't** fabricate badge counts, activity or reputation to fill a composition.
- **Don't** treat static theme captures as proof of animation behavior or historical checks as current validation.
- **Don't** inherit unrelated legacy hard-coded styling or craft-floor defects as new system rules.
