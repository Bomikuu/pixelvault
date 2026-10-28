# PixelVault Community Implementation Plan

> Original task definition. Native collaboration tools were used because the named helper skills were not installed. Actual delivered behavior, verification and remaining deployment dependencies are recorded in [implementation status](../IMPLEMENTATION.md); original task checklists are retained as the planning baseline.

**Goal:** Deliver approximate list/map discovery, limited social profiles, meaningful optional achievements, private messages and transaction-based moderated reviews.

**Architecture:** Allowlisted public projections are separate from private financial records. Search uses coarse areas; awards consume verified immutable facts; reviews/messages enforce participant permissions. A responsive React community shell uses the existing brand.

**Tech Stack:** Django/DRF, PostgreSQL, React/Shadcn, proposed MapLibre adapter, mocked map/geocoder dependencies, pytest and Testing Library.

**Spec:** [PixelVault design](../specs/2026-10-28-pixelvault-design.md), §9 and [community brief](../surfaces/community.md). Depends on phases 1–3 for verification and financial facts; discovery alone may start after phase 2.

## Global Constraints

- Individual-to-individual lending is mandatory.
- A declined application never lowers reputation.
- Public community levels derive from literacy/contributions, not debt.
- Financial state is never client-authoritative.
- Live money remains disabled until the model and payment arrangements are actually approved.
- No public income, legal documents, debt balances or adverse credit history. Synthetic data, no builds/browser/visual/manual app checks; run targeted automated tests plus UI/type checks.

## Review Focus

- Exact home/GPS data must not leak through a map marker, URL, search response or analytics — task 4.1.
- Map/GPS failure must leave complete discovery available — task 4.1.
- A later payment reversal or provider delay must correct awards without publicly shaming a person — task 4.2.
- Self-loans/cycles/purchased or large loans must not manufacture XP or badges — task 4.2.
- Blind review publication and participant messages must resist retaliation and guessed IDs — task 4.3.

### Task 4.1: Privacy-preserving discovery and social identity

**Files:** create `apps/api/community/{locations,search,profiles,serializers,views}.py`, `apps/api/community/tests/{test_search,test_public_profile}.py`, `apps/web/src/features/community/{ExplorePage,OfferResults,OfferMap,MemberProfile}.tsx`, `apps/web/src/features/community/ExplorePage.test.tsx`. Extend `PublicProfile` from accounts with opt-in display fields.

**Interfaces:** consumes published offers and allowlisted identity; produces `search_offers(*, viewer_id: UUID | None, filters: OfferFilters, cursor: str | None) -> OfferPage`, `public_profile(*, handle: str, viewer_id: UUID | None) -> PublicProfileView`, `coarse_area(*, area_code: str) -> CoarseArea`. `OfferFilters` contains administrative area/distance band, amount, frequency, term, disclosed-cost sort and verification attributes, never a public precise home point.

- [ ] Write `test_profile_allowlist_excludes_legal_identity_income_and_debt`, `test_only_published_available_offers_listed`, `test_private_application_not_searchable`, `test_markers_are_area_centroids_not_member_homes`, `test_precise_location_not_in_urls_or_logs`, `test_cost_sort_uses_same_principal_term_scenario`, `test_uncomparable_cost_is_labeled_not_ranked_as_zero`. Component tests cover shared URL filters, approximate labels, manual area selection, denied GPS, failed map and a keyboard-usable complete list.
- [ ] Run `uv run pytest apps/api/community/tests/test_search.py apps/api/community/tests/test_public_profile.py -q` and `npm test -- apps/web/src/features/community/ExplorePage.test.tsx` and observe the missing privacy/fallback behavior.
- [ ] Implement city/barangay centroid-based results and approximate distance bands. Use manual location by default; optional GPS requires specific consent and transient resolution to a coarse area, with no persistent precise coordinates in public state. MapLibre is an interface adapter; test data uses synthetic coarse areas and no network tiles. Production tiles/geocoder must have a selected provider/license and bounded location-data policy. Map/list share results and filters; do not calculate and expose exact distances between residences. If a common cost scenario is unavailable, show clear per-offer cost examples instead of a misleading ranking. No sponsored ranking in MVP; any future sponsorship must be labeled separately from suitability.
- [ ] Run the named tests, `npm run typecheck` and `npm run check:ui`. Read Impeccable craft-floor before UI edits; use the supplied brand and comparable money/date rows, not generic decorative cards.
- [ ] Commit with `feat(pixelvault): add private-by-default community discovery`.

### Task 4.2: Evidence-based achievements and separate reputation histories

**Files:** create `apps/api/community/{models,awards,reputation}.py`, `apps/api/community/tests/test_awards.py`, `apps/web/src/features/community/{BadgeShelf,BadgeDetail,ProfileEditor}.tsx`, `apps/web/src/features/community/BadgeShelf.test.tsx`. Original badge assets and rule/provenance records live in `packages/ui/src/assets/badges/`.

**Interfaces:** consumes verified onboarding/literacy, eligible ledger events, agreement disclosures and moderated contributions; produces `evaluate_awards(*, member_id: UUID, rule_version: str) -> AwardEvaluation`, `set_public_badges(*, member_id: UUID, award_ids: tuple[UUID, ...]) -> PublicProfileView`, `repayment_summary(*, actor_id: UUID, member_id: UUID, purpose: str) -> PrivateRepaymentSummary`. Rule v1 uses the spec's exact criteria and a maximum of three equipped public awards. Private risk records are never returned by public-profile serializers.

- [ ] Write `test_first_chapter_requires_no_loan`, `test_clockwork_requires_three_confirmed_on_time_installments`, `test_provider_delay_not_borrower_lateness`, `test_full_circle_waits_for_pending_reversal`, `test_reversal_hides_ineligible_award_without_public_reason`, `test_open_book_requires_three_complete_agreements`, `test_helping_hand_requires_five_distinct_approved_contributions`, `test_loan_amount_and_repeat_originations_give_no_xp`, `test_cyclic_or_linked_accounts_queue_review`, `test_public_badge_selection_maximum_three`, `test_decline_and_unproved_complaint_do_not_lower_score`, `test_recovery_milestone_private`. Component tests assert accessible badge names/criteria, earned dates, optional financial-achievement display and reduced-motion feedback.
- [ ] Run `uv run pytest apps/api/community/tests/test_awards.py -q` and `npm test -- apps/web/src/features/community/BadgeShelf.test.tsx` and observe missing rule/privacy behavior.
- [ ] Implement idempotent awards with rule/evidence/earned-date/correction history. Consume the durable event outbox after transaction commit; revocation and appeals retain private audit history. Proposed community levels: Newcomer before literacy completion, Prepared after it, Contributor after three distinct approved contributions, Guide after five. Only nonfinancial learning/contributions determine public community level; private repayment/conduct history remains separate. Do not use a badge as approval, a popularity credit score, or an external credit-bureau claim. Author original badge graphics faithful to the brand; no game/Reddit asset copying or purchasable trust.
- [ ] Run the named checks plus affected public-profile tests, typecheck and UI boundary checks. Re-evaluation must produce no duplicate awards or replayed celebratory animation.
- [ ] Commit with `feat(pixelvault): add optional evidence-based achievements`.

### Task 4.3: Scoped messaging, moderated blind reviews and contribution controls

**Files:** create `apps/api/community/{messaging,reviews,moderation}.py`, extend community models/views, add `apps/api/community/tests/{test_messages,test_reviews,test_moderation}.py`, `apps/web/src/features/community/{InboxPage,ReviewForm,ReviewList}.tsx`, `apps/web/src/features/community/Communication.test.tsx`.

**Interfaces:** consumes verified transaction parties and public profile; produces `send_message(*, actor_id: UUID, thread_id: UUID, body: str, operation_id: UUID) -> Message`, `submit_review(*, actor_id: UUID, loan_id: UUID, ratings: ConductRatings, body: str, operation_id: UUID) -> Review`, `publish_eligible_reviews(*, at: datetime) -> int`, `moderate_content(*, actor_id: UUID, content_id: UUID, expected_version: int, decision: str, reason: str) -> ModerationResult`. Threads are bound to a private application or loan. Review categories are communication, clarity of terms, reliability of agreed actions and respectful conduct; no public delinquency field.

- [ ] Write `test_only_thread_participants_can_read_or_send`, `test_duplicate_send_key_does_not_duplicate_message`, `test_one_review_per_party_per_verified_loan`, `test_one_sided_review_hidden_before_14_days`, `test_both_submitted_requires_moderation_before_publication`, `test_closed_loan_reopened_holds_financial_review_eligibility`, `test_review_threat_or_private_data_is_held`, `test_response_and_appeal_preserve_history`, `test_declined_application_not_review_eligible`, `test_reference_not_contacted_for_collection`. Component tests cover field errors, report/appeal actions, sealed own-review state and keyboard navigation.
- [ ] Run `uv run pytest apps/api/community/tests/test_messages.py apps/api/community/tests/test_reviews.py apps/api/community/tests/test_moderation.py -q` and `npm test -- apps/web/src/features/community/Communication.test.tsx` and observe missing behavior.
- [ ] Implement participant-scoped inbox, sanitized text and report controls. Public publication requires both submissions or 14 days after eligible closure, plus moderation; held material is not automatically released by the clock. Claims about debt route to private cases. Apply per-member request/message rate limits without preventing urgent complaint or repayment access. Use a basic literacy/contribution moderation route for real educational content; never invent completed modules or content approvals.
- [ ] Run the named tests, typecheck, `check:ui` and schema validation. Text review tools must not receive private messages or documents without a specifically approved data-processing arrangement; Jev is not an automatic content/credit adjudicator.
- [ ] Commit with `feat(pixelvault): add private communication and moderated reviews`.

**Phase acceptance:** members can discover and compare offers by list or approximate map, view limited profiles, optionally showcase original badges, communicate privately and review verified counterparties without public debt exposure or reputation gaming.
