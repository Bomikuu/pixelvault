# API operation inventory

163 registered operations: 163 typed, 0 partial, 0 generic.

Source metadata is not runtime validation. `typed` describes concrete declarations; partial/generic operations remain release gaps. Documentation access never grants operation access. Methods, ownership checks and serializer details are linked below.

| Method | Path | Access | Contract | Source |
| --- | --- | --- | --- | --- |
| GET | `/api/v1/admin/achievement-holds` | staff + role/assignment/step-up policy (source) | typed | [AchievementHoldsView](../../apps/api/community/views.py) |
| POST | `/api/v1/admin/achievement-holds/{hold_id}/resolve` | staff + role/assignment/step-up policy (source) | typed | [AchievementHoldResolutionView](../../apps/api/community/views.py) |
| GET | `/api/v1/admin/audit` | staff + role/assignment/step-up policy (source) | typed | [AuditView](../../apps/api/accounts/admin_views.py) |
| GET | `/api/v1/admin/cases` | staff + role/assignment/step-up policy (source) | typed | [CaseQueueView](../../apps/api/cases/views.py) |
| GET | `/api/v1/admin/cases/{case_id}` | staff + role/assignment/step-up policy (source) | typed | [AdminCaseDetailView](../../apps/api/cases/views.py) |
| POST | `/api/v1/admin/cases/{case_id}/assign` | staff + role/assignment/step-up policy (source) | typed | [AssignCaseView](../../apps/api/cases/views.py) |
| POST | `/api/v1/admin/cases/{case_id}/decision` | staff + role/assignment/step-up policy (source) | typed | [CaseDecisionView](../../apps/api/cases/views.py) |
| POST | `/api/v1/admin/cases/{case_id}/legal-remedy-review` | staff + role/assignment/step-up policy (source) | typed | [LegalRemedyView](../../apps/api/cases/views.py) |
| GET | `/api/v1/admin/commissions` | staff + role/assignment/step-up policy (source) | typed | [CommissionsView](../../apps/api/reporting/views.py) |
| POST | `/api/v1/admin/documents/{document_id}/scan` | staff + role/assignment/step-up policy (source) | typed | [ScanView](../../apps/api/documents/views.py) |
| GET | `/api/v1/admin/moderation` | staff + role/assignment/step-up policy (source) | typed | [ModerationQueueView](../../apps/api/community/views.py) |
| POST | `/api/v1/admin/moderation/{content_id}` | staff + role/assignment/step-up policy (source) | typed | [ModerationDecisionView](../../apps/api/community/views.py) |
| GET | `/api/v1/admin/offer-comments` | staff + role/assignment/step-up policy (source) | typed | [ModerationQueueView](../../apps/api/engagement/views.py) |
| POST | `/api/v1/admin/offer-comments/{comment_id}/review` | staff + role/assignment/step-up policy (source) | typed | [ModerationView](../../apps/api/engagement/views.py) |
| GET | `/api/v1/admin/plaza/bubbles` | staff + role/assignment/step-up policy (source) | typed | [ModerationQueueView](../../apps/api/plaza/views.py) |
| POST | `/api/v1/admin/plaza/bubbles/{bubble_id}/decision` | staff + role/assignment/step-up policy (source) | typed | [DecisionView](../../apps/api/plaza/views.py) |
| GET | `/api/v1/admin/policies` | staff + role/assignment/step-up policy (source) | typed | [PoliciesView](../../apps/api/accounts/admin_views.py) |
| POST | `/api/v1/admin/policies` | staff + role/assignment/step-up policy (source) | typed | [PoliciesView](../../apps/api/accounts/admin_views.py) |
| GET | `/api/v1/admin/reconciliation` | staff + role/assignment/step-up policy (source) | typed | [ReconciliationView](../../apps/api/reporting/views.py) |
| GET | `/api/v1/admin/registrations` | staff + role/assignment/step-up policy (source) | typed | [RegistrationQueueView](../../apps/api/accounts/admin_views.py) |
| GET | `/api/v1/admin/registrations/{registration_id}` | staff + role/assignment/step-up policy (source) | typed | [RegistrationReviewView](../../apps/api/verification/views.py) |
| POST | `/api/v1/admin/registrations/{registration_id}` | staff + role/assignment/step-up policy (source) | typed | [RegistrationReviewView](../../apps/api/verification/views.py) |
| GET | `/api/v1/admin/registrations/{registration_id}/review` | staff + role/assignment/step-up policy (source) | typed | [RegistrationReviewView](../../apps/api/verification/views.py) |
| POST | `/api/v1/admin/registrations/{registration_id}/review` | staff + role/assignment/step-up policy (source) | typed | [RegistrationReviewView](../../apps/api/verification/views.py) |
| GET | `/api/v1/admin/reporting` | staff + role/assignment/step-up policy (source) | typed | [OperationsMetricsView](../../apps/api/reporting/views.py) |
| GET | `/api/v1/admin/templates` | staff + role/assignment/step-up policy (source) | typed | [TemplatesView](../../apps/api/accounts/admin_views.py) |
| GET | `/api/v1/admin/verifications` | staff + role/assignment/step-up policy (source) | typed | [ReviewQueueView](../../apps/api/verification/views.py) |
| GET | `/api/v1/admin/verifications/{case_id}` | staff + role/assignment/step-up policy (source) | typed | [ReviewView](../../apps/api/verification/views.py) |
| POST | `/api/v1/admin/verifications/{case_id}` | staff + role/assignment/step-up policy (source) | typed | [ReviewView](../../apps/api/verification/views.py) |
| GET | `/api/v1/admin/verifications/{case_id}/review` | staff + role/assignment/step-up policy (source) | typed | [ReviewView](../../apps/api/verification/views.py) |
| POST | `/api/v1/admin/verifications/{case_id}/review` | staff + role/assignment/step-up policy (source) | typed | [ReviewView](../../apps/api/verification/views.py) |
| GET | `/api/v1/agreements` | member + object/domain policy | typed | [AgreementsView](../../apps/api/agreements/views.py) |
| GET | `/api/v1/agreements/{agreement_id}` | member + object/domain policy | typed | [AgreementView](../../apps/api/agreements/views.py) |
| POST | `/api/v1/agreements/{agreement_id}/accept` | member + object/domain policy | typed | [AcceptView](../../apps/api/agreements/views.py) |
| GET | `/api/v1/agreements/{agreement_id}/document` | member + object/domain policy | typed | [DocumentView](../../apps/api/agreements/views.py) |
| GET | `/api/v1/applications` | member + object/domain policy | typed | [ApplicationsView](../../apps/api/marketplace/views.py) |
| GET | `/api/v1/applications/{application_id}` | member + object/domain policy | typed | [ApplicationDetailView](../../apps/api/marketplace/views.py) |
| POST | `/api/v1/applications/{application_id}/decline` | member + object/domain policy | typed | [DeclineView](../../apps/api/marketplace/views.py) |
| POST | `/api/v1/applications/{application_id}/select` | member + object/domain policy | typed | [SelectView](../../apps/api/marketplace/views.py) |
| POST | `/api/v1/applications/{application_id}/withdraw` | member + object/domain policy | typed | [WithdrawView](../../apps/api/marketplace/views.py) |
| GET | `/api/v1/auth/contacts` | member + object/domain policy | typed | [ContactView](../../apps/api/accounts/views.py) |
| PATCH | `/api/v1/auth/contacts` | member + object/domain policy | typed | [ContactView](../../apps/api/accounts/views.py) |
| POST | `/api/v1/auth/presence` | member + object/domain policy | typed | [PresenceView](../../apps/api/accounts/views.py) |
| PATCH | `/api/v1/auth/profile` | member + object/domain policy | typed | [ProfileView](../../apps/api/accounts/views.py) |
| DELETE | `/api/v1/auth/profile/photo` | member + object/domain policy | typed | [ProfilePhotoView](../../apps/api/accounts/views.py) |
| POST | `/api/v1/auth/profile/photo` | member + object/domain policy | typed | [ProfilePhotoView](../../apps/api/accounts/views.py) |
| POST | `/api/v1/auth/recovery` | public | typed | [RecoveryRequestView](../../apps/api/accounts/recovery.py) |
| GET | `/api/v1/auth/recovery-email` | member + object/domain policy | typed | [RecoveryEmailView](../../apps/api/accounts/recovery.py) |
| POST | `/api/v1/auth/recovery-email` | member + object/domain policy | typed | [RecoveryEmailView](../../apps/api/accounts/recovery.py) |
| POST | `/api/v1/auth/recovery-email/{member_id}/verify` | public | typed | [VerifyRecoveryEmailView](../../apps/api/accounts/recovery.py) |
| POST | `/api/v1/auth/recovery/{recovery_id}` | public | typed | [RecoveryConfirmView](../../apps/api/accounts/recovery.py) |
| POST | `/api/v1/auth/register` | public | typed | [RegisterView](../../apps/api/accounts/views.py) |
| GET | `/api/v1/auth/session` | public | typed | [SessionView](../../apps/api/accounts/views.py) |
| POST | `/api/v1/auth/sign-in` | public | typed | [SignInView](../../apps/api/accounts/views.py) |
| POST | `/api/v1/auth/sign-out` | member + object/domain policy | typed | [SignOutView](../../apps/api/accounts/views.py) |
| POST | `/api/v1/auth/step-up` | member + object/domain policy | typed | [StepUpView](../../apps/api/accounts/views.py) |
| GET | `/api/v1/cases` | member + object/domain policy | typed | [CasesView](../../apps/api/cases/views.py) |
| POST | `/api/v1/cases` | member + object/domain policy | typed | [CasesView](../../apps/api/cases/views.py) |
| GET | `/api/v1/cases/amendments` | member + object/domain policy | typed | [AmendmentsView](../../apps/api/cases/views.py) |
| POST | `/api/v1/cases/amendments` | member + object/domain policy | typed | [AmendmentsView](../../apps/api/cases/views.py) |
| POST | `/api/v1/cases/amendments/{proposal_id}/accept` | member + object/domain policy | typed | [AmendmentAcceptanceView](../../apps/api/cases/views.py) |
| POST | `/api/v1/cases/amendments/{proposal_id}/withdraw` | member + object/domain policy | typed | [AmendmentWithdrawalView](../../apps/api/cases/views.py) |
| GET | `/api/v1/cases/{case_id}` | member + object/domain policy | typed | [CaseDetailView](../../apps/api/cases/views.py) |
| POST | `/api/v1/cases/{case_id}/responses` | member + object/domain policy | typed | [CaseResponseView](../../apps/api/cases/views.py) |
| POST | `/api/v1/commissions/{accrual_id}/checkout` | member + object/domain policy | typed | [CommissionCheckoutView](../../apps/api/payments/views.py) |
| GET | `/api/v1/community/achievement-catalog` | public | typed | [AchievementCatalogView](../../apps/api/community/views.py) |
| GET | `/api/v1/community/activity` | public | typed | [ActivityView](../../apps/api/community/activity.py) |
| GET | `/api/v1/community/activity/stream` | public | typed | [ActivityStreamView](../../apps/api/community/activity.py) |
| GET | `/api/v1/community/areas` | public | typed | [AreasView](../../apps/api/community/views.py) |
| GET | `/api/v1/community/awards` | member + object/domain policy | typed | [AwardsView](../../apps/api/community/views.py) |
| POST | `/api/v1/community/awards` | member + object/domain policy | typed | [AwardsView](../../apps/api/community/views.py) |
| GET | `/api/v1/community/contributions` | member + object/domain policy | typed | [ContributionsView](../../apps/api/community/views.py) |
| POST | `/api/v1/community/contributions` | member + object/domain policy | typed | [ContributionsView](../../apps/api/community/views.py) |
| GET | `/api/v1/community/discovery` | public | typed | [DiscoveryView](../../apps/api/community/views.py) |
| GET | `/api/v1/community/leaderboard` | public | typed | [LeaderboardView](../../apps/api/community/views.py) |
| GET | `/api/v1/community/offers/{offer_id}/investors` | public | typed | [PublicInvestorsView](../../apps/api/investments/views.py) |
| GET | `/api/v1/community/photos/{photo_id}` | public | typed | [PublicPhotoView](../../apps/api/accounts/views.py) |
| GET | `/api/v1/community/profile` | member + object/domain policy | typed | [ProfileView](../../apps/api/community/views.py) |
| PATCH | `/api/v1/community/profile` | member + object/domain policy | typed | [ProfileView](../../apps/api/community/views.py) |
| GET | `/api/v1/community/profiles/{handle}` | public | typed | [PublicProfileView](../../apps/api/community/views.py) |
| GET | `/api/v1/community/repayment-summary/{member_id}` | member + object/domain policy | typed | [RepaymentSummaryView](../../apps/api/community/views.py) |
| POST | `/api/v1/community/reports` | member + object/domain policy | typed | [ReportView](../../apps/api/community/views.py) |
| GET | `/api/v1/community/reputation` | member + object/domain policy | typed | [ReputationView](../../apps/api/community/views.py) |
| GET | `/api/v1/community/reviews` | member + object/domain policy | typed | [ReviewsView](../../apps/api/community/views.py) |
| POST | `/api/v1/community/reviews` | member + object/domain policy | typed | [ReviewsView](../../apps/api/community/views.py) |
| POST | `/api/v1/community/reviews/{review_id}/appeal` | member + object/domain policy | typed | [ReviewAppealView](../../apps/api/community/views.py) |
| POST | `/api/v1/community/reviews/{review_id}/response` | member + object/domain policy | typed | [ReviewResponseView](../../apps/api/community/views.py) |
| GET | `/api/v1/community/threads` | member + object/domain policy | typed | [ThreadView](../../apps/api/community/views.py) |
| POST | `/api/v1/community/threads` | member + object/domain policy | typed | [ThreadView](../../apps/api/community/views.py) |
| GET | `/api/v1/community/threads/{thread_id}/messages` | member + object/domain policy | typed | [MessagesView](../../apps/api/community/views.py) |
| POST | `/api/v1/community/threads/{thread_id}/messages` | member + object/domain policy | typed | [MessagesView](../../apps/api/community/views.py) |
| GET | `/api/v1/connections/co-borrowers` | member + object/domain policy | typed | [InvitationsView](../../apps/api/connections/views.py) |
| POST | `/api/v1/connections/co-borrowers` | member + object/domain policy | typed | [InvitationsView](../../apps/api/connections/views.py) |
| GET | `/api/v1/connections/co-borrowers/invite/{token}` | member + object/domain policy | typed | [InvitationClaimView](../../apps/api/connections/views.py) |
| POST | `/api/v1/connections/co-borrowers/{invitation_id}/action` | member + object/domain policy | typed | [InvitationActionView](../../apps/api/connections/views.py) |
| GET | `/api/v1/documents` | member + object/domain policy | typed | [DocumentsView](../../apps/api/documents/views.py) |
| POST | `/api/v1/documents/upload` | member + object/domain policy | typed | [UploadView](../../apps/api/documents/views.py) |
| GET | `/api/v1/documents/{document_id}/content` | member + object/domain policy | typed | [ContentView](../../apps/api/documents/views.py) |
| GET | `/api/v1/documents/{document_id}/download` | member + object/domain policy | typed | [DownloadView](../../apps/api/documents/views.py) |
| DELETE | `/api/v1/engagement/comments/{comment_id}` | member + object/domain policy | typed | [CommentDetailView](../../apps/api/engagement/views.py) |
| POST | `/api/v1/engagement/comments/{comment_id}/report` | member + object/domain policy | typed | [ReportView](../../apps/api/engagement/views.py) |
| GET | `/api/v1/engagement/offers/{offer_id}` | public | typed | [SocialView](../../apps/api/engagement/views.py) |
| GET | `/api/v1/engagement/offers/{offer_id}/calculator` | public | typed | [CalculatorView](../../apps/api/engagement/views.py) |
| POST | `/api/v1/engagement/offers/{offer_id}/comments` | member + object/domain policy | typed | [CommentView](../../apps/api/engagement/views.py) |
| PUT | `/api/v1/engagement/offers/{offer_id}/like` | member + object/domain policy | typed | [LikeView](../../apps/api/engagement/views.py) |
| PUT | `/api/v1/engagement/offers/{offer_id}/reaction` | member + object/domain policy | typed | [ReactionView](../../apps/api/engagement/views.py) |
| GET | `/api/v1/hub/actions` | member + object/domain policy | typed | [ActionsView](../../apps/api/memberhub/views.py) |
| POST | `/api/v1/hub/actions` | member + object/domain policy | typed | [ActionsView](../../apps/api/memberhub/views.py) |
| GET | `/api/v1/hub/calendar` | member + object/domain policy | typed | [CalendarView](../../apps/api/memberhub/views.py) |
| GET | `/api/v1/hub/calendar/export` | member + object/domain policy | typed | [CalendarExportView](../../apps/api/memberhub/views.py) |
| GET | `/api/v1/hub/decisions` | member + object/domain policy | typed | [DecisionsView](../../apps/api/memberhub/views.py) |
| GET | `/api/v1/hub/saved-offers` | member + object/domain policy | typed | [SavedOffersView](../../apps/api/memberhub/views.py) |
| PUT | `/api/v1/hub/saved-offers/{offer_id}` | member + object/domain policy | typed | [SavedOfferView](../../apps/api/memberhub/views.py) |
| POST | `/api/v1/hub/threads/{thread_id}/read` | member + object/domain policy | typed | [ThreadReadView](../../apps/api/memberhub/views.py) |
| POST | `/api/v1/integrations/pixelflow/{routing_id}/events` | signed service callback | typed | [WebhookView](../../apps/api/payments/views.py) |
| GET | `/api/v1/investments/portfolio` | member + object/domain policy | typed | [PortfolioView](../../apps/api/investments/views.py) |
| GET | `/api/v1/lender-registration` | member + object/domain policy | typed | [RegistrationView](../../apps/api/verification/views.py) |
| POST | `/api/v1/lender-registration` | member + object/domain policy | typed | [RegistrationView](../../apps/api/verification/views.py) |
| GET | `/api/v1/literacy/complete` | member + object/domain policy | typed | [LiteracyView](../../apps/api/accounts/views.py) |
| POST | `/api/v1/literacy/complete` | member + object/domain policy | typed | [LiteracyView](../../apps/api/accounts/views.py) |
| GET | `/api/v1/loan-documents` | member + object/domain policy | typed | [DocumentsView](../../apps/api/servicing/views.py) |
| GET | `/api/v1/loans` | member + object/domain policy | typed | [LoansView](../../apps/api/servicing/views.py) |
| GET | `/api/v1/loans/{loan_id}` | member + object/domain policy | typed | [LoanView](../../apps/api/servicing/views.py) |
| POST | `/api/v1/loans/{loan_id}/checkout` | member + object/domain policy | typed | [CheckoutView](../../apps/api/payments/views.py) |
| GET | `/api/v1/loans/{loan_id}/commission` | member + object/domain policy | typed | [LoanCommissionView](../../apps/api/servicing/views.py) |
| POST | `/api/v1/loans/{loan_id}/disburse` | member + object/domain policy | typed | [DisburseView](../../apps/api/servicing/views.py) |
| GET | `/api/v1/loans/{loan_id}/documents` | member + object/domain policy | typed | [LoanDocumentsView](../../apps/api/servicing/views.py) |
| GET | `/api/v1/loans/{loan_id}/payment-preview` | member + object/domain policy | typed | [PaymentPreviewView](../../apps/api/payments/views.py) |
| GET | `/api/v1/loans/{loan_id}/payments` | member + object/domain policy | typed | [LoanPaymentsView](../../apps/api/servicing/views.py) |
| GET | `/api/v1/loans/{loan_id}/receipts/{entry_id}` | member + object/domain policy | typed | [ReceiptView](../../apps/api/servicing/views.py) |
| POST | `/api/v1/loans/{loan_id}/renew-effective-date` | member + object/domain policy | typed | [RenewEffectiveDateView](../../apps/api/agreements/views.py) |
| GET | `/api/v1/loans/{loan_id}/timeline` | member + object/domain policy | typed | [TimelineView](../../apps/api/servicing/views.py) |
| GET | `/api/v1/meetings` | member + object/domain policy | typed | [RoomsView](../../apps/api/negotiations/views.py) |
| POST | `/api/v1/meetings` | member + object/domain policy | typed | [RoomsView](../../apps/api/negotiations/views.py) |
| GET | `/api/v1/meetings/{room_id}` | member + object/domain policy | typed | [RoomView](../../apps/api/negotiations/views.py) |
| POST | `/api/v1/meetings/{room_id}` | member + object/domain policy | typed | [RoomView](../../apps/api/negotiations/views.py) |
| GET | `/api/v1/meetings/{room_id}/call` | member + object/domain policy | typed | [RoomCallView](../../apps/api/negotiations/calls.py) |
| POST | `/api/v1/meetings/{room_id}/call` | member + object/domain policy | typed | [RoomCallView](../../apps/api/negotiations/calls.py) |
| POST | `/api/v1/meetings/{room_id}/evidence` | member + object/domain policy | typed | [EvidenceView](../../apps/api/negotiations/views.py) |
| DELETE | `/api/v1/meetings/{room_id}/evidence/{evidence_id}` | member + object/domain policy | typed | [EvidenceContentView](../../apps/api/negotiations/views.py) |
| GET | `/api/v1/meetings/{room_id}/evidence/{evidence_id}` | member + object/domain policy | typed | [EvidenceContentView](../../apps/api/negotiations/views.py) |
| GET | `/api/v1/meetings/{room_id}/investment-agreement` | member + object/domain policy | typed | [InvestmentDocumentView](../../apps/api/investments/views.py) |
| GET | `/api/v1/meetings/{room_id}/stream` | member + object/domain policy | typed | [RoomStreamView](../../apps/api/negotiations/views.py) |
| GET | `/api/v1/notices` | member + object/domain policy | typed | [NoticesView](../../apps/api/cases/views.py) |
| PATCH | `/api/v1/notices` | member + object/domain policy | typed | [NoticesView](../../apps/api/cases/views.py) |
| GET | `/api/v1/offers` | member + object/domain policy | typed | [OffersView](../../apps/api/marketplace/views.py) |
| POST | `/api/v1/offers` | member + object/domain policy | typed | [OffersView](../../apps/api/marketplace/views.py) |
| GET | `/api/v1/offers/{offer_id}` | member + object/domain policy | typed | [OfferDetailView](../../apps/api/marketplace/views.py) |
| POST | `/api/v1/offers/{offer_id}/applications` | member + object/domain policy | typed | [ApplyView](../../apps/api/marketplace/views.py) |
| POST | `/api/v1/offers/{offer_id}/publish` | member + object/domain policy | typed | [OfferPublishView](../../apps/api/marketplace/views.py) |
| GET | `/api/v1/payments` | member + object/domain policy | typed | [PaymentsView](../../apps/api/servicing/views.py) |
| GET | `/api/v1/people` | member + object/domain policy | typed | [PeopleView](../../apps/api/servicing/views.py) |
| POST | `/api/v1/plaza/bubbles/{bubble_id}/reports` | member + object/domain policy | typed | [ReportView](../../apps/api/plaza/views.py) |
| GET | `/api/v1/plaza/rooms` | public | typed | [RoomsView](../../apps/api/plaza/views.py) |
| GET | `/api/v1/plaza/rooms/{slug}` | member + object/domain policy | typed | [SnapshotView](../../apps/api/plaza/views.py) |
| POST | `/api/v1/plaza/rooms/{slug}/commands` | member + object/domain policy | typed | [CommandView](../../apps/api/plaza/views.py) |
| POST | `/api/v1/plaza/rooms/{slug}/join` | member + object/domain policy | typed | [JoinView](../../apps/api/plaza/views.py) |
| GET | `/api/v1/plaza/rooms/{slug}/stream` | member + object/domain policy | typed | [StreamView](../../apps/api/plaza/views.py) |
| POST | `/api/v1/reporting/exports` | member + object/domain policy | typed | [ExportView](../../apps/api/reporting/views.py) |
| GET | `/api/v1/reporting/exports/{job_id}/download` | member + object/domain policy | typed | [ExportDownloadView](../../apps/api/reporting/views.py) |
| GET | `/api/v1/reporting/member` | member + object/domain policy | typed | [MemberMetricsView](../../apps/api/reporting/views.py) |
| GET | `/api/v1/verification` | member + object/domain policy | typed | [VerificationView](../../apps/api/verification/views.py) |
| POST | `/api/v1/verification` | member + object/domain policy | typed | [VerificationView](../../apps/api/verification/views.py) |
