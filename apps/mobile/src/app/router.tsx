import {
  Component,
  lazy,
  Suspense,
  type ComponentType,
  type ReactNode,
} from "react";
import {
  Navigate,
  Outlet,
  createBrowserRouter,
  useLocation,
} from "react-router-dom";
import { MobileShell, useOnline } from "./MobileShell";
import { useSession } from "./session";
import { Action, Empty, ErrorState, Loading, Page } from "../components/ui";
const screen = (load: () => Promise<Record<string, unknown>>, name: string) =>
  lazy(async () => ({ default: (await load())[name] as ComponentType }));
const Home = screen(() => import("../features/home/HomeScreen"), "HomeScreen");
const Explore = screen(
  () => import("../features/explore/ExploreScreen"),
  "ExploreScreen",
);
const Map = screen(() => import("../features/explore/MapScreen"), "MapScreen");
const Offer = screen(
  () => import("../features/offers/OfferScreen"),
  "OfferScreen",
);
const NewOffer = screen(
  () => import("../features/offers/NewOfferScreen"),
  "NewOfferScreen",
);
const Auth = lazy(() =>
  import("../features/auth/AuthScreen").then((m) => ({
    default: () => <m.AuthScreen />,
  })),
);
const Register = lazy(() =>
  import("../features/auth/AuthScreen").then((m) => ({
    default: () => <m.AuthScreen register />,
  })),
);
const Recovery = screen(
  () => import("../features/auth/AuthScreen"),
  "RecoveryScreen",
);
const VerifyEmail = screen(
  () => import("../features/auth/AuthScreen"),
  "VerifyEmailScreen",
);
const Profile = lazy(() =>
  import("../features/profile/ProfileScreen").then((m) => ({
    default: () => <m.ProfileScreen own />,
  })),
);
const PublicProfile = screen(
  () => import("../features/profile/ProfileScreen"),
  "ProfileScreen",
);
const Settings = screen(
  () => import("../features/profile/ProfileScreen"),
  "ProfileSettings",
);
const Support = screen(
  () => import("../features/profile/SupportScreen"),
  "SupportScreen",
);
const Contacts = screen(
  () => import("../features/profile/PrivateSettings"),
  "ContactScreen",
);
const CoBorrowers = screen(
  () => import("../features/profile/PrivateSettings"),
  "CoBorrowersScreen",
);
const Verification = screen(
  () => import("../features/profile/PrivateSettings"),
  "VerificationScreen",
);
const Learn = screen(
  () => import("../features/profile/PrivateSettings"),
  "LearnScreen",
);
const Leaderboard = lazy(() =>
  import("../features/community/LeaderboardScreen").then((m) => ({
    default: () => <m.LeaderboardScreen />,
  })),
);
const AllLeaders = lazy(() =>
  import("../features/community/LeaderboardScreen").then((m) => ({
    default: () => <m.LeaderboardScreen full />,
  })),
);
const Activity = screen(
  () => import("../features/workspace/MemberTools"),
  "ActivityScreen",
);
const Calendar = screen(
  () => import("../features/workspace/MemberTools"),
  "CalendarScreen",
);
const Saved = screen(
  () => import("../features/workspace/MemberTools"),
  "SavedScreen",
);
const Decisions = screen(
  () => import("../features/workspace/MemberTools"),
  "DecisionsScreen",
);
const Investments = screen(
  () => import("../features/workspace/MemberTools"),
  "InvestmentsScreen",
);
const Loans = lazy(() =>
  import("../features/workspace/WorkspaceScreens").then((m) => ({
    default: () => <m.RecordsScreen kind="loans" />,
  })),
);
const Applications = lazy(() =>
  import("../features/workspace/WorkspaceScreens").then((m) => ({
    default: () => <m.RecordsScreen kind="applications" />,
  })),
);
const Application = screen(
  () => import("../features/workspace/WorkspaceScreens"),
  "ApplicationScreen",
);
const Apply = screen(
  () => import("../features/workspace/WorkspaceScreens"),
  "ApplicationFlow",
);
const Loan = screen(
  () => import("../features/workspace/WorkspaceScreens"),
  "LoanScreen",
);
const Agreement = screen(
  () => import("../features/workspace/WorkspaceScreens"),
  "AgreementScreen",
);
const Inbox = screen(
  () => import("../features/inbox/InboxScreens"),
  "InboxScreen",
);
const Thread = screen(
  () => import("../features/inbox/InboxScreens"),
  "ThreadScreen",
);
const Meetings = screen(
  () => import("../features/meetings/MeetingScreens"),
  "MeetingsScreen",
);
const Lobby = screen(
  () => import("../features/meetings/MeetingScreens"),
  "MeetingLobby",
);
const Room = screen(
  () => import("../features/meetings/MeetingScreens"),
  "MeetingRoom",
);
function Private() {
  const online = useOnline();
  const { session, loading, error, refresh } = useSession(),
    location = useLocation();
  if (!online)
    return (
      <Page title="Reconnect to your private records.">
        <Empty title="Your records need a current connection.">
          Reconnect to refresh your account and its latest obligations. No
          changes are queued offline.
        </Empty>
      </Page>
    );
  if (loading) return <Loading />;
  if (error)
    return (
      <Page title="Reconnect to your account.">
        <ErrorState error={error} retry={refresh} />
      </Page>
    );
  return session?.member ? (
    <Outlet />
  ) : (
    <Navigate
      to="/sign-in"
      replace
      state={{ from: location.pathname + location.search }}
    />
  );
}
class ScreenBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <Page title="Let’s try that page again.">
        <Empty
          title="This page couldn’t open."
          action={<Action to="/explore">Explore community</Action>}
        >
          Your records stay on the server. Reload the page to try again.
        </Empty>
      </Page>
    ) : (
      this.props.children
    );
  }
}
function Root() {
  const location = useLocation();
  return (
    <ScreenBoundary key={location.pathname}>
      <Suspense fallback={<Loading />}>
        <MobileShell />
      </Suspense>
    </ScreenBoundary>
  );
}
export const router = createBrowserRouter(
  [
    {
      element: <Root />,
      children: [
        { path: "explore", element: <Explore /> },
        { path: "map", element: <Map /> },
        { path: "offers/:offerId", element: <Offer /> },
        { path: "leaderboard", element: <Leaderboard /> },
        { path: "leaderboard/all", element: <AllLeaders /> },
        { path: "members/:handle", element: <PublicProfile /> },
        { path: "sign-in", element: <Auth /> },
        { path: "register", element: <Register /> },
        { path: "forgot-password", element: <Recovery /> },
        { path: "reset-password/:recoveryId", element: <Recovery /> },
        { path: "verify-email/:memberId", element: <VerifyEmail /> },
        {
          element: <Private />,
          children: [
            { index: true, element: <Home /> },
            { path: "profile", element: <Profile /> },
            { path: "settings", element: <Settings /> },
            { path: "contacts", element: <Contacts /> },
            { path: "help", element: <Support /> },
            { path: "help/:caseId", element: <Support /> },
            { path: "co-borrowers", element: <CoBorrowers /> },
            { path: "co-borrowers/invite/:token", element: <CoBorrowers /> },
            { path: "verification", element: <Verification /> },
            { path: "learn", element: <Learn /> },
            { path: "activity", element: <Activity /> },
            { path: "calendar", element: <Calendar /> },
            { path: "saved", element: <Saved /> },
            { path: "decisions", element: <Decisions /> },
            { path: "investments", element: <Investments /> },
            { path: "offers/new", element: <NewOffer /> },
            { path: "offers/:offerId/apply", element: <Apply /> },
            { path: "applications", element: <Applications /> },
            { path: "applications/:applicationId", element: <Application /> },
            { path: "loans", element: <Loans /> },
            { path: "loans/:loanId", element: <Loan /> },
            { path: "agreements/:agreementId", element: <Agreement /> },
            { path: "inbox", element: <Inbox /> },
            { path: "inbox/:threadId", element: <Thread /> },
            { path: "meetings", element: <Meetings /> },
            { path: "meetings/:meetingId", element: <Lobby /> },
            { path: "meetings/:meetingId/room", element: <Room /> },
          ],
        },
        {
          path: "*",
          element: (
            <Page title="Let’s find your next step.">
              <Empty
                title="This page isn’t available."
                action={<Action to="/explore">Explore community</Action>}
              >
                The link may have changed. Your community is one tap away.
              </Empty>
            </Page>
          ),
        },
      ],
    },
  ],
  { basename: import.meta.env.BASE_URL || "/" },
);
