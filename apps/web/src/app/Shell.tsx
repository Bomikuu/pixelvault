import { useState } from "react";
import { NavLink, Outlet, Link, useLocation } from "react-router-dom";
import {
  ArrowUpRight,
  Bell,
  BookOpen,
  CalendarClock,
  ChartNoAxesCombined,
  CircleHelp,
  Compass,
  FileCheck2,
  FileText,
  HandCoins,
  LayoutDashboard,
  LogIn,
  Menu,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Settings2,
  ShieldCheck,
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@pixelvault/ui";
import { useSession } from "./session";
import { ActionLink, ErrorNotice, Loading, MemberAvatar } from "../components";
import { legacyThemeClasses, ThemeToggle } from "./ThemeToggle";
import { SignOutButton } from "./SignOutButton";
const community = [
  ["/explore", "Explore offers", Compass],
  ["/how-it-works", "How it works", BookOpen],
  ["/leaderboard", "Leaderboard", Trophy],
  ["/offers/new", "Post an offer", Plus],
  ["/meetings", "Meeting rooms", CalendarClock],
  ["/inbox", "Messages", MessageSquare],
] as const;
const workspace = [
  ["/dashboard", "Overview", LayoutDashboard],
  ["/applications", "Applications", FileCheck2],
  ["/loans", "My loans", HandCoins],
  ["/payments", "Payments", Wallet],
  ["/people", "My connections", Users],
  ["/documents", "Documents", FileText],
  ["/investments", "Investments", HandCoins],
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
  const { session, loading, error } = useSession();
  const location = useLocation();
  const [menu, setMenu] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem("pixelvault-sidebar-collapsed") === "true";
    } catch {
      return false;
    }
  });
  const member = session?.member;
  const isAdmin = location.pathname.startsWith("/admin") && !!member?.is_staff;
  const visibleCommunity = member
    ? community
    : community.filter(
        ([path]) => !["/offers/new", "/meetings", "/inbox"].includes(path),
      );
  const active = [
    "/explore",
    "/offers",
    "/members",
    "/how-it-works",
    "/leaderboard",
    "/learn",
    "/meetings",
  ].some((path) => location.pathname.startsWith(path))
    ? "community"
    : "workspace";
  function toggleSidebar() {
    setCollapsed((value) => {
      try {
        localStorage.setItem("pixelvault-sidebar-collapsed", String(!value));
      } catch {
        /* Session choice remains available. */
      }
      return !value;
    });
  }
  const navigation = (compact: boolean, mobile = false) => (
    <>
      <div
        className={`flex h-20 shrink-0 items-center ${compact ? "justify-center px-3" : "justify-between px-5"}`}
      >
        <Link
          to="/explore"
          aria-label="PixelVault home"
          onClick={() => setMenu(false)}
        >
          <BrandMark
            compact={compact}
            className="dark:[&_.brand-word]:text-foreground!"
          />
        </Link>
        {mobile && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Close navigation"
            onClick={() => setMenu(false)}
          >
            <X />
          </Button>
        )}
      </div>
      <nav
        id={mobile ? "mobile-navigation" : "desktop-navigation"}
        className="min-h-0 flex-1 overflow-y-auto px-3 pb-4"
        aria-label={isAdmin ? "Administration" : "Main navigation"}
      >
        {(isAdmin
          ? [["Administration", admin]]
          : [
              ["Discover", visibleCommunity],
              ...(member ? [["Your workspace", workspace]] : []),
            ]
        ).map(([heading, items]) => (
          <div className="mt-5 first:mt-2" key={String(heading)}>
            <p
              className={`mb-2! px-3 text-[10px] font-extrabold tracking-widest text-muted-foreground uppercase ${compact ? "sr-only" : ""}`}
            >
              {String(heading)}
            </p>
            {(items as typeof community | typeof workspace | typeof admin).map(
              ([path, name, Icon]) => {
                const item = (
                  <NavLink
                    key={path}
                    to={path}
                    end={path === "/dashboard"}
                    aria-label={compact ? name : undefined}
                    onClick={() => setMenu(false)}
                    className={({ isActive }) =>
                      `relative my-1 flex min-h-11 items-center gap-3 rounded-xl px-3 text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-ring ${compact ? "justify-center" : ""} ${isActive ? "bg-accent text-primary! shadow-[inset_0_0_0_1px_var(--color-border)]" : "text-muted-foreground! hover:bg-muted hover:text-foreground!"}`
                    }
                  >
                    <Icon className="size-[18px] shrink-0" aria-hidden="true" />
                    {!compact && <span>{name}</span>}
                  </NavLink>
                );
                return compact ? (
                  <Tooltip key={path}>
                    <TooltipTrigger asChild>{item}</TooltipTrigger>
                    <TooltipContent side="right">{name}</TooltipContent>
                  </Tooltip>
                ) : (
                  item
                );
              },
            )}
          </div>
        ))}
      </nav>
      <div className="shrink-0 border-t border-border p-3">
        {!compact && (
          <Link
            to="/learn"
            onClick={() => setMenu(false)}
            className="mb-3 flex items-start gap-3 rounded-xl bg-accent p-3 text-foreground! transition-colors hover:bg-muted"
          >
            <BookOpen
              className="mt-0.5 size-5 shrink-0 text-primary"
              aria-hidden="true"
            />
            <span>
              <strong className="block text-xs">
                Build your next chapter.
              </strong>
              <span className="mt-1 block text-[11px] leading-relaxed text-muted-foreground">
                Visit the learning room{" "}
                <ArrowUpRight className="inline size-3" />
              </span>
            </span>
          </Link>
        )}
        {member?.is_staff && (
          <Link
            title="Administration"
            aria-label="Administration"
            to={isAdmin ? "/dashboard" : "/admin/queues"}
            className="flex min-h-11 items-center justify-center gap-3 rounded-xl text-xs text-muted-foreground! hover:bg-accent"
          >
            <Settings2 size={18} />
            {!compact && (isAdmin ? "Member workspace" : "Administration")}
          </Link>
        )}
        <Link
          to="/help"
          onClick={() => setMenu(false)}
          aria-label="Help & private support"
          title="Help & private support"
          className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-xs font-semibold text-muted-foreground! hover:bg-accent ${compact ? "justify-center" : ""}`}
        >
          <CircleHelp size={18} />
          {!compact && "Help & private support"}
        </Link>
        <Link
          to={member ? "/profile" : "/sign-in"}
          onClick={() => setMenu(false)}
          aria-label={member ? "My profile" : "Sign in"}
          className={`mt-2 flex items-center gap-3 rounded-xl p-2 text-foreground! hover:bg-accent ${compact ? "justify-center" : ""}`}
        >
          <MemberAvatar
            name={member?.display_name || "Guest"}
            avatarKey={member?.avatar_key}
            reputation={member?.community_reputation}
            photoUrl={member?.photo_url}
            size={36}
          />
          {!compact && (
            <span className="min-w-0">
              <strong className="block truncate text-xs">
                {member?.display_name || "Welcome to PixelVault"}
              </strong>
              <span className="mt-1 block text-[10px] text-muted-foreground">
                {member ? "Personal account" : "Sign in to your community"}
              </span>
            </span>
          )}
        </Link>
      </div>
    </>
  );
  return (
    <div
      className={`min-h-dvh bg-background text-foreground ${legacyThemeClasses} ${location.pathname === "/explore" && new URLSearchParams(location.search).get("view") !== "list" ? "is-map-workspace" : ""}`}
    >
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <aside
        className={`fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-border bg-card transition-[width] duration-300 ease-out motion-reduce:transition-none lg:flex ${collapsed ? "w-20" : "w-[244px]"}`}
      >
        {navigation(collapsed)}
      </aside>
      <Dialog open={menu} onOpenChange={setMenu}>
        <DialogContent
          className="mobile-drawer flex! flex-col! bg-card! p-0!"
          aria-describedby={undefined}
          showCloseButton={false}
        >
          <DialogTitle className="sr-only">Navigation</DialogTitle>
          {navigation(false, true)}
        </DialogContent>
      </Dialog>
      <div
        className={`flex min-h-dvh min-w-0 flex-col pb-16 transition-[margin-left] duration-300 ease-out motion-reduce:transition-none lg:pb-0 ${collapsed ? "lg:ml-20" : "lg:ml-[244px]"}`}
      >
        <div className="flex min-h-7 flex-wrap items-center justify-center gap-x-2 gap-y-1 border-b border-border bg-accent px-3 py-1 text-center text-[10px] text-muted-foreground">
          <span
            className="size-1.5 rounded-full bg-primary"
            aria-hidden="true"
          />
          <strong>Test environment</strong>
          <span>Synthetic community. No real funds move.</span>
          <Link className="hidden text-primary! sm:inline" to="/help#test-mode">
            About test mode <ArrowUpRight className="inline size-3" />
          </Link>
        </div>
        <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-3 border-b border-border bg-card px-4 py-3 lg:px-6">
          <div className="flex items-center gap-3">
            <Button
              size="icon"
              variant="ghost"
              className="hidden! lg:inline-flex!"
              aria-label={
                collapsed ? "Expand navigation" : "Collapse navigation"
              }
              aria-expanded={!collapsed}
              aria-controls="desktop-navigation"
              onClick={toggleSidebar}
            >
              {collapsed ? (
                <PanelLeftOpen size={20} />
              ) : (
                <PanelLeftClose size={20} />
              )}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="lg:hidden!"
              aria-label="Open navigation"
              onClick={() => setMenu(true)}
            >
              <Menu />
            </Button>
            {member && (
              <nav
                aria-label="Platform area"
                className="hidden items-center gap-1 rounded-2xl border border-border bg-muted p-1 sm:flex"
              >
                {[
                  {
                    to: "/explore",
                    label: "Community",
                    Icon: Users,
                    selected: active === "community" && !isAdmin,
                  },
                  {
                    to: "/dashboard",
                    label: "My dashboard",
                    Icon: LayoutDashboard,
                    selected: active === "workspace" && !isAdmin,
                  },
                ].map(({ to, label, Icon, selected }) => (
                  <Link
                    key={to}
                    to={to}
                    aria-current={selected ? "true" : undefined}
                    className={`flex min-h-10 items-center gap-2 rounded-xl px-4 text-xs font-extrabold transition-[background-color,color,box-shadow] ${selected ? "bg-primary text-primary-foreground! shadow-sm" : "text-muted-foreground! hover:bg-card hover:text-foreground!"}`}
                  >
                    <Icon size={16} aria-hidden="true" />
                    {label}
                  </Link>
                ))}
              </nav>
            )}
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <ThemeToggle />
            {member ? (
              <>
                <Link
                  to="/verification"
                  className="hidden min-h-10 items-center gap-2 rounded-xl px-3 text-xs font-bold text-foreground! hover:bg-accent xl:flex"
                >
                  <ShieldCheck size={16} />
                  Verification center
                </Link>
                <Button asChild variant="ghost" size="icon">
                  <Link to="/inbox" aria-label="Open messages">
                    <Bell size={19} />
                  </Link>
                </Button>

                <Link to="/profile" aria-label="My profile">
                  <MemberAvatar
                    name={member.display_name}
                    avatarKey={member.avatar_key}
                    reputation={member.community_reputation}
                    photoUrl={member.photo_url}
                    size={34}
                  />
                </Link>
                <SignOutButton />
              </>
            ) : (
              <ActionLink to="/sign-in" variant="outline">
                Sign in
              </ActionLink>
            )}
          </div>
          {member && (
            <nav
              aria-label="Platform area"
              className="flex w-full items-center gap-1 rounded-2xl border border-border bg-muted p-1 sm:hidden"
            >
              {[
                {
                  to: "/explore",
                  label: "Community",
                  Icon: Users,
                  selected: active === "community" && !isAdmin,
                },
                {
                  to: "/dashboard",
                  label: "My dashboard",
                  Icon: LayoutDashboard,
                  selected: active === "workspace" && !isAdmin,
                },
              ].map(({ to, label, Icon, selected }) => (
                <Link
                  key={to}
                  to={to}
                  aria-current={selected ? "true" : undefined}
                  className={`flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl px-2 text-xs font-extrabold transition-colors ${selected ? "bg-primary text-primary-foreground! shadow-sm" : "text-muted-foreground! hover:bg-card"}`}
                >
                  <Icon size={16} aria-hidden="true" />
                  {label}
                </Link>
              ))}
            </nav>
          )}
        </header>
        <main
          id="main-content"
          className="main-content max-w-none! px-4! py-6! lg:px-6!"
        >
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
        <footer className="flex flex-wrap justify-between gap-3 border-t border-border px-4 py-5 text-[11px] text-muted-foreground lg:px-6">
          <span>PixelVault · Borrow today. Build tomorrow.</span>
          <Link to="/help#privacy">Privacy & community guidelines</Link>
        </footer>
      </div>
      <nav
        className="fixed inset-x-0 bottom-0 z-30 grid h-16 grid-cols-4 border-t border-border bg-card lg:hidden"
        aria-label="Mobile navigation"
      >
        {(member
          ? ([
              ["/explore", "Explore", Compass],
              ["/dashboard", "Dashboard", LayoutDashboard],
              ["/inbox", "Inbox", MessageSquare],
              ["/profile", "Profile", Users],
            ] as const)
          : ([
              ["/explore", "Explore", Compass],
              ["/leaderboard", "Leaderboard", Trophy],
              ["/learn", "Learn", BookOpen],
              ["/sign-in", "Sign in", LogIn],
            ] as const)
        ).map(([to, label, Icon]) => (
          <NavLink
            key={String(to)}
            to={String(to)}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 text-[10px] font-bold transition-colors hover:bg-accent ${isActive ? "text-primary!" : "text-muted-foreground!"}`
            }
          >
            <Icon size={20} aria-hidden="true" />
            <span>{String(label)}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
