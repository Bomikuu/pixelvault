# PixelVault mobile UI and developer documentation

**Status:** Proposed design for review, 2026-10-30. No mobile application or documentation portal is implemented by this document.

**Intent:** Give members a distinct, convenient phone interface while keeping one lending system and a modest development setup. Give developers a useful, searchable API reference backed by accurate contracts.

**Confirmed:** Philippines first; individual-to-individual lending; Django/DRF + React/TypeScript; the existing PixelVault identity; native execution without subagents; API documentation is developer-only behind staff sign-in.

**Proposed direction:** One repository, a separate `apps/mobile` React application, browser/PWA delivery first and a Capacitor Android container after a native compatibility gate. iOS is a later release. These are implementation recommendations carried forward from the mobile discussion, rather than claims of completed or approved releases.

## 1. Two deliverables, one backend

| Deliverable | Responsibility | Implementation plan |
| --- | --- | --- |
| Developer reference | Protected reference UI, accurate OpenAPI, examples and lifecycle guides | [API documentation](../plans/2026-10-30-api-documentation.md) |
| Mobile member application | A separate phone interface using the same member accounts and domain APIs | [Mobile UI](../plans/2026-10-30-mobile-ui.md) |

Implement the reference and core mobile contracts first. Mobile screen development can then proceed in a browser without native tooling. Package Android only after session, uploads, private downloads and foreground communication work on a physical device. Nothing requires a second backend or repository.

The repository already has React 19, React Router, TanStack Query, Tailwind, Shadcn, shared UI/contracts packages and drf-spectacular. It does not have `apps/mobile` or Capacitor. The current `/api/schema` export uses generic JSON for many operations; replacing its viewer alone will not make a useful mobile contract.

## 2. Architecture and reuse

```text
apps/web                  existing desktop/responsive web experience
apps/mobile               proposed phone composition and native adapters
apps/api                  existing Django/DRF domain system + protected docs
packages/ui               canonical controls, tokens, brand/avatar/badge art
packages/contracts        reviewed OpenAPI types + compatible domain exports
packages/api-client       proposed shared transport/error/CSRF boundary
docs/api                  generated schema, inventory and authored guides
```

Share contracts, currency/date formatting, validated transport behavior, tokens and suitable canonical controls. Keep navigation, screen composition and device lifecycle in the owning application. Extract a shared feature only when both clients actually need its behavior; do not migrate the entire web feature tree.

The mobile app must not import the desktop `apps/web/src/styles.css`. Extend the shared Tailwind token source scanning to include mobile. Compose screens with utility classes and canonical Shadcn primitives. Keep original illustration assets and provenance; deliver selected responsive variants through an explicit shared asset manifest rather than copying the whole web public directory.

No new global state framework, UI framework or generated SDK service is required. React Query owns server cache; route/local state owns temporary UI; Django owns financial facts.

## 3. Mobile visual direction

Retain the blue keyhole/P identity, Manrope, light surfaces and navy dark mode. Retain the thin-ink community illustrations and existing avatar/badge family. Make the interface feel like a member companion: concise headings, prominent next actions, large people imagery and readable exact amounts.

Use a phone shell with a compact contextual top bar and a five-item bottom navigation. Full-screen map, conversation, document and meeting routes can take over the viewport. Preserve a clear Back/Close action. Do not carry over the desktop sidebar or the Community/My dashboard switch.

Proposed screen rules:

- Minimum 44px touch targets and 16px form inputs; financial labels remain readable at 12px or larger. Support 320px through 430px portrait, landscape and enlarged text without clipped actions.
- Respect safe areas and the on-screen keyboard. A sticky action must not cover the final form field, disclosure or bottom navigation.
- Use semantic tokens for both themes. A theme reveal may use a short circular transition where supported; reduced motion uses an immediate change.
- Prefer 120–220ms transitions for sheets, filters and state changes. Do not animate exact balances, repayment totals or signed amounts through intermediate values. XP can animate without changing its meaning.
- Keep hover and focus affordances on pointer devices, with the same actions available by touch and keyboard. Do not hide essential controls until hover.
- Illustrations explain sign-in, verification, meeting readiness and empty/error states. A useful heading, explanation and recovery action always accompany them.

## 4. Information architecture and screens

| Destination | First view | Secondary flows |
| --- | --- | --- |
| Home | Next obligation/action, factual summary tiles, borrowing/lending context inside the main card | Applications, lender decisions, calendar, saved comparisons, investments |
| Explore | Full-width compact offer cards, suggestion pills, one merged lender/place search | Map with offer sheet; saved offers; community leaderboard |
| Activity | Private updates and upcoming payment dates, unread/category filters | Loan timeline, schedule, receipt, agreement, documents |
| Inbox | Conversations with avatars, unread state and coarse optional activity | Scheduled waiting room, device preview, full-screen mutual agreement room |
| Profile | Large display photo/avatar, illustrated cover, badges and separate XP/setup progress | Avatar/photo editor, contacts, recovery email, privacy, verification, logout confirmation |

Guests can discover public offers, public profiles and the leaderboard. Private tabs lead to an explicit sign-in entry screen without private counts or cached member content. The desktop guest shell continues to hide the workspace and dashboard switch.

### Home and private activity

The Home card contains the borrowing/lending context selector. Show the next actual due item or unresolved action, followed by at most four factual tiles and a small chart when real data exists. Clearly distinguish borrowed/lent principal, collected interest, contractual future interest, fees and settlement. No invented trend, universal credit limit, withdrawable wallet or guaranteed return.

Activity combines private notifications and payment-date entry points, not a public debt feed. Existing action center, calendar and lender desk remain separate domain resources with clear destination labels. Full analytics and staff operations stay on web for the first mobile release.

### Explore and offer detail

Offer cards show the lender avatar, offer title, available capacity, disclosed rate/term, a heart with count and a save action. Keep them compact. Location search uses the existing Mapbox public-token configuration and approved approximate coordinates. Offer-name/lender matches remain useful if place search is unavailable.

Load the map only when requested. It fills the screen with its controls inside the map and an offer bottom sheet. Keep one map/list toggle and one offers/recent-posts toggle. Proximity options are 5, 10 and 50km; display the selected radius around the chosen approximate center. Denied geolocation allows a manually selected place. Card focus/selection highlights its pin; do not expose private residential coordinates.

Offer detail places the current terms and lender identity above the calculator. Use expandable cost/schedule sections with icons, a smaller page title and a safe-area Apply action. Investor pitch is secondary. Calculator changes are previews; only server-confirmed application/agreement terms govern a loan. Use the existing GET calculator rather than introducing client financial math.

Application steps are eligibility, request/purpose, optional co-borrower invitation, review and submit. An invitation is not verification, consent or joint liability. Existing acceptance and lender selection rules remain authoritative.

### Loans, meetings and documents

Use vertical loan timelines, payment cards and disclosure sheets rather than squeezing desktop tables. Private downloads require fresh authorization; do not persist identity or income files in a public cache.

Waiting rooms show the schedule in Manila time, the other participant, check-in state and Ping. Preview microphone/camera before joining, with the readiness illustration after the controls. Both devices begin off. The actual room hides global navigation and fills the viewport. Meeting steps, document checks, hash/revision conflicts and separate acceptance/funding confirmations keep existing semantics. Record mode outside the attendance window never checks someone in or enables decisions.

Foreground audio/video is a later mobile milestone after physical-device permission and cleanup checks. Background ringing, recording and native call integration are outside the first release. Hide unsupported call actions with a clear explanation rather than exposing a broken button.

### Profiles, badges and social actions

Show display photos in every people list. Allow selecting existing illustrated avatars or uploading a photo through the current authorized endpoint. Present earned badges in circles with a `+N` overflow dialog; tapping opens information rather than navigating away. Keep XP progress separate from profile completion. Describe lending achievements with lending facts; reputation is not creditworthiness or eligibility.

Keep the existing optional coarse public activity setting off by default. Contacts, income and co-borrower invitation details remain private. Reviews/reactions use the same permissions, moderation and optimistic rollback as web. Logout always requires confirmation and clears private client cache.

## 5. API reference experience

Recommend self-hosted Scalar API Reference over the existing drf-spectacular OpenAPI document. It supplies search, readable schema exploration and generated language examples without another hosted documentation service. Use a small Django-hosted entry page, pinned local assets, existing branding and Scalar's built-in light/dark controls. Avoid a bespoke documentation UI or another application server.

The primary entry is `/api/docs/`; preserve `/api/schema` as the protected JSON/YAML source. The portal starts with Getting started, then groups operations into Authentication, Verification & documents, Offers & applications, Agreements, Loans & payments, Community, Meetings, Investments, Member tools and Administration. Deep links and request/response examples must remain usable.

Access requires an active, unsuspended staff member whose `staff_role` is `developer` or `admin`. Use the existing `staff_for` policy with `roles=("developer",)`. A developer role grants documentation access only; it does not grant other staff operations. No new public registration or implicit role promotion. Guests and ordinary members receive 403 without schema/content; the HTML denial offers a plain link to existing sign-in. Apply the same policy to the reference, raw schema, formats and any download routes. Do not add a second credential form.

Keep request execution off initially (`hideTestRequestButton: true`), authentication persistence off, external proxy/telemetry/hosted tooling off, and external fonts/scripts off. Documentation browsing must make no financial mutation. Disabling the viewer's client is a UX policy; all underlying API authorizations remain necessary. A later isolated synthetic request playground is a separate feature.

Authored guides are source-controlled Markdown incorporated into the protected reference's overview/tag descriptions. Do not add public guide/static-schema routes. Cover browser session/CSRF, errors, money and Manila dates, pagination, operation IDs/revisions, uploads/downloads, meeting events and the end-to-end loan/investment lifecycles.

## 6. Contract quality before appearance

Add per-domain drf-spectacular annotations and reusable schema serializers next to the relevant views. Describe the actual wire format instead of changing runtime behavior to match a guessed schema. Keep stable operation IDs and the existing OpenAPI 3.0.3 format initially.

Every documented operation needs its real permission, parameters, body, response, status codes, nullable fields and media types. Explicitly cover:

- Integer centavos versus decimal-string aggregate amounts; PHP currency; no float-based recalculation in either client.
- Session cookie/CSRF behavior, public/member/staff distinctions and object-level ownership.
- Existing domain `code/message` errors, DRF `detail`/field errors, conflict and throttling responses; do not invent a universal envelope.
- Endpoint-specific operation IDs and expected revisions, including uncertain outcomes. No blanket promise that every POST is idempotent.
- Cursor/snapshot pagination where implemented; arrays where actually returned; empty results and revoked access.
- Multipart photo/evidence uploads, document/PDF/ICS/text/binary responses, private downloads, activity and room SSE, ephemeral call commands and signed PixelFlow callbacks.

Generate TypeScript types from the reviewed local schema. Do not remove handwritten exports until their consumers have equivalent generated aliases. Never include genuine identity files, credentials, payment evidence or private messages in examples.

## 7. Native compatibility gate

The current client uses same-origin fetch, an HttpOnly session cookie and CSRF tokens. A bundled Capacitor WebView has a different origin. Do not assume adding a container preserves authenticated requests, uploads, SSE or media permissions.

Before native authenticated release, demonstrate on Android: sign-in/rotation, process restart, expiry, sign-out/revocation, CSRF enforcement, multipart upload, authorized document download, checkout return links and foreground meeting attendance. Prefer a small native-managed session/HTTP adapter only if it preserves these guarantees. Do not weaken cookie flags, disable CSRF, use wildcard credentialed CORS or store session credentials in localStorage.

Capacitor native HTTP and browser fetch have different body/cookie behavior. Its direct native request API does not accept browser FormData as-is; use a proven patched-fetch or streaming upload adapter, avoiding large base64 bridge copies. Browser EventSource cannot be assumed to share a native cookie jar: use authenticated REST polling initially, with reconnect/backoff and foreground-only operation.

If the session probe fails, keep the browser/PWA release usable and stop the authenticated native milestone. A standards-based OAuth/PKCE alternative needs a separate authentication design; do not invent a token mechanism inside the UI task. iOS needs its own compatibility review.

## 8. Resources, offline and release boundaries

Use the existing API/database/workers. Run either mobile or web Vite when that is sufficient; add `dev:mobile` on proposed port 5179 without altering web's 5178. Native tools run only for explicitly requested packaging/device work. Use live reload on a physical Android device for development, then bundled assets for a release; never ship a LAN development-server URL.

Lazy-load maps, large illustrations, documents and call UI; bound/paginate people feeds; stop queries, sensors and capture when backgrounded or leaving a room. Measure cold start, scrolling, map memory and device recovery before claiming acceptable performance. There is no unsupported startup-time or RAM promise.

PWA offline support is limited to the shell and public static assets. Private APIs, identity/income files, messages, agreements, payment records and authenticated HTML are never service-worker cached. Display stale/offline status and disable mutations while disconnected. Do not queue or automatically replay financial commands. An uncertain server result requires reconciliation with the operation ID before another attempt.

Push notifications, biometrics, background calls, device contacts, offline financial editing, store publication and a second iOS implementation are deferred. Permission prompts appear only after a member chooses the corresponding action. Never request the address book to support co-borrower invitations.

## 9. Completion and verification policy

This planning task changes documentation only. No builds, application tests, check scripts or browser/device inspection are part of it. Preserve the current visual-only preference during subsequent work unless the user changes it. The plans list meaningful automated release checks as **deferred requirements**, not permission to run them or evidence that they pass.

An implemented screen may be visually reviewed when authorized. Authentication, privacy, financial correctness, native compatibility and release readiness require their own permitted checks; visual approval alone cannot establish them. Keep those gates unchecked until verified. Execute tasks natively, keep commits atomic and leave existing unrelated work intact.

## 10. Sources and rationale

- [Scalar's Django integration](https://scalar.com/docs-for/django): the reference can render drf-spectacular through an ordinary protected Django view; its renderer is free to self-host. This design uses local pinned assets rather than the example CDN script.
- [Scalar configuration](https://scalar.com/products/api-references/configuration): built-in reference configuration includes request-client visibility, generated examples, theme and proxy settings. Verify the chosen pinned version's options at implementation.
- [drf-spectacular customization](https://drf-spectacular.readthedocs.io/en/latest/customization.html): explicit serializers and `extend_schema` cover APIViews, parameters, status codes and binary media types.
- [Capacitor HTTP](https://capacitorjs.com/docs/apis/http): native body handling and bridge limits require an upload/transport probe. [Live reload](https://capacitorjs.com/docs/guides/live-reload) supports the proposed development loop; production still needs native packaging.

Source inspection traced the existing session client, schema generator, domain URL modules, shared styles and contract generation. A scoped graphify query supported those relationships; direct source inspection resolved stale graph entries. A sanitized Jev comparison preferred Scalar (0.55 confidence; advisory only, 457 input/39 output tokens). No secrets or member records were supplied.
