# Product illustrations, achievements and avatars

Mode: Operate. The user supplied a second illustration reference on 2026-10-28 and requested product scenes, illustrated named achievements and profile-avatar selections.

The existing blue/navy PixelVault identity stays in place. Supporting art uses fine charcoal outlines, flat cobalt/teal/coral/mustard fills, isometric object planes, sparse stippling and friendly simplified people. This vocabulary comes from the supplied reference; compositions and vector characters are original. Artwork supports the app's task hierarchy and never replaces a cost disclosure or payment state.

Five generated editorial scenes cover shared learning, a mutually understood schedule, welcoming members, the lending journey and finding a way back from an unavailable page. Their exact prompts and provenance are in [illustration-prompts](../brand/illustration-prompts.md); the reference is preserved in [brand](../brand/pixelvault-illustration-reference.png). Image generation used the built-in tool. Artwork contains no factual amounts, testimonials, credit promises or invented results.

The original six achievements retain their names and server-owned earning rules: First Chapter, Clockwork, Full Circle, Open Book, Helping Hand and Fresh Start. Each has distinct original vector artwork. Earned, unavailable and private states have text; illustrations do not imply verification, lending authority or guaranteed repayment. Fresh Start remains private. Four additional nonfinancial awards extend the collection: Bright Start (completed financial literacy), Good Neighbor (one distinct approved educational contribution), Shared Wisdom (three), and Community Guide (ten). Helping Hand retains its five-contribution threshold. The collection explains all ten achievements while only eligible, public-capable awards can enter the optional three-item showcase.

Eight original illustrated avatars provide a profile-picture choice: Sprout, Navigator, Maker, Reader, Dreamer, Connector, Explorer and Keeper. The selector previews the current choice, identifies each option by name and saves a server-validated preset key. No arbitrary image URL, upload or identity-verification claim is introduced. Unknown keys fall back safely to initials. Profile, discovery, messages and navigation use the shared rendering component wherever the API supplies a member's key.

Verification follows AGENTS.md: targeted PostgreSQL authorization/persistence tests, accessible component interactions, TypeScript, shared Shadcn control checks and automated contrast checks. No application build, browser inspection or manual/visual app test is authorized by this asset request.

## Screen coverage

| Surface | Artwork / behavior |
| --- | --- |
| `/sign-in`, `/register` | `welcome-community.png`, visible in desktop and compact mobile layouts |
| `/how-it-works` | `lending-journey.png` plus seven ordered accessible HTML steps; linked from auth, navigation and Help |
| Actual route errors and unmatched paths | `finding-your-way.png`; private error details stay hidden and no payment success is inferred |
| Explore, profile editing, achievements | `community-workshop.png` |
| Learning room | `shared-plan.png` |
| `/profile/badges`, `/badges/:key` | Ten distinct achievement vectors and server-owned names/criteria |
| `/profile/edit` | Eight persistent preset portraits |

Screen-copy review distinguishes a commission obligation created by confirmed funding from its separate collection. Test-mode text requests fictional details without asserting that every registrant has supplied them.
