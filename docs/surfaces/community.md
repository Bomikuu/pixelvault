# Community surface brief

**Mode:** Operate. **Status:** implemented test-mode surface inside the user-pinned PixelVault identity; Mapbox token still required.

**Job:** a Philippine member compares understandable lending offers, inspects a limited public profile, and privately applies without broadcasting financial need.

**First viewport:** compact PixelVault masthead, location/search controls, list/map switch and the first real result rows. Lead each result with lender identity, offered amount, total borrowing-cost example, frequency and approximate area. No preapproved-credit hero, fake activity or public borrower bidding wall.

**Sequence:** Explore → offer → term/schedule preview → private application → status. Profile and badge details are secondary evidence. A lender's Post an offer action has its own eligibility-aware route. Saved offers preserve the current immutable terms version; changes require a fresh comparison.

**Routes:** `/explore`, `/offers/:id`, `/offers/new`, `/members/:handle`, `/members/:handle/badges/:awardId`, `/applications/new?offer=:id`. The exact application is private even when the offer is public.

**Layout:** desktop opens a full Mapbox workspace beside a scrollable posting sidebar; mobile stacks the map above a collapsible posting panel. City/area search, lender search, shared filters and a list toggle remain accessible above the workspace. Grouped avatar markers use approximate public area centroids without jitter or invented home locations. The list retains complete cost examples and pagination even when filtered loaded pages contain no matches.

**States:** no offers nearby, no matching loaded posts with more pages available, missing map configuration, geocoder/offline/WebGL/authorization failure, offer changed/closed, insufficient available amount, identity review required, applicant restricted, application already submitted, unavailable lender, long display name and stale saved offer. Preserve filters in URLs; precise coordinates never enter shareable URLs or public analytics.

**Success:** a member understands the counterparty, full cost and dates before applying. A specific verification check never suggests guaranteed repayment or government endorsement.

**Recent activity:** public posts have real server timestamps. SSE revision events and reconnects offer a staged refresh; they do not fabricate new-post counts or reorder a reader’s current view. An explicit 60-second polling fallback is labeled when streaming cannot recover.

**Community expression:** optional learning/contribution XP, an opt-in leaderboard, avatar frames and eligible badge flair support participation without borrowing incentives. A separate member sharing choice can publish aggregate lifetime lending, funded-loan count and distinct people helped; this never changes XP rank. Borrowing totals, individual debts and private recovery recognition stay private. The [leaderboard surface](leaderboard.md) records neutral podium cards, circular badge overflow, Tailwind styling and the shared light/dark toggle.

**Profile and offer expansion:** the [profile/social direction](profile-social-expansion.md) records the illustrated cover, larger photo/character, active profile tabs, private setup versus public XP progress, factual recommendation counts, earned-badge popup, interactive calculator and private consent invitation flow. Private contacts and co-borrowers are reachable from own-profile navigation. Likes/reactions never alter financial terms or XP; alternate calculator terms are comparison-only.
