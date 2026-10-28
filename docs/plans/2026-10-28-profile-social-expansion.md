# Profile and offer community expansion

**Goal:** Implement the requested contact registration, private co-borrower invitations, richer profiles and offer conversations using the established PixelVault brand.

**Scope authorization:** The user explicitly requested these additions to the running implementation and selected **Invite and verify first** for co-borrowers. Use native parallel agents in the existing repository. This delivery implements private invitations, verification and consent; joint repayment liability requires separate agreement terms.

## Design contract

Operate mode. Preserve the supplied blue/navy identity, Manrope typography, ink/isometric illustration family and established controls. The profile first viewport shows a real cover illustration, a large selected avatar or uploaded photo, name, community level, and factual transaction-review recommendations. Navigation uses legible tab-style links with a clear active state. Public social indicators never claim guaranteed repayment. Private contact information and invitations stay outside public projections.

The primary profile actions are Edit profile and Avatar frames & flair. Show server-derived profile setup progress separately from community XP progress. Offer detail adds a useful amount/term calculator before application, then a discussion and reaction area. Earned shareable badges appear in a keyboard-accessible reaction picker; ordinary like/unlike remains available. No financial terms are silently changed by a preview.

At 320px, profile controls wrap, photos retain their shape, and financial breakdowns remain labeled. At desktop widths, supporting context occupies an aside. Use canonical Shadcn controls, meaningful errors/loading/empty states and reduced-motion-safe feedback. Use the existing art/screenshots as visual evidence rather than importing another design system.

## Work packages and interfaces

1. **Account/profile backend** — `accounts/*`, `community/*`, relevant projections. Add private normalized mobile registration and contact settings without pretending SMS/email delivery exists. Add validated raster profile-photo upload/removal, a safe public photo URL beside existing avatar keys, factual moderated recommendation counts, private profile completeness and public XP progress. Preserve established session/public DTO boundaries. Tests cover private-field exclusion, image validation/re-encoding, current eligibility, ownership and progress calculations.
2. **Profile frontend** — `CommunityPages.tsx`, `ReputationPages.tsx`, shared identity display and profile-specific components/CSS. Add profile photo/avatar selection, bigger display photo, illustrated cover, useful tab navigation, XP/setup progress, review recommendation indicators and consistent people imagery. Consume account/profile endpoints from package 1. Add a visible entry for private contacts and co-borrowers without implementing their forms here. Tests cover multipart upload, avatar fallback, tab discoverability, progress and all identity display paths.
3. **Offer interaction package** — isolated `engagement/*` Django app plus colocated offer frontend components. Add persisted one-like-per-member, moderated public comments with author avatars, and one currently eligible public badge reaction per member. Root registers app and URL includes. Add interactive amount/term computation using existing server calculator; lender's actual term restrictions remain explicit. Tests cover duplicate/race rules, private/revoked badge exclusions, authorization, safe comment content and out-of-order preview responses.
4. **Private co-borrower invitation package** — isolated `connections/*` app, private React settings/page and application association. Record a named proposed co-borrower with mobile/email/optional Facebook URL and inviter attestation; never fetch Facebook or contact the person automatically. A signed invitation can be explicitly accepted/declined by the invited member, who supplies/consents to their own contact data. Pending people are not debtors, verified or liable. Only parties may inspect contacts; only an accepted verified invite can be associated with an application. No new party is silently inserted into existing agreements. Joint liability requires separate mutually accepted terms.
5. **Integration/artwork/review** — root owns shared contracts, route/config registration, a newly generated profile cover, API schema and documentation. Run scoped PostgreSQL/component tests, TypeScript, UI/contrast checks, Ruff, migration drift and OpenAPI validation. No builds. Desktop/mobile inspection was previously explicitly authorized for this ongoing UI revision; keep any further checks bounded to one pass and one confirmation.

## Review focus

- Uploaded images: reject SVG/HTML, oversized/decompression-risk or animated payloads; strip metadata and serve only validated image bytes.
- Contact changes: numbers/email are private, normalized, owned and unverified until actual evidence confirms them; no fabricated OTP delivery.
- Social recommendations: counts derive from approved relationship reviews, not arbitrary votes or financial hardship. Never manufacture a “10+ trusted” claim.
- Offer interactions: no duplicate likes, unearned/private badge exposure, stale revoked flair or access to hidden offers through engagement APIs.
- Calculator races and consent: late previews cannot overwrite newer inputs; co-borrower invitations cannot grant loan/document access or create contractual liability.

## Completion checks

- [x] Account/profile APIs and targeted tests.
- [x] Profile/contact/co-borrower UI and targeted tests.
- [x] Offer interaction APIs/calculator/UI and targeted tests.
- [x] Profile cover saved with generation provenance and used in the app.
- [x] Integrated automated checks and bounded authorized UI inspection.
- [x] Document actual behavior, remaining provider/contract limits and review evidence.
