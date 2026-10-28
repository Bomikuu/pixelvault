import { useState } from "react";
import {
  NavLink,
  Outlet,
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  ArrowLeftRight,
  ArrowUpRight,
  Bell,
  BookOpen,
  ChartNoAxesCombined,
  ChevronDown,
  CircleHelp,
  Compass,
  FileCheck2,
  FileText,
  HandCoins,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  MessageSquare,
  PanelLeftClose,
  Plus,
  Settings2,
  ShieldCheck,
  Sparkles,
  Users,
  Trophy,
  Wallet,
  X,
} from "lucide-react";
import {
  BrandMark,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@pixelvault/ui";
import { useSession } from "./session";
import { ActionLink, ErrorNotice, Loading, MemberAvatar } from "../components";
const community = [
  ["/explore", "Explore offers", Compass],
  ["/how-it-works", "How it works", BookOpen],
  ["/leaderboard", "Leaderboard", Trophy],
  ["/offers/new", "Post an offer", Plus],
  ["/inbox", "Messages", MessageSquare],
] as const;
const workspace = [
  ["/dashboard", "Overview", LayoutDashboard],
  ["/applications", "Applications", FileCheck2],
  ["/loans", "My loans", HandCoins],
  ["/payments", "Payments", Wallet],
  ["/people", "My connections", Users],
  ["/documents", "Documents", FileText],
  ["/analytics", "Analytics", ChartNoAxesCombined],
] as const;
const admin = [
  ["/admin/queues", "Work queues", LayoutDashboard],
  ["/admin/verifications", "Verification", ShieldCheck],
  ["/admin/registrations", "Lender registration", FileCheck2],
  ["/admin/cases", "Private cases", MessageSquare],
  ["/admin/reconciliation", "Reconciliation", Wallet],
  ["/admin/commissions", "Commissions", ChartNoAxesCombined],
  ["/admin/templates", "Templates & policies", FileText],
  ["/admin/moderation", "Community moderation", MessageSquare],
  ["/admin/reporting", "Reporting", ChartNoAxesCombined],
  ["/admin/audit", "Audit history", BookOpen],
] as const;
export function Shell() {
  const { session, loading, error, signOut } = useSession();
  const location = useLocation(),
    navigate = useNavigate();
  const [menu, setMenu] = useState(false);
  const member = session?.member;
  const isAdmin = location.pathname.startsWith("/admin");
  const active =
    location.pathname.startsWith("/explore") ||
    location.pathname.startsWith("/offers") ||
    location.pathname.startsWith("/members") ||
    location.pathname.startsWith("/how-it-works") ||
    location.pathname.startsWith("/leaderboard")
      ? "community"
      : "workspace";
  const navigation = (
    <>
      <div className="sidebar-top">
        <Link to="/explore" aria-label="PixelVault home">
          <BrandMark />
        </Link>
        <Button
          variant="ghost"
          size="icon"
          className="mobile-only"
          aria-label="Close navigation"
          onClick={() => setMenu(false)}
        >
          <X />
        </Button>
      </div>
      <div className="area-switch">
        <NavLink
          to="/explore"
          className={active === "community" && !isAdmin ? "selected" : ""}
        >
          Community
        </NavLink>
        <NavLink
          to="/dashboard"
          className={active === "workspace" && !isAdmin ? "selected" : ""}
        >
          My dashboard
        </NavLink>
      </div>
      <nav aria-label={isAdmin ? "Administration" : "Main navigation"}>
        {(isAdmin
          ? [["Administration", admin]]
          : [
              ["DISCOVER", community],
              ["YOUR WORKSPACE", workspace],
            ]
        ).map(([heading, items]) => (
          <div className="nav-group" key={String(heading)}>
            <p>{String(heading)}</p>
            {(items as typeof community | typeof workspace | typeof admin).map(
              ([path, name, Icon]) => (
                <NavLink
                  key={path}
                  to={path}
                  end={path === "/dashboard"}
                  onClick={() => setMenu(false)}
                  className={({ isActive }) =>
                    `nav-item ${isActive ? "active" : ""}`
                  }
                >
                  <Icon size={18} />
                  <span>{name}</span>
                  {name === "Explore offers" && (
                    <span className="nav-indicator" />
                  )}
                </NavLink>
              ),
            )}
          </div>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <div className="learning-teaser">
          <span className="learning-icon">
            <BookOpen size={19} />
          </span>
          <strong>Build your next chapter.</strong>
          <p>A little knowledge makes a meaningful difference.</p>
          <Link to="/learn" onClick={() => setMenu(false)}>
            Visit the learning room <ArrowUpRight size={14} />
          </Link>
        </div>
        {member?.is_staff && (
          <NavLink
            className="nav-item"
            to={isAdmin ? "/dashboard" : "/admin/queues"}
          >
            <Settings2 size={18} />
            {isAdmin ? "Member workspace" : "Administration"}
            <ArrowUpRight size={14} />
          </NavLink>
        )}
        <Link className="nav-item help-link" to="/help">
          <CircleHelp size={18} />
          Help & private support
        </Link>
        <Link
          className="sidebar-profile"
          to={member ? "/profile" : "/sign-in"}
          onClick={() => setMenu(false)}
        >
          <MemberAvatar
            name={member?.display_name || "Guest"}
            avatarKey={member?.avatar_key}
            reputation={member?.community_reputation}
          />
          <div>
            <strong>{member?.display_name || "Welcome to PixelVault"}</strong>
            <small>
              {member ? "Personal account" : "Sign in to your community"}
            </small>
          </div>
          <ChevronDown size={15} />
        </Link>
      </div>
    </>
  );
  return (
    <div
      className={`app-shell ${location.pathname === "/explore" && new URLSearchParams(location.search).get("view") !== "list" ? "is-map-workspace" : ""}`}
    >
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <aside className="sidebar">{navigation}</aside>
      <Dialog open={menu} onOpenChange={setMenu}>
        <DialogContent className="mobile-drawer" aria-describedby={undefined}>
          <DialogTitle className="sr-only">Navigation</DialogTitle>
          {navigation}
        </DialogContent>
      </Dialog>
      <div className="app-body">
        <div className="environment-strip">
          <span className="environment-dot" />
          <strong>Test environment</strong>
          <span>Synthetic community. No real funds move.</span>
          <Link to="/help#test-mode">
            About test mode <ArrowUpRight size={12} />
          </Link>
        </div>
        <header className="topbar">
          <div className="topbar-title">
            <Button
              size="icon"
              variant="ghost"
              className="mobile-only"
              aria-label="Open navigation"
              onClick={() => setMenu(true)}
            >
              <Menu />
            </Button>
            <span>
              {isAdmin
                ? "Operations"
                : active === "community"
                  ? "Your lending community"
                  : "Your private workspace"}
            </span>
          </div>
          <div className="topbar-actions">
            <Link to="/verification" className="verification-link">
              <ShieldCheck size={16} />
              Verification center
            </Link>
            <Link className="icon-link" to="/inbox" aria-label="Open messages">
              <Bell size={19} />
            </Link>
            {member ? (
              <>
                <MemberAvatar
                  name={member.display_name}
                  avatarKey={member.avatar_key}
                  reputation={member.community_reputation}
                  className="topbar-avatar"
                  size={34}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Sign out"
                  onClick={async () => {
                    await signOut();
                    navigate("/explore");
                  }}
                >
                  <LogOut size={17} />
                </Button>
              </>
            ) : (
              <ActionLink to="/sign-in" variant="outline">
                Sign in
              </ActionLink>
            )}
          </div>
        </header>
        <main id="main-content" className="main-content">
          {error && <ErrorNotice error={error} />}
          {loading ? (
            <Loading text="Connecting to your community…" />
          ) : (
            <>
              {member?.suspended && (
                <div className="suspension-banner">
                  New borrowing is restricted. Your repayments, documents and
                  private support remain available.{" "}
                  <Link to="/cases/new">Contact support</Link>
                </div>
              )}
              <Outlet />
            </>
          )}
        </main>
        <footer className="app-footer">
          <span>
            PixelVault <span aria-hidden="true">·</span> Borrow today. Build
            tomorrow.
          </span>
          <Link to="/help#privacy">Privacy & community guidelines</Link>
        </footer>
      </div>
      <nav className="mobile-bottom" aria-label="Mobile navigation">
        <NavLink to="/explore">
          <Compass size={20} />
          <span>Explore</span>
        </NavLink>
        <NavLink to="/dashboard">
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </NavLink>
        <NavLink to="/inbox">
          <MessageSquare size={20} />
          <span>Inbox</span>
        </NavLink>
        <NavLink to="/profile">
          <Users size={20} />
          <span>Profile</span>
        </NavLink>
      </nav>
    </div>
  );
}
