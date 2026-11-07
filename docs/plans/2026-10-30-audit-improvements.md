# Audit improvements · implementation plan

Approved scope: the ten findings and five recommended features in the 2026-10-30 audit, plus completing the meeting-call and test-investment surfaces within the existing test-mode boundary. Execute natively, without subagents. Preserve the PixelVault identity and canonical Shadcn/Tailwind system. The user's continuing verification preference is browser/visual only; no builds, automated tests, typecheck, detector or check scripts.

## Outcomes and boundaries

- Restore private Messages; refresh incoming messages without stealing scroll/focus; track per-thread reading privately.
- Fix dark profile colors, role-filter dashboard applications, consistent available-amount offer examples, associated field errors, readable financial explanations, map fallback and mobile meeting action order.
- Keep original PNG provenance; generate responsive WebP delivery assets without modifying source art. Lazy-load route modules behind a useful loading boundary.
- Add a private action center derived from current loan/application/evidence/meeting/message records. Read/unread state is member-owned and cannot expose another member's documents or financial records.
- Persist saved offers privately; compare up to three current visible offers using a common amount and the existing exact server preview. Closed/expired/changed offers remain explicit and cannot be applied for silently.
- Show a Manila repayment calendar from current loan projections, with linked loan records, filters and downloadable private ICS. Dates/amounts are contractual obligations, not collected/settled events.
- Add a lender decision route with open applications, expiring reservations and upcoming/past meetings. No automatic eligibility decision or loan acceptance.
- Add email ownership verification and password recovery. Generic recovery responses prevent account enumeration; tokens expire, are single-use, are never returned to anonymous callers, and invalidate after password/contact changes. Default local file email is explicitly test-only; SMTP is configured separately. Changing credentials remains a user action.
- Add mutually accepted room calls using native WebRTC and participant-only ephemeral signaling. No recording or automatic media permissions. TURN credentials, when configured, are short-lived; missing relay configuration is visible and text remains available.
- Add immutable, exact-hash test investment agreements, separate lender-paid test fees, explicit simulated funding and investor portfolio/payout projections. Live investment funding remains disabled; uploaded evidence never credits capital. Principal, allocated collected interest, capital risk, fees and payout status remain distinct. No external transfer or legally approved investment template is claimed.

## Work sequence

1. Fix existing flows and shared form feedback. Commit as a focused reliability/UI change.
2. Add isolated member-hub storage and permission-scoped action/calendar/decision projections. Wire action center, calendar, decision desk and saved comparison routes, including their loading/empty/error states.
3. Add verified recovery-email and one-time recovery flows, with local email capture and configured SMTP. Wire sign-in and private contact settings.
4. Add private call signaling and native WebRTC controls with consent, connection/reconnect/end states and track cleanup.
5. Extend investment rooms with test agreements, funding evidence state and portfolio accounting; expose only confirmed, consented investor appearances.
6. Optimize illustration delivery and lazy route loading. Finish responsive composition and documentation.
7. Run one bounded browser pass across desktop/mobile and both themes; fix observed defects together, confirm once, restore original preferences and record material runtime limits.

## Verification focus

Review access filters on every new member endpoint; same-owner writes and UUID validation; safe URL handling; idempotent funding/acceptance; exact centavo arithmetic and compensating reversals; stale offers/proposals; signed-versus-current terms; account enumeration/contact changes; call cleanup and signal expiry; small screens, long labels, keyboard controls and unavailable providers. Source review and browser evidence are not a substitute for financial/security regression tests, which are excluded by the current user instruction.
