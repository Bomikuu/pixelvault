# Interactive Marketplace Implementation Plan

> **For agentic workers:** Execution method is already selected: native work in this chat, **without subagents**, including reviews. Follow this plan task by task. The writing-plans workflow names `superpowers:executing-plans` for native execution; that helper was not found in the available local skill/plugin roots. The proposed execution therefore follows this explicit plan directly in the current chat, without installing a workflow plugin or substituting delegation. Read the approved spec and the verification override before acting; preserve the existing dirty tree.

**Goal:** Add a usable shared city-room marketplace where members walk 2D sprites, publish short speech bubbles and inspect current lending offers in a modal.

**Architecture:** Django owns membership, movement and public projections; the existing Redis service holds expiring leases/trajectories, while PostgreSQL holds reportable bubble evidence. React renders an immersive world with a lazy Google Maps overlay or a distinctly labeled plaza fallback. Reuse existing accounts, financial endpoints, offer calculator, public identity and canonical controls.

**Tech Stack:** Existing Django 5.2/DRF, PostgreSQL, redis-py from the installed Celery Redis dependency, SSE, React/TypeScript, TanStack Query, Tailwind and Shadcn. No game engine, separate backend or WebSocket service.

**Spec:** [Approved design](../specs/2026-11-06-interactive-marketplace-design.md); [selected visual reference](../brand/interactive-marketplace-concept.png) and [provenance](../brand/interactive-marketplace-concept.md).

## Execution record · 2026-11-06

Implemented directly after plan approval, without subagents. Tasks 1–3 now have the Redis room engine, persistent bubbles/moderation, REST/SSE projections, migration and explicit schema declarations. Tasks 4–6 have the original pixel renderer, conditional map/fallback lifecycle, responsive shared-room page, movement/composer/directory, current offer dialog and staff queue. Task 7 adds navigation, configuration examples and operator/surface/release documentation. The local migration was applied; existing PostgreSQL/Redis/API/web services support the preview.

Representative backend and frontend test files were authored **without execution**. The detailed checkboxes below retain the original acceptance scope rather than claiming every proposed case was authored or passed. Further adversarial/concurrency, lifecycle, keyboard/accessibility and provider coverage remains in the [release checklist](../marketplace/release-checklist.md). No application build, automated test, UI/type/lint/detector check or Google cloud configuration ran. Schema/type/inventory exports were authoring only, without validation: 163 typed operation declarations, zero partial/generic declarations.

Bounded desktop/mobile review and one correction pass exercised the actual fallback room with an existing synthetic account, movement, bubble publication/expiry, offer inspection, same-account tab takeover, theme and sign-out. Only one browser profile was available; separate-account synchronization and actual Google delivery remain unverified. Five captured artifacts, exact observations, limitations and the original guest-session restoration are recorded in the linked checklist.

Graphify remained scoped; its seven relevant older nodes were insufficient for the new room relationships, so current source governed. The sanitized implementation Jev advisory favored authoritative server state (confidence 1.0; 386 input / 31 output tokens). No secrets or member records were submitted. Impeccable review/documentation were performed in-thread under the no-subagent instruction; no detector ran.

## Global Constraints

- “native execution without subagents”; preserve unrelated existing modified/untracked files and the existing Mapbox Explore/mobile work. Commit explicit task paths/hunks only; never stage the whole tree.
- “Carry forward the user's visual-only verification preference.” No builds, automated tests, UI/type/lint/detector checks. Test-writing steps below create **unexecuted release coverage**, not passed checks. Red/green execution is deferred under this override.
- “bounded capacity of 40 joined members”; initial cities are Quezon City, Manila, Makati and Pasig, Room 01 each.
- “1000 × 700 world”; coordinates are virtual room positions, never GPS, residences or street routing.
- “Heartbeat every 15 seconds while visible; presence expires after 60 seconds”; “bounded 45-second connection”.
- “one active plain-text bubble of up to 120 characters”; expires after 60 seconds; posting is limited to “six per minute”.
- Only joined active, unsuspended members receive participant/bubble state. Use existing public identity/achievement visibility, session/CSRF and staff-role checks.
- One controlled character per account. A replacement join cannot be moved or removed by stale tab commands.
- No invented peers/counts, automatic join, geolocation permission, XP for participation, offline writes, financial acceptance or provider/billing configuration changes.
- “Use shared Shadcn Button/Input/Select/Dialog/Tabs”; “Compose with Tailwind classes; no feature stylesheet or replacement design system.”
- Preserve the original mark, Manrope, blue/navy themes and original assets. New sprites are original authored pixel grids, not crops of the concept or borrowed game art.
- Google Maps is conditional on `VITE_GOOGLE_MAPS_API_KEY`; absent/failed provider uses **Plaza view · Map unavailable** without disabling shared room behavior.

## Review Focus

1. A timed-out join retried after another tab has taken control must return `lease_lost`, never reclaim or duplicate the new character — Task 1.
2. An emoji or combining character, a pasted line break and an HTML-shaped bubble must have consistent length/error behavior and render as text — Tasks 2 and 5.
3. Dragging the map, releasing a directional pointer outside the pad, opening a modal or backgrounding the tab must stop movement without unwanted commands — Tasks 4 and 5.
4. An attached offer can expire/change or its author can be suspended while the bubble/modal is open; current source facts must win — Tasks 2, 3 and 6.
5. A Google script can fail late or load after the page unmounts; fallback, attribution and participant state must remain correct, with no duplicate overlay/listener — Task 4.

## File and interface map

| Boundary | Files and responsibility |
| --- | --- |
| Room engine | `apps/api/plaza/rooms.py` stable metadata; `types.py` typed domain values; `store.py` Redis client/scripts; `movement.py` trajectory math; `presence.py` orchestration |
| Persistent content | `apps/api/plaza/models.py`, `bubbles.py`, `moderation.py`, `tasks.py`, `signals.py`, `apps.py`, migration `0001_initial.py` |
| API/projections | `apps/api/plaza/serializers.py`, `projections.py`, `views.py`, `stream.py`, `urls.py`, `schema.py`; registration in existing config |
| Client transport | `apps/web/src/features/interactive-marketplace/types.ts`, `api.ts`, `usePlaza.ts` |
| World | `spriteData.ts`, `Sprite.tsx`, `movement.ts`, `useMovement.ts`, `GoogleMapSurface.tsx`, `googleMaps.ts`, `PlazaSurface.tsx`, `World.tsx` |
| Page and overlays | `MarketplacePage.tsx`, `RoomChooser.tsx`, `BubbleComposer.tsx`, `PeopleDrawer.tsx`, `OfferDialog.tsx`, `MemberPopover.tsx`, `ModerationQueue.tsx` |
| Integration | Existing router, navigation/discovery entry, schema catalog/export/types, `.env.example`, API guide and surface/release evidence |

Keep files focused; no general-purpose world/game framework. Runtime coordinates and sprite-frame transforms may use refs/inline style values; canonical controls and layout remain Tailwind/Shadcn.

## Task 1: Authoritative city-room engine

**Files:** Create `apps/api/plaza/{__init__,types,rooms,movement,store,presence}.py`; create `apps/api/plaza/tests/{__init__,conftest,test_presence,test_movement}.py`; modify `apps/api/config/settings.py` and `.env.example` for namespaced Redis configuration.

**Interfaces:**

- `rooms.py`: `ROOMS` maps `quezon-city-01`, `manila-01`, `makati-01`, `pasig-01` to the matching existing coarse area and center; `room_for(slug: str) -> RoomDefinition` refuses unknown slugs.
- `types.py`: frozen value dataclasses `Point{x:float,y:float}` and `Trajectory{start:Point,target:Point,started_at_ms:int,duration_ms:int,sequence:int}`; `Membership{participant_id,member_id,room_slug,instance_id,session_binding,lease,trajectory,expires_at_ms,bubble_id}`; `JoinResult{lease,snapshot_revision,server_time_ms,replayed}`. `participant_id` is a distinct random public UUID, never the private lease; session binding is derived server-side. No Redis/session fields in public projections.
- `movement.py`: `position_at(trajectory: Trajectory, now_ms: int) -> Point`; `trajectory_to(current: Point, target: Point, now_ms: int, sequence: int) -> Trajectory`. Bounds 0…1000/0…700; fixed speed 120 world units/second; reject non-finite inputs.
- `presence.py`: `join(actor_id, session_key, instance_id, room_slug, operation_id) -> JoinResult`; `control(actor_id, session_key, instance_id, lease, sequence, action, target=None) -> Membership`; `room_state(actor_id, session_key, room_slug) -> RoomState`; `leave(actor_id, session_key, instance_id, lease) -> bool`; `revoke_actor(actor_id)` and `revoke_session(session_key)`.
- `store.py`: `RoomStore(redis_client, prefix)` with atomic join/switch/control/leave/expiry methods; Redis is authoritative across API workers. Use Redis server time inside scripts; never a request-supplied timestamp. Prefix `pixelvault:plaza:v1:`; a separate configurable URL defaults to the existing Redis service. This version targets one non-clustered Redis deployment.

- [ ] Write unexecuted integration tests asserting 40 concurrent joins succeed, the 41st fails with `room_full`, and a rejected switch leaves the previous room membership intact. Test cross-worker store instances against the same isolated Redis prefix, not in-memory dictionaries.
- [ ] Write `test_join_retry_cannot_reclaim_replacement`: same session/instance/operation returns the same live lease; another tab's deliberate join replaces it; replaying the old operation and old leave/move commands cannot affect the replacement. A changed operation payload gives `idempotency_conflict`.
- [ ] Write trajectory tests for exact endpoints, partial progress, clamping and NaN/infinity rejection; reject stale/duplicate movement sequences without changing the accepted trajectory. Test heartbeat/expiry using the store's authoritative time boundary.
- [ ] Pin the pure trajectory contract in `test_position_at_interpolates_server_time`: `assert position_at(Trajectory(Point(0, 0), Point(120, 0), 0, 1000, 1), 500) == Point(60, 0)` and `assert position_at(trajectory, 2000) == trajectory.target`.
- [ ] Implement atomic capacity cleanup, replacement, owner/lease checks, monotonic sequencing and room revision updates. Rate-limit movement bursts to four commands/second without applying the standard hourly user throttle to every movement frame. A valid stop must not be rejected behind an exhausted move quota; add `test_stop_after_move_limit` asserting the accepted trajectory is stationary. Heartbeats are separate; no per-frame network loop. A disconnected client stops locally and reports uncertainty; it cannot promise a server stop without delivery.
- [ ] Translate unavailable Redis into `plaza_unavailable` (503). Keep operator settings/key contents out of errors. Verify changes by source review only now; deferred commands: `.venv/bin/pytest apps/api/plaza/tests/test_presence.py apps/api/plaza/tests/test_movement.py -q` with PostgreSQL and a dedicated test Redis prefix.
- [ ] Commit the engine/configuration hunk only: `feat: add authoritative city-room presence`.

## Task 2: Expiring, reportable speech bubbles

**Files:** Create `apps/api/plaza/{apps,models,bubbles,moderation,tasks,signals}.py`, `apps/api/plaza/migrations/{__init__,0001_initial}.py`, `apps/api/plaza/tests/test_bubbles.py`, `test_moderation.py`, `test_retention.py`; register the app and daily cleanup task in config settings. Extend existing content-report projections/links only where necessary.

**Interfaces:**

- `Bubble(Record)`: author FK, room slug, plain `body` (120 maximum), nullable offer FK, operation UUID, canonical payload fingerprint, visible expiry, status (`visible`, `cleared`, `removed`), version. Unique `(author, operation_id)` constraint and indexed room/expiry/status.
- `bubbles.py`: `normalize_body(raw: str) -> str`; `publish_bubble(actor_id, session_key, instance_id, lease, room_slug, body, offer_id, operation_id) -> Bubble`; `clear_bubble(...) -> None`; `visible_bubbles(ids, now) -> dict[UUID,Bubble]`.
- `moderation.py`: `report_bubble(actor_id, bubble_id, reason) -> ContentReport`; `moderate_bubble(actor_id, bubble_id, expected_version, decision, reason) -> Bubble`; `moderation_queue(actor_id, cursor=None) -> BubbleQueue`. Content type is `plaza_bubble`; `decision` is `remove` or `keep`, with reason and recorded audit.
- `tasks.py`: `purge_expired_bubbles()` removes text/records older than seven days, excluding bubbles with unresolved reports. `signals.py` revokes session presence on Django logout and actor presence on inactive/suspended member saves; register receivers in `PlazaConfig.ready()` without editing unrelated account logic.

- [ ] Write unexecuted tests asserting one active bubble, 60-second visibility, six posts/minute, exact idempotent replay and conflict on changed text/offer. Define “character” as a Unicode code point on both server and JS (`Array.from(text).length`); trim outer whitespace, collapse internal newlines to spaces, reject other controls. Test emoji, combining sequences, blank text and text over 120 code points.
- [ ] Pin `test_normalize_body_is_plain_unicode_text`: `assert normalize_body('  Hello\nthere  ') == 'Hello there'`, `assert normalize_body('<b>Hello</b>') == '<b>Hello</b>'`, and `assert len(normalize_body('😀' * 120)) == 120`; 121 emoji raise `invalid_text`. HTML-shaped text remains text through the client rendering test.
- [ ] Test that an attachment must be the author's current published, available offer in the room's coarse city. Expiry, suspension, withdrawal and unavailable capacity remove the structured attachment/current offer facts from subsequent projections. Render financial facts from current offer terms, never cached bubble text.
- [ ] Test that reports require visibility to the reporter, remain reviewable after public expiry and do not themselves remove/suspend content. Moderator/admin staff pass; nonstaff, suspended staff and self-moderation fail. Stale versions conflict. Deleting text after seven days preserves unresolved evidence.
- [ ] Implement bubble persistence followed by a lease-checked Redis attachment. If ownership changes between them, the unreferenced DB record is not publicly visible; do not reactivate it on a stale retry. Public reads require both current membership attachment and visible/unexpired DB status.
- [ ] Implement moderation, audit, local-hide-compatible reporting, cleanup and revocation signals. Do not alter XP, achievements, profile location or public activity preferences. Review migration source; applying the new migration is an implementation setup step, not a test result.
- [ ] Deferred verification: `.venv/bin/pytest apps/api/plaza/tests/test_bubbles.py apps/api/plaza/tests/test_moderation.py apps/api/plaza/tests/test_retention.py -q`. Commit explicit content/migration/configuration paths: `feat: add expiring marketplace bubbles and moderation`.

## Task 3: Session-safe HTTP, streams and contracts

**Files:** Create `apps/api/plaza/{serializers,projections,views,stream,urls,schema}.py`, `tests/test_api.py`, `tests/test_stream.py`; modify `apps/api/config/{urls,settings,schema_types,schema}.py`, `docs/api/guides/marketplace.md`, reference-guide allowlist in `config/api_docs.py`, and generated inventory/schema/contracts.

**Interfaces:**

- Routes are exactly the eight operations in spec section 8. `join` consumes `{instance_id,operation_id}` and returns `{lease,snapshot}`. Commands consume a discriminated union with `instance_id` and `lease`: `heartbeat`, `move{sequence,target}`, `stop{sequence}`, `bubble{body,offer_id?,operation_id}`, `clear_bubble`, `leave`. Unknown fields/actions are refused.
- `projections.py`: `room_summary(room) -> RoomSummary`; `snapshot(actor_id, session_key, room_slug, instance_id=None) -> PlazaSnapshot`. Use existing `public_identity` and currently eligible public awards, including hidden-XP rules. Omit internal member/session/lease keys from other participants.
- `PlazaSnapshot = {room,revision,server_time_ms,self:{participant_id,owned,sequence},participants:[{participant_id,person,trajectory,bubble?}],offers:[DiscoveryOffer]}`. Bound participants to 40 and offers to the existing bounded city-filtered discovery result with its cursor. `BubbleProjection={id,text,expires_at_ms,offer_id?}`; offer fields are current server projections.
- Use a nonsecret `X-Plaza-Instance` UUID header for REST owner-state display. Native EventSource cannot set it; SSE authenticates the session/member/current room and emits only `plaza.changed{revision}` and `plaza.expired{reason}`. Leases never enter URLs or SSE payloads. REST commands still require the owner's private lease.
- SSE checks active session/member/current room every second, prunes leases, bounds connection to 45 seconds and sends `retry:3000`. Return private/no-store/no-transform and `X-Accel-Buffering:no`; REST snapshots use private/no-store. A reconnect refetches the authorized snapshot; no replay promise.

- [ ] Write unexecuted API cases for guest room summaries versus refused participant state/join/commands, inactive/suspended accounts, CSRF refusal, wrong room/session/lease, invalid city, full room and unavailable Redis. `MemberView` alone only checks authentication: explicitly recheck active/unsuspended status in the plaza service.
- [ ] Write stream tests for no leaked lease/private contact/financial record, session expiry, account suspension, room switch, replacement-tab owner state, expiry revision, bounded duration and disconnect cleanup. Inject clock/pause dependencies into the stream helper so tests need no 45-second sleep.
- [ ] Pin `test_snapshot_excludes_private_owner_fields`: `assert 'lease' not in snapshot['participants'][0]` and `assert set(snapshot['self']) == {'participant_id', 'owned', 'sequence'}`; serialize a fixture containing private sentinel values and assert those sentinels are absent from JSON/SSE output.
- [ ] Implement validated views, projections, commands and stream invalidation. Batch public identities and bubble/offer reads; never query or calculate every avatar per animation frame. Retain existing operation IDs and route protections elsewhere.
- [ ] Add concrete `PlazaRoom`, `PlazaTrajectory`, `PlazaParticipant`, `PlazaSnapshot`, join/command/error/report/moderation schemas; add `plaza` to the domain catalog and a human-readable Marketplace tag. Update the fixed API-guide allowlist deliberately, not arbitrary file inclusion.
- [ ] Author artifacts: unvalidated schema export, `npm run generate:api`, `.venv/bin/python scripts/inventory-api.py`. These are generation, not schema validation or permission tests. Export must cover the eight new operations without regressing the pre-existing inventory.
- [ ] Deferred checks: `.venv/bin/pytest apps/api/plaza/tests/test_api.py apps/api/plaza/tests/test_stream.py -q` and the existing contract checker only after authorization. Commit owned API/guide/generated changes: `feat: expose shared marketplace APIs and contracts`.

## Task 4: Sprite world and Google Maps/fallback adapter

**Files:** Create feature-local `types.ts`, `spriteData.ts`, `Sprite.tsx`, `movement.ts`, `useMovement.ts`, `googleMaps.ts`, `GoogleMapSurface.tsx`, `PlazaSurface.tsx`, `World.tsx`, plus `movement.test.ts`, `World.test.tsx`, `GoogleMapSurface.test.tsx`.

**Interfaces:**

- `types.ts` aliases the generated API types and adds `Direction='up'|'down'|'left'|'right'`, `Point`, `WorldProjection{toScreen(point):Point,toWorld(point):Point}` and `MapSurfaceProps{room,onProjection,onDestination,onMapDrag,children}`.
- `movement.ts`: `positionAt(trajectory,serverNowMs):Point` mirrors server math; `directionTo(from,to):Direction`; `isMovementTarget(target:EventTarget|null):boolean` excludes inputs/editables/dialogs/select controls. `useMovement({worldRef,owned,disabled,onMove,onStop})` owns key/pointer state and command sequencing.
- `Sprite({person,direction,walking,frame,selected})` renders original four-direction pixel grids with three walk frames, palette variations, shared public badge art and an accessible name. Use stable public identity keys for cosmetic palette selection; no new financial/reputation semantics.
- `googleMaps.ts`: `loadGoogleMaps(apiKey):Promise<GoogleMapsPort>` is a single-flight script loader with a timeout, late-unmount guard and explicit retry. Define a narrow structural port for the documented Map/OverlayView/projection/listener methods; no new runtime package is required.
- `World` places all sprites/bubbles using the current adapter projection. A map overlay converts bounded virtual world points around the public coarse city center; a neutral plaza adapter maps the same coordinates into its board. The game does not pathfind real streets. Clear overlays/roots/listeners on unmount, provider replacement or retry.

- [ ] Read Impeccable craft-floor immediately before UI authoring. Extend the current blue/navy identity and selected concept; no new concept tournament or changes to global DESIGN files.
- [ ] Write unexecuted math/input tests for server-time offset, endpoints, clamping, editing-focus exclusion, pointer cancel/release outside the pad, blur/background stop, held-key release and at most four commands/second. Reduced motion removes step/bounce animation while retaining position changes.
- [ ] Pin `test_positionAt_matches_server_contract`: `expect(positionAt({start:{x:0,y:0},target:{x:120,y:0},started_at_ms:0,duration_ms:1000,sequence:1},500)).toEqual({x:60,y:0})`. Name the cancellation case `test_pointer_cancel_stops_once` and assert `expect(onStop).toHaveBeenCalledTimes(1)` after pointer capture is canceled.
- [ ] Write provider tests with a fake structural Google port: missing key, rejected script, timeout, late resolve after unmount, repeated retry, overlay attach/draw/remove, drag-versus-click and attribution hit areas. Assert actual fallback label **Plaza view · Map unavailable** and no fake Google branding in fallback.
- [ ] Implement sprites and movement with local ref/animation-frame updates only while moving. Remote trajectories interpolate; idle/hidden worlds stop their animation work. Sprite targets are at least 44px; a D-pad stops on pointer release/cancel and keyboard focus remains visible.
- [ ] Implement a lazy Google roadmap adapter with its attribution and map controls unobscured, and an original neutral plaza fallback. Camera pan/zoom reprojects the same world without mutating any member's geographic profile. Show “Virtual room positions”. Provider failure leaves the room/controller mounted.
- [ ] Source review only now; deferred Vitest command targets these three files. Commit feature world files: `feat: add walking sprite world and map adapter`.

## Task 5: Shared-room client, chooser and bubble controls

**Files:** Create feature-local `api.ts`, `usePlaza.ts`, `MarketplacePage.tsx`, `RoomChooser.tsx`, `BubbleComposer.tsx`, `PeopleDrawer.tsx`, `MemberPopover.tsx`, `BubbleLayer.tsx`, `usePlaza.test.tsx`, `BubbleComposer.test.tsx`, `MarketplacePage.test.tsx`.

**Interfaces:**

- `api.ts`: `fetchRooms(signal?)`, `joinRoom(slug,{instance_id,operation_id})`, `fetchSnapshot(slug,instance_id,signal?)`, `sendCommand(slug,command)`, `reportBubble(id,reason)` wrap the existing `apiRequest`/`post` client; never duplicate CSRF/cookie code.
- `usePlaza()` returns `{rooms,snapshot,status,join,leave,move,stop,publishBubble,clearBubble,reportBubble,retry}`. Status is `choosing|joining|connected|reconnecting|controlled_elsewhere|expired|unavailable`. Instance UUID and lease stay in memory; query keys include account, room and instance.
- Refresh authorized snapshots after `plaza.changed`, deduplicate concurrent fetches, back off failed reconnects and heartbeat every 15 seconds only while visible/joined. Joining uses one retained operation UUID per exact attempted target; posting retains one UUID per exact body/attachment until known outcome. No automatic repost or join takeover on resume.
- Local bubble hides use current-page memory keyed by bubble ID. Report persistence and local hide are separate. Collision selection prioritizes selected/focused bubbles, then nearby bubbles; expose at most eight expanded bubbles and an accessible hidden-count action opening the complete drawer.

- [ ] Write unexecuted client lifecycle tests: reconnect fetch, lost lease, unknown join outcome/exact explicit retry, identity change/logout cache clearing, hidden-tab stop, owner control moved elsewhere, retained composer input and failed Redis state. Never silently clear uncertainty and replay a mutation.
- [ ] Write composer cases for 120 Unicode code points, normalized pasted newlines, text-shaped HTML, missing/expired own offer attachment and permission errors. Assert text content rather than an HTML sink; rate limits show actionable retry timing without losing input.
- [ ] In `test_bubble_text_is_not_html`, publish the fixture text `<b>Hello</b>` into `BubbleLayer` and assert `expect(screen.getByText('<b>Hello</b>')).toBeVisible()` and `expect(container.querySelector('b')).toBeNull()`. In `test_failed_post_retains_composer`, assert the same textbox value and operation UUID survive a 503 until an explicit retry.
- [ ] Implement the full-viewport header/world/dock and city chooser with a visible audience explanation and explicit Join. Guests can inspect room summaries and choose Sign in; they cannot create a character. A failed switch retains the current room. Counts come from snapshots, never offer/profile counts.
- [ ] Implement people/offers drawer, avatar/bubble focus/tap interactions and empty/unavailable/reconnecting states. Absent lenders remain offer entries/offer markers, never fabricated walking characters. Disable movement while modal/drawer controls are active.
- [ ] Integrate session/background/page-leave cleanup with existing transport cancellation. Use best-effort authorized leave and lease expiry; an old tab cannot clear a new owner's character. Do not persist participant snapshots, leases or bubbles offline.
- [ ] Deferred tests target the three named files; no execution under current policy. Commit client/page components: `feat: add shared city-room marketplace interface`.

## Task 6: Current offer dialogs and moderation interface

**Files:** Create feature-local `OfferDialog.tsx`, `ModerationQueue.tsx`, `OfferDialog.test.tsx`, `ModerationQueue.test.tsx`; modify existing report-queue routing links only if they enumerate the new content type.

**Interfaces:**

- `OfferDialog({offerId,open,onOpenChange})` fetches the current existing public offer endpoint on open, then mounts the existing `OfferCalculator` with `canApply=false`. Current availability and full payment schedule precede an ActionLink into the existing application route; profile/full-offer links remain ordinary navigation.
- `ModerationQueue()` reads only the authorized plaza moderation queue; opens retained evidence, submits `{expected_version,decision,reason}`, then refreshes the queue. Refusal by the server is authoritative. The route does not imply that developer-documentation access grants moderation access.

- [ ] Write unexecuted tests that modal inspection issues only GETs, no application/reservation/contract/financial POST. A changed/expired/withdrawn offer or suspended lender disables application and shows the actual state. Monetary values and rate basis match current server data, not free-text bubble claims.
- [ ] Pin `test_offer_inspection_does_not_submit_financial_actions`: after opening and changing a calculator input, `expect(financialPost).not.toHaveBeenCalled()`; this spy covers the application/agreement/payment routes, not independent room heartbeat traffic. In `test_closed_offer_disables_application`, assert the application action is unavailable after the refreshed response marks the offer closed.
- [ ] Write keyboard Dialog cases for named title/description, initial focus, Escape, focus return, schedule overflow at 320px and unavailable endpoints. Fetch/calculation is lazy per open dialog, not per participant.
- [ ] Implement compact lender/availability/cost/schedule content with canonical controls and exact money formatting. Avatar-only selection with no offer shows a public member popover and profile link; it must not open a fabricated loan.
- [ ] Implement staff queue and version-conflict refresh using existing staff patterns. Reports remove/hide text only through the authorized decision endpoint; staff actions remain audited. Source review only now; deferred tests target these two files.
- [ ] Commit dialogs/moderation UI: `feat: add marketplace offer details and moderation tools`.

## Task 7: Route integration, bounded review and handoff

**Files:** Modify owned hunks in `apps/web/src/app/router.tsx`, `Shell.tsx`, `features/discovery/DiscoveryWorkspace.tsx`, `.env.example`, `README.md`, `docs/IMPLEMENTATION.md`; create `docs/surfaces/interactive-marketplace.md`, `docs/marketplace/development.md`, `docs/marketplace/release-checklist.md`; link the admin route under existing staff navigation.

**Interfaces:** Add lazy `/marketplace` outside the normal Shell, with its own return/theme/session controls; link it from Community and Explore. Add staff `/admin/plaza` through the existing protected layout, with server role enforcement independent of navigation. Preserve existing web routes and all original operation IDs.

- [ ] Add the entry/return routes and operator setup for `VITE_GOOGLE_MAPS_API_KEY`, namespaced Redis, migration, cleanup and SSE proxy settings. Do not create cloud credentials, alter billing or use the existing Mapbox token as a Google key. Keep existing web/API processes; restart only the affected API for new app/migration source when needed.
- [ ] Regenerate final source artifacts only after schema changes settle. Record generated operation counts from the actual inventory; do not infer them from this plan. Write current surface contract and release checklist; do not modify global DESIGN/PRODUCT as a side effect.
- [ ] Perform the approved first visual round at desktop and 390px/320px: city chooser, real join/count, walking/input cancellation, bubble audience/post/expiry, offer dialog, drawer, moderation refusal, dark/light and fallback. Use two existing synthetic accounts in isolated browser sessions if available; otherwise record shared-account/multiclient limitations explicitly. No invented peers or new financial action is allowed for screenshots.
- [ ] Batch material corrections, then perform at most one confirmation round. Save and inspect actual screenshot artifacts; restore the original account/theme and default viewport. Use in-thread review and documentation; the user's no-subagent and visual-only instructions override skill delegation/detector instructions. Do not run Impeccable detectors, tests, checks or builds.
- [ ] Record exactly observed behavior and remaining gates: Redis concurrency/security, session/CSRF, moderation/retention, contract projection, input/accessibility/performance and Google provider validation if no key. Test source can exist without having been executed. A usable fallback is not proof of a working Google integration or production readiness.
- [ ] Commit owned route/documentation/correction hunks atomically: `feat: integrate interactive marketplace navigation`; `docs: record marketplace setup and verification limits`. No push is part of this request. Final handoff links the live local route, release checklist and a representative screenshot.

## Execution and release checks

Run tasks sequentially without subagents, preserving their interfaces. A task is source-complete when its code and the named unexecuted tests/docs exist; it is **not test-verified**. Do not mark deferred run steps as passed. Redis/PostgreSQL setup and migrations are required for a working preview, but are not a replacement for the release checks below.

| Gate | Current authorization / result |
| --- | --- |
| Source inspection, code and test authoring, narrow artifact generation | Allowed; no product code authored while writing this plan |
| Bounded browser review with synthetic accounts, no financial/media/location action | Approved design scope; execute only after the plan review |
| Application builds, automated tests/type/UI/lint/detector checks | Deferred by user's visual-only instruction |
| Actual Google Maps delivery | Conditional on operator-configured key; do not claim from fallback |
| Public production rollout, billing/provider changes, financial approval | Outside this plan |

Deferred automated entry points, **not run while writing this plan**: the `apps/api/plaza/tests` suite with PostgreSQL and dedicated Redis; named feature Vitest files; the existing schema contract checker; canonical UI boundary/type checks. No application build is a routine verification step.

## Planning evidence and self-review

The approved spec's sections 2–4 map to Tasks 4/5/7; section 5 to Tasks 2/5/6; sections 6–7 to Tasks 1/2/3/6; section 8 to Task 3; sections 9–10 to Task 7 and the global override. Each Review Focus item has a named task test. Interfaces use the same lease, instance, trajectory, operation UUID, bubble and snapshot names across tasks; no financial service is reimplemented.

Scoped Graphify traversal reused its actual vocabulary (`community`, `discovery`, `member`, `offer`, `offers`, `session`), found seven older nodes and no reliable new presence edges; direct source reads resolved the gap. Traversal used no LLM tokens. A sanitized Jev ordering advisory selected `presence_first`, confidence 1.0, using 470 input / 46 output tokens; no member records or secrets were submitted.

Planning changed documentation only. No dependency installation, migration, application build, automated check, test, browser pass or subagent ran. Existing uncommitted implementation work remains outside this plan's documentation commit.
