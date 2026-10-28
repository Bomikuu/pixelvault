# Analytics · reference-led workspace

**Mode:** Operate. **Status:** implemented in the incumbent PixelVault identity, 2026-10-28.

The supplied screenshot governs composition: compact date/perspective/export controls, line tabs, four softly tinted summary tiles, a repayment trend beside an allocation donut, collection-frequency bars beside rate information, and detailed metric cards with a chart alternative. It does not supply financial facts. Retain the blue/navy identity, Manrope, ordinary workspace shell, 24px page title and canonical @pixelvault/ui controls. All feature styling uses Tailwind utilities; SVG charts need no new package or stylesheet.

## Composition and interaction

Overview, Collections, Interest, Fees & commission, Settlement and Loss & status are actual URL-backed category filters. Summary buttons open their metric category. Date selection, Borrowing/Lending and Cards/Chart also persist in the URL; changing reporting inputs requests a fresh role-scoped report without presenting previous-role data as current. The date group occupies the full available width on phones, while the two summary columns and stacked chart panels retain readable values. The line-tab strip scrolls independently when needed.

From and inclusive Through use calendar dates in Asia/Manila. Through is advanced one day for the existing exclusive-end API. Invalid or reversed ranges and periods over 3,660 days expose an inline correction and disable report/export requests. Missing, loading and failed reports are distinct states. Export reuses the existing scalar CSV job/download service with the selected role and range, a same-origin download check and pending/error/status feedback. Operations omits the member-only role filter from its API request.

## Financial evidence

The additive read-only `activity` projection receives the same member-owned or finance-authorized loan queryset as existing scalar metrics. It aggregates immutable ledger entries by effective timestamp: daily for periods up to 93 days, monthly for longer allowed periods. Real empty buckets are zero-filled. Monthly and quarterly display grouping uses exact BigInt sums. Monetary values remain decimal centavo strings and the existing exact formatter; only drawing coordinates and percentages use approximate numeric ratios.

The trend shows principal and interest allocations net of collection reversals. Frequency counts confirmed collection ledger events before reversals, not contractual installments. Both provide exact labeled data tables in named focusable scroll regions. SVG labels use the available plot width. Straight segments join actual buckets; no synthetic smoothed performance or miniature histories are supplied.

The donut divides net collections into principal, interest and other allocated loan charges. Origination platform fees and lender settlement remain separate. A positive, nonnegative allocation mix can show percentages; zero or signed-negative mixes retain a neutral ring and signed text rather than a misleading pie. An absent series is unavailable, not zero.

Rate information shows distinct current nominal reducing-balance rates on active confirmed loans. It does not calculate or claim a blended effective annual rate or investment yield. Selected-period interest accrued/collected and future contractual interest retain separate labels. Current status can differ from the selected historical window and is explicitly marked.

The existing 17 scalar metrics and definitions remain authoritative. Detailed chart mode separates counts from money and shows individual signed measures around a zero baseline. Flows, cutoff balances, current settlement counts and projected future interest cannot be added into a common total. No period-over-period percentages are invented. Loan-linked platform fees identify their agreement-dependent payer rather than implying borrower ownership or lender income. Reporting GET responses are private/no-store. No financial write, new permission, migration or live-provider integration is introduced.

## Verification and limits

Verification is visual/browser only under the continuing user instruction: no builds, automated tests, typecheck, UI/contrast checks or detector scripts. The bounded browser pass covered 1440px light/dark, 390px and 320px, actual synthetic borrower data, the lending empty state, category selection, Cards/Chart, expanded exact trend data and invalid URL date-range gating. A correction batch fixed mobile date-control compression, summary density, canonical button surface overrides, plot-label sizing and grouping-control width. Temporary viewport sizing and the original light theme were restored.

Current sample facts are principal borrowed ₱10,000, net repayments ₱3,000, zero interest paid, principal outstanding ₱7,000 and a current nominal rate of 12%. The actual daily trend therefore has a single repayment spike; the screenshot's decorative sample curve and growth labels are not copied. No export job, financial transaction or new fixture was created. Native date-picker editing was not fully exercised: the browser automation's fill changed the displayed native value without committing the React input; invalid-range validation was observed through the real URL filter instead. Signed-reversal fixtures, long-range grouping, operations access, concurrent reads and download completion remain unverified at runtime.

Captures live under ignored `.runtime/qa/analytics-reference/`. Sanitized Jev guidance favored grounded financial charts (413 input / 39 output tokens). The existing 205-node stale/truncated graphify map located ReportingPages and route/shared-component relations; current source and browser observations govern. No subagents were spawned.
