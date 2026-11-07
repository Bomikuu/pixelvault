import { lazy, Suspense, type ComponentType } from "react";
import { Loading } from "../components";
function deferred<M>(load: () => Promise<M>, name: keyof M) {
  const Page = lazy(async () => ({
    default: (await load())[name] as unknown as ComponentType<
      Record<string, unknown>
    >,
  }));
  return function DeferredPage(props: Record<string, unknown>) {
    return (
      <Suspense fallback={<Loading text="Opening your workspace…" />}>
        <Page {...props} />
      </Suspense>
    );
  };
}
const MarketplacePage = deferred(
  () => import("../features/interactive-marketplace/MarketplacePage"),
  "MarketplacePage",
);
const PlazaModeration = deferred(
  () => import("../features/interactive-marketplace/ModerationQueue"),
  "ModerationQueue",
);
const MeetingLayout = deferred(
  () => import("../features/negotiations/MeetingLayout"),
  "MeetingLayout",
);
const MeetingList = deferred(
  () => import("../features/negotiations/MeetingList"),
  "MeetingList",
);
const LeaderboardDirectory = deferred(
  () => import("../features/leaderboard/LeaderboardDirectory"),
  "LeaderboardDirectory",
);
import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";
import { ErrorPage, NotFoundPage } from "./ErrorPage";
import { Shell } from "./Shell";
import { RequireMember } from "./RequireMember";
const ExplorePage = deferred(
  () => import("../features/ExplorePages"),
  "ExplorePage",
);
const OfferDetail = deferred(
  () => import("../features/ExplorePages"),
  "OfferDetail",
);
const NewOffer = deferred(() => import("../features/ExplorePages"), "NewOffer");
const ApplyPage = deferred(
  () => import("../features/ExplorePages"),
  "ApplyPage",
);
const Dashboard = deferred(
  () => import("../features/WorkspacePages"),
  "Dashboard",
);
const LoansPage = deferred(
  () => import("../features/WorkspacePages"),
  "LoansPage",
);
const ApplicationsPage = deferred(
  () => import("../features/WorkspacePages"),
  "ApplicationsPage",
);
const ApplicationDetail = deferred(
  () => import("../features/WorkspacePages"),
  "ApplicationDetail",
);
const AgreementPage = deferred(
  () => import("../features/WorkspacePages"),
  "AgreementPage",
);
const LoanDetail = deferred(
  () => import("../features/WorkspacePages"),
  "LoanDetail",
);
const ResourcePage = deferred(
  () => import("../features/WorkspacePages"),
  "ResourcePage",
);
const CommissionReview = deferred(
  () => import("../features/WorkspacePages"),
  "CommissionReview",
);
const AchievementsPage = deferred(
  () => import("../features/CommunityPages"),
  "AchievementsPage",
);
const BadgeDetail = deferred(
  () => import("../features/CommunityPages"),
  "BadgeDetail",
);
const EditProfile = deferred(
  () => import("../features/CommunityPages"),
  "EditProfile",
);
const InboxPage = deferred(
  () => import("../features/CommunityPages"),
  "InboxPage",
);
const LearningPage = deferred(
  () => import("../features/CommunityPages"),
  "LearningPage",
);
const MemberProfile = deferred(
  () => import("../features/CommunityPages"),
  "MemberProfile",
);
const OwnProfile = deferred(
  () => import("../features/CommunityPages"),
  "OwnProfile",
);
const ReviewForm = deferred(
  () => import("../features/CommunityPages"),
  "ReviewForm",
);
const AuthPage = deferred(() => import("../features/AuthPages"), "AuthPage");
const VerificationPage = deferred(
  () => import("../features/VerificationPages"),
  "VerificationPage",
);
const RegistrationPage = deferred(
  () => import("../features/VerificationPages"),
  "RegistrationPage",
);
const NewCase = deferred(() => import("../features/CasesPages"), "NewCase");
const CaseDetail = deferred(
  () => import("../features/CasesPages"),
  "CaseDetail",
);
const AnalyticsPage = deferred(
  () => import("../features/ReportingPages"),
  "AnalyticsPage",
);
const AdminDecision = deferred(
  () => import("../features/AdminPages"),
  "AdminDecision",
);
const AdminQueue = deferred(
  () => import("../features/AdminPages"),
  "AdminQueue",
);
const AdminRecords = deferred(
  () => import("../features/AdminPages"),
  "AdminRecords",
);
const ModerationPage = deferred(
  () => import("../features/AdminPages"),
  "ModerationPage",
);
const WorkQueues = deferred(
  () => import("../features/AdminPages"),
  "WorkQueues",
);
const AmendmentsPage = deferred(
  () => import("../features/AdditionalPages"),
  "AmendmentsPage",
);
const NewAmendment = deferred(
  () => import("../features/AdditionalPages"),
  "NewAmendment",
);
const AmendmentDetail = deferred(
  () => import("../features/AdditionalPages"),
  "AmendmentDetail",
);
const ContributionsPage = deferred(
  () => import("../features/AdditionalPages"),
  "ContributionsPage",
);
const ReportContentPage = deferred(
  () => import("../features/AdditionalPages"),
  "ReportContentPage",
);
const OwnReviews = deferred(
  () => import("../features/AdditionalPages"),
  "OwnReviews",
);
const ReviewResponsePage = deferred(
  () => import("../features/AdditionalPages"),
  "ReviewResponsePage",
);
const NotificationPreferences = deferred(
  () => import("../features/AdditionalPages"),
  "NotificationPreferences",
);
const HelpPage = deferred(() => import("../features/HelpPage"), "HelpPage");
const HowItWorksPage = deferred(
  () => import("../features/HowItWorksPage"),
  "HowItWorksPage",
);
const Leaderboard = deferred(
  () => import("../features/ReputationPages"),
  "Leaderboard",
);
const ReputationPage = deferred(
  () => import("../features/ReputationPages"),
  "ReputationPage",
);
import { ActionLink } from "../components";
const ContactSettings = deferred(
  () => import("../features/connections/ContactSettings"),
  "ContactSettings",
);
const CoBorrowersPage = deferred(
  () => import("../features/connections/CoBorrowersPage"),
  "CoBorrowersPage",
);
const InvitationClaimPage = deferred(
  () => import("../features/connections/InvitationReview"),
  "InvitationClaimPage",
);
const ActionCenter = deferred(
  () => import("../features/memberhub/ActionCenter"),
  "ActionCenter",
);
const SavedOffers = deferred(
  () => import("../features/memberhub/SavedOffers"),
  "SavedOffers",
);
const RepaymentCalendar = deferred(
  () => import("../features/memberhub/RepaymentCalendar"),
  "RepaymentCalendar",
);
const LenderDesk = deferred(
  () => import("../features/memberhub/LenderDesk"),
  "LenderDesk",
);
const AccountRecovery = deferred(
  () => import("../features/memberhub/AccountRecovery"),
  "AccountRecovery",
);
const InvestmentsPage = deferred(
  () => import("../features/investments/InvestmentsPage"),
  "InvestmentsPage",
);
const member = (element: React.ReactNode) => (
  <RequireMember>{element}</RequireMember>
);
export const routes = [
  {
    path: "/marketplace",
    element: <MarketplacePage />,
    errorElement: <ErrorPage />,
  },
  {
    path: "/forgot-password",
    element: <AccountRecovery />,
    errorElement: <ErrorPage />,
  },
  {
    path: "/reset-password/:id",
    element: <AccountRecovery mode="reset" />,
    errorElement: <ErrorPage />,
  },
  {
    path: "/verify-email/:id",
    element: <AccountRecovery mode="verify" />,
    errorElement: <ErrorPage />,
  },
  {
    path: "/meetings/:id",
    element: member(<MeetingLayout />),
    errorElement: <ErrorPage />,
  },
  { path: "/sign-in", element: <AuthPage />, errorElement: <ErrorPage /> },
  {
    path: "/register",
    element: <AuthPage register />,
    errorElement: <ErrorPage />,
  },
  {
    path: "/",
    element: <Shell />,
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: <Navigate to="/explore" replace /> },
      { path: "explore", element: <ExplorePage /> },
      { path: "admin/plaza", element: member(<PlazaModeration />) },
      { path: "offers/new", element: member(<NewOffer />) },
      { path: "offers/:id", element: <OfferDetail /> },
      { path: "applications/new", element: member(<ApplyPage />) },
      { path: "applications", element: member(<ApplicationsPage />) },
      { path: "applications/:id", element: member(<ApplicationDetail />) },
      { path: "agreements/:id", element: member(<AgreementPage />) },
      { path: "meetings", element: member(<MeetingList />) },
      { path: "investments", element: member(<InvestmentsPage />) },
      {
        path: "investment-discussions",
        element: member(<MeetingList investments />),
      },
      { path: "dashboard", element: member(<Dashboard />) },
      { path: "loans", element: member(<LoansPage />) },
      { path: "loans/:id", element: member(<LoanDetail />) },
      { path: "loans/:id/commission", element: member(<CommissionReview />) },
      {
        path: "loans/:id/payments/new",
        element: member(<LoanDetail payment />),
      },
      {
        path: "loans/:id/documents",
        element: member(<LoanDetail documents />),
      },
      { path: "loans/:id/cases", element: member(<LoanDetail cases />) },
      {
        path: "payments",
        element: member(
          <ResourcePage
            title="Every payment, on record."
            path="/payments"
            recordKey="payments"
          />,
        ),
      },
      {
        path: "people",
        element: member(
          <ResourcePage
            title="People you’re connected with."
            path="/people"
            recordKey="people"
          />,
        ),
      },
      {
        path: "documents",
        element: member(
          <ResourcePage
            title="Your private documents."
            path="/documents"
            recordKey="documents"
            documents
          />,
        ),
      },
      { path: "analytics", element: member(<AnalyticsPage />) },
      { path: "activity", element: member(<ActionCenter />) },
      { path: "saved-offers", element: member(<SavedOffers />) },
      { path: "calendar", element: member(<RepaymentCalendar />) },
      { path: "lender-desk", element: member(<LenderDesk />) },
      { path: "inbox", element: member(<InboxPage />) },
      { path: "members/:handle", element: <MemberProfile /> },
      { path: "profile", element: member(<OwnProfile />) },
      { path: "profile/edit", element: member(<EditProfile />) },
      { path: "profile/contacts", element: member(<ContactSettings />) },
      { path: "profile/co-borrowers", element: member(<CoBorrowersPage />) },
      {
        path: "co-borrowers/invite/:token",
        element: member(<InvitationClaimPage />),
      },
      { path: "profile/appearance", element: member(<ReputationPage />) },
      { path: "profile/badges", element: member(<AchievementsPage />) },
      { path: "badges/:key", element: <BadgeDetail /> },
      { path: "reviews/new", element: member(<ReviewForm />) },
      { path: "verification", element: member(<VerificationPage />) },
      { path: "lender-registration", element: member(<RegistrationPage />) },
      {
        path: "cases",
        element: member(
          <ResourcePage
            title="Your private support cases."
            path="/cases"
            recordKey="cases"
            action={<ActionLink to="/cases/new">Open a case</ActionLink>}
          />,
        ),
      },
      { path: "cases/new", element: member(<NewCase />) },
      { path: "cases/amendments", element: member(<AmendmentsPage />) },
      { path: "cases/amendments/new", element: member(<NewAmendment />) },
      { path: "cases/amendments/:id", element: member(<AmendmentDetail />) },
      { path: "cases/:id", element: member(<CaseDetail />) },
      { path: "learn/contribute", element: member(<ContributionsPage />) },
      { path: "reports/new", element: member(<ReportContentPage />) },
      { path: "reviews", element: member(<OwnReviews />) },
      { path: "reviews/:id/response", element: member(<ReviewResponsePage />) },
      {
        path: "settings/notifications",
        element: member(<NotificationPreferences />),
      },
      { path: "learn", element: <LearningPage /> },
      { path: "help", element: <HelpPage /> },
      { path: "how-it-works", element: <HowItWorksPage /> },
      { path: "leaderboard", element: <Leaderboard /> },
      { path: "leaderboard/members", element: <LeaderboardDirectory /> },
      {
        path: "admin",
        element: (
          <RequireMember staff>
            <Outlet />
          </RequireMember>
        ),
        children: [
          { index: true, element: <Navigate to="queues" replace /> },
          { path: "queues", element: <WorkQueues /> },
          {
            path: "verifications",
            element: <AdminQueue kind="verifications" />,
          },
          {
            path: "verifications/:id",
            element: <AdminDecision kind="verifications" />,
          },
          {
            path: "registrations",
            element: <AdminQueue kind="registrations" />,
          },
          {
            path: "registrations/:id",
            element: <AdminDecision kind="registrations" />,
          },
          { path: "cases", element: <AdminQueue kind="cases" /> },
          { path: "cases/:id", element: <AdminDecision kind="cases" /> },
          {
            path: "reconciliation",
            element: (
              <AdminRecords
                kind="reconciliation"
                title="Reconcile collection and settlement."
              />
            ),
          },
          {
            path: "commissions",
            element: (
              <AdminRecords
                kind="commissions"
                title="One-time commissions, traced."
              />
            ),
          },
          {
            path: "templates",
            element: (
              <AdminRecords
                kind="templates"
                title="Templates and their review evidence."
              />
            ),
          },
          {
            path: "policies",
            element: (
              <AdminRecords
                kind="policies"
                title="Effective policies and activation evidence."
              />
            ),
          },
          {
            path: "audit",
            element: (
              <AdminRecords
                kind="audit"
                title="A traceable operational history."
              />
            ),
          },
          { path: "moderation", element: <ModerationPage /> },
          { path: "reporting", element: <AnalyticsPage admin /> },
        ],
      },
      {
        path: "*",
        element: <NotFoundPage />,
      },
    ],
  },
];
export const router = createBrowserRouter(routes);
