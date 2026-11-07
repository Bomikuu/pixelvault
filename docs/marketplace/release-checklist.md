# Marketplace implementation and release evidence

Date: 2026-11-06. Approved [specification](../specs/2026-11-06-interactive-marketplace-design.md) and [implementation plan](../plans/2026-11-06-interactive-marketplace.md). Implementation and review were performed directly in the chat without subagents.

## Implemented source

- Redis-backed atomic room join/switch, capacity, private owner leases, replacement-tab protection, bounded trajectories, move sequencing, heartbeat and expiry.
- Persistent expiring bubbles, normalized text, exact-retry operation IDs, current own-offer/city checks, report/moderator/audit/retention paths and logout/unavailable-member hooks.
- Eight new HTTP/SSE operations with explicit declarations. The source inventory now contains **163 typed declarations, 0 partial, 0 generic**. “Typed” describes source metadata, not a tested projection/security claim. Schema/type export and inventory ran as authoring without schema validation.
- Full-viewport responsive route, original directional pixel sprites, tap/keyboard/pad movement, public audience composer, people/offers drawer, actual offline-lender offer boards, current-cost offer Dialog, location chooser, theme/session controls and staff queue.
- Conditional Google Maps loader/overlay lifecycle and labeled original plaza fallback. No Google browser key was configured; no provider configuration, billing or real map delivery was performed.

## Observed browser behavior

- Initial guest route/chooser, existing synthetic borrower sign-in, actual Manila join and count of one. No fabricated members or new account fixtures were created.
- Actual click/keyboard movement changed the rendered character position. A short synthetic “Hello from the test community!” bubble posted and appeared above the character; it disappeared after expiry during the pass. No financial statement or personal contact information was published.
- Current Bea offer board opened a modal with server-calculated 8,000-peso principal, 120.98-peso total interest and 8,120.98-peso total repayment for the displayed original terms. These figures describe the existing test offer, not an advertised current rate or return.
- Two tabs using the same synthetic account demonstrated shared ownership: a second explicit join retained one member, and the first tab showed **Character controlled elsewhere** with movement/posting disabled. Only one browser profile was available; this does not establish separate-account synchronization, isolation or concurrency correctness.
- Light/dark views, desktop 1440px and mobile 390px/320px, people/offers drawer and room controls. Source fixes addressed initial guest null-record access, sign-in return state, intrinsic dialog width, narrow-world projection, obsolete controller responses and accurate “Not joined” labeling.
- The corrected 320px offer dialog reported client width **279px** and scroll width **279px**. Main page at 320px reported document width **320px**. These are bounded observations, not exhaustive overflow/accessibility checks. The sign-in return-state correction was source-reviewed; the complete post-fix sign-in cycle was not repeated.
- Sign-out confirmation appeared and actual sign-out succeeded. Ended in the original guest session, light theme and default viewport at `/marketplace`. The temporary second tab was closed.
- No application, contract acceptance, payout, transfer, investment confirmation, new identity upload, media/location permission, password change or production publishing occurred.

The local ignored capture directory is `.runtime/qa/plaza-2026-11-06/`:

| File | Observed surface |
| --- | --- |
| `marketplace-desktop.jpg` | 1440px test room, actual character/bubble and offer board |
| `marketplace-mobile.jpg` | 390px test room and touch controls |
| `offer-dialog-320.jpg` | Corrected narrow offer dialog |
| `offer-dialog-desktop.jpg` | Current calculator/offer detail modal |
| `guest-room-chooser.jpg` | Final guest gate and actual zero joined counts after logout |

The captured images were opened to confirm their content. In-thread review/documentation substituted for delegated Impeccable handoffs under the user's explicit no-subagent instruction. No detector ran. This review supports the shown browser/fallback scope; it does not certify Google delivery or a production release.

## Pending release gates

- [ ] Execute real Redis/PostgreSQL concurrency, capacity, switch/replay/revocation and clock/expiry coverage, including distinct accounts and independent API workers.
- [ ] Execute session/CSRF, expired/inactive/suspended accounts, late responses, account switching, stream authorization and private projection checks.
- [ ] Execute bubble limits/replay, attachment changes, moderator roles/self-review/stale version and retention/evidence coverage. Verify scheduled beat/worker operation.
- [ ] Execute frontend input cancellation, reduced motion, device/pointer behavior, explicit retry/reconnect, modal focus/keyboard and accessible list behavior. Additional adverse-network and long-content cases remain pending.
- [ ] Validate schema/contracts/operation-ID compatibility, TypeScript and canonical UI boundary, and relevant existing web/financial regressions.
- [ ] Configure a restricted Google browser key and inspect actual map, attribution, projection during pan/zoom, recentering and provider errors. Fallback captures do not pass this gate.
- [ ] Review worker/SSE capacity, proxy behavior, throttling, dependency/security advisories and production moderation/retention policy before public release.

No application builds, automated tests, type/UI checks, lints or detector scripts ran. Unexecuted test files are release coverage to run later, not evidence of a pass. The user-selected visual-only policy remains in force. Existing unrelated uncommitted work was preserved.

## Commit boundary

The new room backend, marketplace interface and owned navigation/configuration hunks are saved in focused local commits. The pre-existing private API-reference catalog and generated schema/types also contain this feature's registrations and contracts; those mixed artifacts remain in the working tree with the earlier mobile/API work. The preview therefore depends on that pending stack and cannot be reproduced from the marketplace commits alone. No push or clean-tree claim is made. Documentation records this boundary rather than committing unrelated work wholesale.

## Subsequent compact-panel UI revision

The same-day reference revision adds collapsible desktop chat/activity and people/offers panels, responsive dialog access and modal-only bubble composition. Room chat remains the current 60-second bubble projection. See [the surface revision](../surfaces/interactive-marketplace.md#compact-panels-revision--2026-11-06) for exact visual observations, saved previews, theme/guest restoration and the unexecuted-check boundary. This UI revision does not clear any pending backend, provider, concurrency or accessibility release gate above.
