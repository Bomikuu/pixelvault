# Interactive marketplace: city rooms and walking sprites

**Status:** Approved by the user, 2026-11-06, through the shared-room specification review. Implementation planning is in [the companion plan](../plans/2026-11-06-interactive-marketplace.md). Approval does not claim that the page or service exists yet.

**Purpose:** Let PixelVault members enter a location-based community room, move a small 2D character, publish a short speech bubble and discover current lending offers through an in-place detail dialog. Keep the existing lending workflow responsible for applications, agreement review and financial actions.

**Confirmed constraints:** Philippines first; individual-to-individual lending; existing React/TypeScript and Django/DRF system; PixelVault identity and canonical controls; Tailwind utility classes; native execution without subagents; preserve existing Explore and mobile work. The selected image is a concept, not an accurate map or a runtime screenshot.

## 1. Recommended scope and alternatives

Implement a separate responsive web route, `/marketplace`, with actual shared city-room state. Reuse Django sessions, public offer projections, Redis already installed through Celery, the existing HTTP client and the server-sent-event pattern. Do not introduce a separate account system or a game engine.

Alternatives considered:

| Approach | Benefit | Limitation |
| --- | --- | --- |
| Existing backend + shared Redis rooms + SSE | Real membership, positions and bubbles across browsers; existing access control and operations | Requires new room commands, presence expiry and moderation integration |
| Browser-only prototype | Fastest way to try movement | Does not satisfy shared servers or real participant counts; would need an explicit demo label |
| Dedicated game server/engine | Supports more complex world simulation | Duplicates infrastructure and adds unnecessary dependencies for this page |

The first approach is recommended. A sanitized Jev advisory also selected it, confidence 1.0; this is guidance, not runtime evidence (472 input / 43 output tokens). Graphify's 205-node graph exposed existing discovery/session navigation but predates current room work; direct source reads govern this design.

## 2. First viewport and visual system

Mode: **Experience**, with **Operate** behavior inside room selection and offer dialogs. Preserve Manrope, the existing P/keyhole mark, blue/navy semantic colors, accessible controls and light/dark themes. The game characters are an explicitly requested extension; they do not replace profile pictures or the existing illustration family.

The page owns the viewport. Do not show the platform sidebar, dashboard switch, footer or a marketing hero over the world. A slim room header contains the mark, city/server selector, actual connected-member count, theme control and return to Explore. The map/plaza fills the space below it. The initial room chooser explains that joining makes the member's public identity and room character visible to other joined participants.

A compact bottom dock contains the bubble composer, an optional selector for the member's own eligible offer and a Post bubble action. A small people/offers control opens a searchable drawer; it is also the accessible alternative to spatial exploration. Map controls remain inside the map and do not obscure attribution. Mobile uses a compact top bar, tap movement and a directional pad; the composer respects safe areas and the on-screen keyboard.

The world should look inhabited only when real members have joined. Never seed synthetic online people, walking NPC lenders or fabricated presence counts. Existing offers remain discoverable in the drawer even when their lender is absent; unattended offer markers have a distinct offer icon and are not rendered as online characters.

## 3. Locations, servers and maps

Initial servers follow existing supported coarse areas: Quezon City, Manila, Makati and Pasig. Each has a stable Room 01 identifier and a bounded capacity of 40 joined members. Room creation/sharding, private rooms and other cities are later extensions. A full room shows its capacity and alternative cities; it does not silently overfill.

The member chooses a city. Their saved coarse area may preselect the chooser but must not auto-join or request device location. Joining another city is permitted and is never treated as proof of residence. Room membership does not change profile activity-sharing settings.

Use Google Maps JavaScript API for this route, leaving existing Mapbox Explore unchanged. Add a documented `VITE_GOOGLE_MAPS_API_KEY` setting and load the map only when visiting the page. Keep map-provider attribution and controls. Use a custom overlay lifecycle to align the sprite layer during pan/zoom, and remove overlays/listeners on leave.

No Google Maps key is currently configured in the local environment; only the existing Mapbox setting is present. With no key, a provider error or unavailable network, show an original neutral plaza grid labeled **Plaza view · Map unavailable**, with working character movement, participants and offers. Do not display copied map tiles, a fake Google logo, a screenshot background or invented street geography as a working map. Provider failure must not disconnect the room.

Room positions are bounded virtual coordinates in a 1000 × 700 world, anchored to a public city center when the map is available. They are not a device location, home address or street navigation. Keep a concise “Virtual room positions” explanation visible. Do not write virtual coordinates into member profiles, discovery centroids or physical proximity filters.

The browser key must be configured for the selected Maps API and allowed website origins. No billing changes, new cloud project, API activation or secret credential creation is part of implementing this page. Google also documents a prototype-only demo-key option; obtaining/configuring either kind of key remains an operator action.

## 4. Walking characters

Create original compact 2D pixel-style sprites with four directions and a short walking cycle. Prefer an authored vector/pixel-grid renderer with palette variants over a heavy engine or an image crop of the concept. Crisp pixels must remain readable at 40–56px, with a larger invisible hit target, a short name label, optional currently public achievement and a small grounding shadow.

Controls:

- Focus the world to enable WASD or arrow keys. Never intercept movement keys while typing, using a select, operating a dialog or interacting with map controls.
- Clicking/tapping empty space sets a destination within the room bounds. Dragging/panning the map does not move the character.
- Mobile provides directional controls and tap destinations. Stop movement on pointer release/cancel, focus loss, backgrounding, room switch or disconnect.
- The server accepts destinations or stop commands, not arbitrary authoritative positions. It calculates a trajectory from the current server position using a fixed speed and server time. Sequence numbers reject stale commands. Movement remains cosmetic and does not route around real roads or buildings.
- Clients interpolate from server trajectories for smooth animation. Send commands on direction/destination changes, at most four per second, rather than one request per animation frame. Heartbeats maintain presence independently of walking.
- Reduced motion removes bounce, trails and step cycling, while still allowing the member to move and follow their current position. Stop animation work when hidden or stationary.

Display a small selected ring around the local character. Clicking another character opens a concise member/offer popover; only a bubble or attached offer opens the full offer dialog. Keyboard users can reach the same person and offer through the drawer without navigating a canvas.

## 5. Speech bubbles and offers

Members may publish one active plain-text bubble of up to 120 characters. A new bubble replaces their previous one; it expires after 60 seconds and can be cleared immediately. Posting is limited to six per minute, with a visible countdown only when necessary. Input remains on validation/network failure; there is no offline queue or automatic repost after reconnect.

The composer labels the audience as everyone joined to the city room. No private contacts, income documents, borrower history, repayment status or private messages enter the projection. Render bubble text as text, never HTML.

An optional offer attachment must belong to the posting member, be currently published and available, and match the selected city. Structured offer text is generated from current server facts: available amount, rate **with its annual/monthly basis**, frequency and term. Do not infer a 1% monthly offer from a 12% annual field or treat free text as contractual terms. A member without an offer can still post conversational text and browse.

Clicking an attached bubble/offer marker opens a canonical accessible Dialog with the current lender identity, exact availability, interest basis, repayment summary and current schedule. Reuse the server calculator and public offer endpoint. Provide links to the complete offer, lender profile and the existing application flow. Modal inspection never reserves funds, submits an application, accepts a contract or creates a private conversation automatically.

Fetch the offer again on open and before navigating into an action when needed. Closed, withdrawn, expired and no-longer-available offers show their real state and disable the relevant action. Public offer change events invalidate the view. Avoid eager calculator queries for every avatar.

Bubbles avoid collisions where practical: constrain width, stack a few selected/high-priority messages and collapse distant messages into an accessible count. Hover/focus/tap reveals full text. Do not cover the local composer, map attribution or room controls.

## 6. Real shared room state

Keep the state authoritative in the existing API, with a distinct Redis namespace for marketplace presence. Do not mix presence keys with Celery queue keys. Redis unavailability returns an explicit unavailable state; never fall back to in-process dictionaries and claim a shared room.

Proposed service rules:

- Explicit join checks the current unsuspended, active member and room capacity. Only joined members receive participant/bubble state; room labels and aggregate counts can be public.
- A join issues an opaque lease bound to the current authenticated session, member, room and browser instance. Keep it in memory; never put it in the URL or localStorage. Only the owner's commands carry it, and snapshots do not expose other leases.
- Keep one active controlled character per account. A deliberate join from another tab takes control. Stale commands/leave requests cannot move or remove the replacement lease; the old tab shows that its character is controlled elsewhere.
- Heartbeat every 15 seconds while visible; presence expires after 60 seconds without a valid heartbeat. Leaving is best effort with lease checks; expiry handles crashes. Backgrounding stops streams and movement, then reconciles membership before resuming.
- An atomic Redis operation handles join capacity, lease checks, sequence numbers, movement limits and presence refresh. Room switches atomically replace the previous membership, so a failed target join does not strand the member.
- Stream versioned room snapshots or change notifications with a bounded 45-second connection, reconnect hints and periodic authentication/lease checks. Fetch an authorized fresh snapshot after reconnect; do not promise full event replay. Reuse existing SSE infrastructure rather than introduce WebSockets for this version.
- Bound payloads to 40 participants and one active bubble each. Room snapshots carry server time, revision, participants, trajectories and the current member's ownership state. Public identity uses the existing projection and its achievement visibility rules.
- Suspension, session expiry and logout invalidate further access and remove/expire presence. Browser account changes clear cached room state before another identity renders.

Online counts include only unexpired joined leases. A published offer or existing profile does not contribute to presence. No user earns reputation, XP or financial status merely by walking, posting or staying connected.

## 7. Moderation and retained evidence

Free-text bubbles need a real report/remove workflow, not only escaped HTML. Add a small persistent bubble record with author, room, text, optional offer, operation UUID, visible expiry, moderation status and version. Redis presence references the bubble ID; read projections recheck visibility/status so removal cannot remain visible until natural expiry.

Extend the existing content-report and moderation patterns with the new bubble content type. Members can report a bubble through its dialog and hide it locally immediately; reporting alone does not establish guilt or automatically suspend the author. Staff with the appropriate moderation role can review and remove a version, with the existing audit pattern. Staff cannot use general developer-reference access as moderation authority.

For the test-mode first version, retain expired bubble text for seven days for abuse review, then remove content unless an unresolved report requires retention. Retention and moderation staffing require an explicit production policy before public release; do not silently retain a permanent room-chat transcript. This is a proposed bounded test policy, not a legal retention claim.

## 8. API boundary

Names are proposed and should be finalized consistently in implementation:

| Method and route | Responsibility |
| --- | --- |
| `GET /api/v1/plaza/rooms` | Stable room metadata, supported coarse areas, capacity and unexpired aggregate counts |
| `POST /api/v1/plaza/rooms/{slug}/join` | Explicit join/switch and new owner lease |
| `GET /api/v1/plaza/rooms/{slug}` | Joined member's bounded authoritative snapshot |
| `POST /api/v1/plaza/rooms/{slug}/commands` | Discriminated heartbeat, move, stop, post/clear bubble and leave commands |
| `GET /api/v1/plaza/rooms/{slug}/stream` | Authenticated, bounded room changes; no lease in URL |
| `POST /api/v1/plaza/bubbles/{id}/reports` | Report existing room-visible bubble with retained evidence |
| `GET /api/v1/admin/plaza/bubbles` | Authorized staff report/moderation queue |
| `POST /api/v1/admin/plaza/bubbles/{id}/decision` | Version-checked moderation and audit |

All writes use the existing session/CSRF boundary. Joining and bubble publishing use operation UUIDs to avoid duplicate creation or taking over a room repeatedly after an uncertain result. Reusing an operation UUID with a different payload returns a conflict. A repeated join may return its original lease only to the same authenticated session/browser instance while that lease still controls the membership; it must not reclaim a character taken over elsewhere. Movement uses a lease-local monotonic sequence and can safely reconcile to the snapshot. An uncertain result triggers reconciliation; any explicit retry preserves the exact payload and operation UUID.

Add explicit request/response/command/SSE declarations to the domain schema catalog and regenerate compatible contracts, inventory and staff documentation. Use domain errors for invalid room, capacity reached, lost lease, stale sequence, invalid offer, expired session, throttling and backend unavailable. No API key or session credential enters Jev, logs, bubble text or the generated examples.

## 9. Integration and implementation boundary

| Area | Planned change |
| --- | --- |
| `apps/api/plaza` | Presence service, validated commands, bubble model, views, URLs, moderation and schema declarations |
| `apps/api/config` | App/URL/catalog registration and scoped throttles/settings |
| `apps/web/src/features/interactive-marketplace` | Full viewport page, map adapter/fallback, sprite renderer, motion controller, room selector, drawer, bubble composer and offer Dialog |
| `apps/web/src/app/router.tsx` | Lazy `/marketplace` route outside the normal desktop shell |
| Existing navigation/discovery | A clear Interactive marketplace entry and a return path |
| `packages/contracts` | Generated room/command contracts with existing operation IDs preserved |
| `.env.example` and docs | Google Maps setup, Redis namespace/configuration, presence semantics, moderation and verification evidence |

Use shared Shadcn Button/Input/Select/Dialog/Tabs and existing money/date formatting. Compose with Tailwind classes; no feature stylesheet or replacement design system. A small sprite motion helper may set runtime coordinates/transforms and animation frames; do not re-render the whole room on every frame. Lazy-load Google Maps and the route. Preserve the existing Mapbox discovery page, PWA source, private meetings, financial endpoints and unrelated uncommitted work.

The first deliverable is the responsive web page. A second mobile-app composition, native-device integration, arbitrary server creation, voice/video, physical walking/GPS tracking, inventories, virtual currency and a new financial agreement flow are outside this version.

## 10. Verification and completion evidence

Carry forward the user's visual-only verification preference. Do not run builds, automated tests, UI/type/lint/detector checks without changed authorization. Meaningful automated release checks must be authored/planned without being reported as passed:

- Redis-backed concurrent joins/capacity, expiry, replacement leases, stale sequence/stop, room switching and unavailable backend.
- Session/CSRF, guest/refused/suspended access, logout, account switching and bounded stream revocation.
- Bubble text limits, idempotency, expiry, offer ownership/city/status validation, report access, staff role/version checks and retention.
- Existing financial workflow regressions and schema/projection/operation-ID compatibility.
- Keyboard/composer focus, pointer cancellation, animation cleanup, reduced motion, hidden-tab recovery and narrow-screen Dialog behavior.

When implementing, use one bounded desktop/mobile browser round and one correction/confirmation round. Verify actual shared movement and bubbles using two existing synthetic accounts, without sending a loan application, accepting terms, paying funds or granting location/media permissions. Clearly label any synthetic test record. Capture the full page, room chooser, offer dialog, unavailable-map fallback and connection state. Live Google Maps inspection requires the operator-provided key; successful fallback is not evidence of provider integration.

No application code, dependencies, migration or runtime state was changed to write this specification. No test/build/browser pass is claimed. Implementation planning follows written-spec approval under the brainstorming workflow.

## 11. References

- [Selected sprite/map concept](../brand/interactive-marketplace-concept.png): visual reference only; geographic labels and sample offers are illustrative.
- [Google Maps custom overlays](https://developers.google.com/maps/documentation/javascript/customoverlays): map-tied DOM overlays and lifecycle/projection methods.
- [Google Maps API setup](https://developers.google.com/maps/documentation/javascript/get-api-key): browser/API restrictions and standard/demo-key setup. Read 2026-11-06; setup does not authorize billing or account changes.
- Existing source: `community/activity.py`, `community/locations.py`, `community/profiles.py`, `community/messaging.py`, `negotiations/views.py`, `features/discovery/CommunityMap.tsx`, `features/offers/OfferDetailContent.tsx` and canonical UI primitives.
