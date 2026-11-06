# Shared city marketplace

`GET /plaza/rooms` exposes stable city-room metadata and unexpired aggregate counts. Explicit `POST /plaza/rooms/{slug}/join` needs an active unsuspended member, CSRF, an instance UUID and operation UUID. It returns the owner's private lease and a current bounded snapshot. Leases remain in memory; never send them in URLs, logs or public projections.

There is one controlled character per account and forty places per room. A deliberate join from another tab replaces control. Repeating an exact join operation only returns its still-current lease; it cannot take control back from a replacement. Reusing an operation UUID with different parameters conflicts. Join failure due to capacity leaves the previous room intact.

Commands require the authenticated owner session, instance and lease. Move/stop commands carry a monotonic sequence; the server computes positions/trajectories with a fixed speed and Redis server time. Heartbeat every fifteen foreground seconds; leases expire after sixty seconds. Coordinates are virtual game positions, not device location or proof of residence. Stale lease/sequence responses must be reconciled rather than automatically replayed.

The `X-Plaza-Instance` header is a nonsecret UUID allowing a REST snapshot to indicate control ownership. It grants no access by itself. `GET /plaza/rooms/{slug}/stream` uses the browser session and current room, not a query token. A forty-five-second stream emits `plaza.changed` with a revision and `plaza.expired` when membership becomes unavailable; fetch a fresh authorized snapshot after changes/reconnect. Heartbeat comments and retry hints do not promise full replay.

Bubble text is plain Unicode, at most120 code points after trimming and newline normalization. One visible bubble/person, sixty seconds, six posts/minute. Posting uses an operation UUID with exact payload on an explicit retry; there is no offline queue or automatic repost. An optional attached offer must belong to the actor and be currently published/available in the same city. Its current server terms/calculator, not bubble free text, determine cost and interest basis. Reading a bubble/modal does not reserve funds or create a loan.

Only current joined members receive participant/bubble snapshots. These expose the established public identity/achievement projection, not contacts, income evidence, private history or other leases. Guest counts are not permission to access those snapshots. Presence, public profile activity preference and financial eligibility remain distinct facts.

Room-visible bubbles can be reported. Expired evidence remains available to authorized moderator/admin staff, not the public feed; decisions require a current version and reason and are audited. Self-moderation is refused. The test retention task deletes expired content after seven days unless an unresolved report needs it; production policy/staffing remains a release gate. Reference access does not grant moderation permission.

All API paths above are under `/api/v1`. Room/storage/provider availability and loan/financial settlement are independent. See `docs/marketplace/development.md` and the release checklist for current source/visual evidence and pending checks.
