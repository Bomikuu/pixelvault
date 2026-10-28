# PixelVault design

Date: 2026-10-28. User-pinned branding guides the implemented semantic tokens and original derivative assets. These are not sampled official brand standards or designer-source exports.

## Visual authority and boundaries

The [supplied board](docs/brand/pixelvault-brand-reference.png) fixes the name, tagline, geometric P/keyhole mark, blue/navy/white identity and variant family. Preserve that world. PixelCore's root PRODUCT.md, DESIGN.md and theme remain authoritative for PixelCore and are unchanged.

The reference is a brand board, not a screen specification. Its illustrated “Available credit ₱50,000” does not establish an approved credit facility or a real product amount. Use factual offer amounts and member obligations instead. The permanent logo stays blue; green/violet/amber example marks do not require recoloring the logo for every status.

Original derivative standalone logo/glyph and achievement vectors are in packages/ui/src/assets/brand with provenance. Do not crop a panel of this board and ship it as the production logo, guess the wordmark font, or generate a replacement identity. No source vector was provided. Obtain or prepare a faithful vector asset under the authorized asset workflow, with provenance; do not claim it is an original designer export.

## Proposed semantic tokens

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

Proposed UI type: self-hosted Manrope, with system sans fallback; the board does not identify its typeface. Fixed rem scale: 0.75 metadata, 0.875 supporting UI, 1 body/controls, 1.125 section title, 1.5 route heading, 2 primary money figure. Body line-height 1.5; tabular numerals for money. Show pesos and full dates where context is ambiguous. Do not animate financial totals as counters.

Use a 4px spacing base; 8/12/16/24/32px group spacing. Proposed radii: controls 10px, panels 14px, badges round; the app icon's large radius does not determine button shape. Borders and alignment do most grouping; reserve shadows for overlays and subtle elevation. No arbitrary equal-card dashboard grid.

## Structural thesis

The signature interaction is **offer → full schedule → private application → lender selection → mutual acceptance → confirmed funding → shared loan timeline**. The timeline is the factual thread joining payments, documents and private cases. It is not an honor/shame meter.

Desktop uses one navigation hierarchy within each area, a clear Community/My dashboard switch, and Messages. Mobile primary navigation: Explore, Dashboard, Inbox, Profile. Borrowing/Lending changes dashboard context without changing account identity. Financial review, signatures and multi-section cases use full routes; dialogs serve short confirmations.

Use information-rich rows for comparing offers and managing loans. A listing shows one named lender, offered amount, total-cost example, frequency, approximate area and precise verification attributes. A dashboard leads with the next action, not a promotional hero. Loan detail leads with status and next obligation, then timeline and schedule, with documents/cases in adjacent navigation.

## Brand expression and social features

The user-supplied illustration reference expands the supporting artwork with thin charcoal outlines, isometric object planes, sparse stippling and cobalt/teal/coral/mustard fills. Original editorial scenes, six named achievement illustrations and eight fictional profile portraits share this vocabulary. Financial controls and the blue PixelVault mark retain their established design. See [illustration surface](docs/surfaces/illustrations.md) and [artwork catalog](docs/brand/artwork-catalog.svg).

Profile covers, an equipped badge shelf (up to three public selections) and one-time milestone feedback carry personality. Badge artwork must be original and readable at 24/48px. Criteria, earned date and source are available by focus or tap, not hover alone. Motion is normally 150–250ms; milestone feedback may last up to 600ms, once, with a static reduced-motion equivalent.

No confetti when taking another loan, flashing overdue numbers, repeated celebration on refresh, leaderboard of indebted members, purchasable reputation or badges implying repayment insurance. Verification labels describe a specific check, such as “Identity checked”; never an unqualified “Trusted.”

## Accessibility and responsive contract

Minimum 44px design target for primary touch controls; avoid hover-dependent operation. Visible keyboard focus; associated labels and error summaries; accessible live status updates without repeatedly interrupting readers. Status always has text in addition to color. Dates include contractual timezone at confirmation.

At narrow widths, stack comparison rows into consistently labeled blocks; never hide total cost. Keep repayment actions and summaries above secondary achievements. Tables can scroll only where the dataset requires it and retain headers. Map/list toggles share filters and result semantics; list works without map/GPS. Long names, 0/large balances, 25+ installments, long contract text and suspended-account states must have explicit component checks.

## Planning and verification limits

Surface-specific priorities live in [surfaces/community.md](docs/surfaces/community.md), [surfaces/workspace.md](docs/surfaces/workspace.md), and [surfaces/admin.md](docs/surfaces/admin.md). The implementation follows code-first design with shared Shadcn controls and automated component/contrast checks. No build, browser inspection or visual test was run. No Impeccable workflow preference was stored.

Future implementation must read Impeccable's craft-floor immediately before UI edits, use shared Shadcn controls, and run authorized automated component/contrast checks. Browser/visual inspection requires the user's explicit request under this repository's verification policy.
