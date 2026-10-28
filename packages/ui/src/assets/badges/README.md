# PixelVault illustrated achievements and avatars

Created on 2026-10-28 as original, repo-native SVG artwork. These replace the initial geometric frames and Lucide pictograms. Source components are [BadgeArt.tsx](../../BadgeArt.tsx) and [AvatarArt.tsx](../../AvatarArt.tsx). No stock imagery, game artwork, prebuilt avatar library, or third-party character design is used.

The user-supplied illustration reference informed the medium: dimensional editorial scenes, fine charcoal contours, flat coral/pink/mustard/teal fills, small stippled areas and simple human faces. New compositions use PixelVault blue and the established product world. The reference's actual scenes and characters were not traced or copied.

| Achievement   | Original illustration                                             | Meaning retained                                                                      |
| ------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| First Chapter | An opening book, a growing plant and a blue first step            | Approved onboarding and completed financial literacy                                  |
| Clockwork     | A large analog clock above three dimensional steps                | Three confirmed on-time installments; authoritative server evidence                   |
| Full Circle   | Two continuous returning ribbons around a completed object        | A fully settled loan without pending collection reversal                              |
| Open Book     | Fanned disclosure pages and a clear inspection lens               | Three completed agreements with complete disclosures and no upheld disclosure finding |
| Helping Hand  | An extended hand supporting educational books and a growing plant | Five distinct moderator-approved educational contributions                            |
| Fresh Start   | An open arch, a new path and a growing plant                      | Private recognition after completing a mutually agreed recovery arrangement           |

Four learning and contribution milestones extend the collection without requiring a loan:

| Achievement     | Original illustration                                          | Meaning retained                                            |
| --------------- | -------------------------------------------------------------- | ----------------------------------------------------------- |
| Bright Start    | A friendly rising sun over an open learning book               | Completed literacy check; no borrowing required             |
| Good Neighbor   | Two conversation windows exchanging a book and a growing seed  | First distinct moderator-approved educational contribution  |
| Shared Wisdom   | A dimensional community library with three illustrated volumes | Three distinct moderator-approved educational contributions |
| Community Guide | A lantern above shared books beside a wayfinding sign          | Ten distinct moderator-approved educational contributions   |

`BADGE_ART_DEFINITIONS` exports the ten keys and display names for asset generation. `scripts/export-artwork.mjs` exports all ten standalone SVGs and eight avatar SVGs. The responsive contact sheet derives its section positions and height from collection counts, so added rows never overlap the avatar section.

Badge labels and award rules stay server-controlled. Artwork never establishes eligibility, legal authority, risk ratings or repayment guarantees. Fresh Start remains private. The locked palette is muted but has a legible outline; consumers also display the status in text. Full illustrations use a 160 × 160 viewBox and support compact shelves and larger achievement pages. Each instance isolates SVG texture IDs using React `useId`.

Eight cosmetic profile selections are exported in `AVATAR_OPTIONS`: **Sprout, Navigator, Maker, Reader, Dreamer, Connector, Explorer and Keeper**. They are friendly fictional adult portraits with varied hairstyles, skin tones, clothing and accessories. Names express playful creative identities, not ranks. The 128 × 128 vector compositions include their own circular crop. Direct AvatarArt use safely renders Sprout for unknown or stale values; the application MemberAvatar wrapper falls back to initials instead. A preset is never identity verification evidence.

Verification: scoped automated accessibility, catalog and isolated SVG-reference checks, TypeScript and the shared UI boundary check. No build, browser inspection or visual test was run, in keeping with repository policy.
