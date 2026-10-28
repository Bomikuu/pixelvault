import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";
import { ErrorPage, NotFoundPage } from "./ErrorPage";
import { Shell } from "./Shell";
import { RequireMember } from "./RequireMember";
import {
  ExplorePage,
  OfferDetail,
  NewOffer,
  ApplyPage,
} from "../features/ExplorePages";
import {
  Dashboard,
  LoansPage,
  ApplicationsPage,
  ApplicationDetail,
  AgreementPage,
  LoanDetail,
  ResourcePage,
  CommissionReview,
} from "../features/WorkspacePages";
import {
  AchievementsPage,
  BadgeDetail,
  EditProfile,
  InboxPage,
  LearningPage,
  MemberProfile,
  OwnProfile,
  ReviewForm,
} from "../features/CommunityPages";
import { AuthPage } from "../features/AuthPages";
import {
  VerificationPage,
  RegistrationPage,
} from "../features/VerificationPages";
import { NewCase, CaseDetail } from "../features/CasesPages";
import { AnalyticsPage } from "../features/ReportingPages";
import {
  AdminDecision,
  AdminQueue,
  AdminRecords,
  ModerationPage,
  WorkQueues,
} from "../features/AdminPages";
import {
  AmendmentsPage,
  NewAmendment,
  AmendmentDetail,
  ContributionsPage,
  ReportContentPage,
  OwnReviews,
  ReviewResponsePage,
  NotificationPreferences,
} from "../features/AdditionalPages";
import { HelpPage } from "../features/HelpPage";
import { HowItWorksPage } from "../features/HowItWorksPage";
import { ActionLink } from "../components";
const member = (element: React.ReactNode) => (
  <RequireMember>{element}</RequireMember>
);
export const routes = [
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
      { path: "offers/new", element: member(<NewOffer />) },
      { path: "offers/:id", element: <OfferDetail /> },
      { path: "applications/new", element: member(<ApplyPage />) },
      { path: "applications", element: member(<ApplicationsPage />) },
      { path: "applications/:id", element: member(<ApplicationDetail />) },
      { path: "agreements/:id", element: member(<AgreementPage />) },
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
      { path: "inbox", element: member(<InboxPage />) },
      { path: "members/:handle", element: <MemberProfile /> },
      { path: "profile", element: member(<OwnProfile />) },
      { path: "profile/edit", element: member(<EditProfile />) },
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
