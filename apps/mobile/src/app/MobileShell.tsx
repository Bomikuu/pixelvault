import { useEffect, useState, type MouseEvent } from "react";
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  Activity,
  Bell,
  Compass,
  Home,
  MessageCircle,
  Moon,
  Sun,
  UserRound,
  WifiOff,
  LogOut,
} from "lucide-react";
import {
  BrandMark,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@pixelvault/ui";
import { IconButton, PersonAvatar, Note } from "../components/ui";
import { useSession } from "./session";
export function useOnline() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return online;
}
export function ThemeToggle() {
  const [dark, setDark] = useState(
    document.documentElement.classList.contains("dark"),
  );
  function change(event: MouseEvent<HTMLButtonElement>) {
    const next = !dark;
    const apply = () => {
      document.documentElement.classList.toggle("dark", next);
      localStorage.setItem("pixelvault-mobile-theme", next ? "dark" : "light");
      setDark(next);
    };
    const doc = document as Document & {
      startViewTransition?: (change: () => void) => { ready: Promise<void> };
    };
    if (
      !doc.startViewTransition ||
      matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return apply();
    const x = event.clientX || innerWidth / 2,
      y = event.clientY || 24;
    const end = Math.hypot(
      Math.max(x, innerWidth - x),
      Math.max(y, innerHeight - y),
    );
    const transition = doc.startViewTransition(apply);
    void transition.ready
      .then(() =>
        document.documentElement.animate(
          {
            clipPath: [
              `circle(0px at ${x}px ${y}px)`,
              `circle(${end}px at ${x}px ${y}px)`,
            ],
          },
          {
            duration: 360,
            easing: "ease-out",
            pseudoElement: "::view-transition-new(root)",
          },
        ),
      )
      .catch(() => {});
  }
  return (
    <IconButton
      label={dark ? "Use light mode" : "Use dark mode"}
      onClick={change}
    >
      {dark ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </IconButton>
  );
}
export function LogoutButton() {
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const { signOut } = useSession();
  const navigate = useNavigate();
  return (
    <>
      <Button
        variant="outline"
        className="min-h-12 w-full"
        onClick={() => setOpen(true)}
      >
        <LogOut />
        Sign out
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>Sign out of PixelVault?</DialogTitle>
          <DialogDescription>
            Your private records will be cleared from this session. You can sign
            in again whenever you need them.
          </DialogDescription>
          {error && <Note danger>{error}</Note>}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setOpen(false)}
              disabled={busy}
            >
              Stay signed in
            </Button>
            <Button
              className="flex-1"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  await signOut();
                  setOpen(false);
                  navigate("/explore", { replace: true });
                } catch (e) {
                  setError(
                    e instanceof Error
                      ? e.message
                      : "Sign out failed. Try again.",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Signing out…" : "Sign out"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
const destinations = [
  ["/", "Home", Home],
  ["/explore", "Explore", Compass],
  ["/activity", "Activity", Activity],
  ["/inbox", "Inbox", MessageCircle],
  ["/profile", "Profile", UserRound],
] as const;
export function MobileShell() {
  const { session, loading } = useSession();
  const { pathname } = useLocation();
  const online = useOnline();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);
  const fullscreen = /^\/(meetings\/[^/]+\/room|inbox\/[^/]+|map)$/.test(
    pathname,
  );
  return (
    <div
      className={`${fullscreen ? "" : "mx-auto max-w-xl border-x border-border"} min-h-dvh bg-background text-foreground`}
    >
      <a
        href="#mobile-content"
        className="sr-only z-[100] rounded-lg bg-primary p-3 text-primary-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Skip to content
      </a>
      {!fullscreen && (
        <>
          <div className="bg-secondary px-4 py-1.5 text-center text-[11px] leading-relaxed text-secondary-foreground">
            {session?.environment === "live"
              ? "Live origination remains disabled"
              : "Test mode. Synthetic records; no real funds move."}
          </div>
          <header className="sticky top-0 z-30 flex min-h-17 items-center justify-between gap-3 border-b border-border bg-card px-5 pt-[env(safe-area-inset-top)]">
            <Link
              to="/explore"
              aria-label="PixelVault community"
              className="flex items-center gap-2.5"
            >
              <span className="[&_svg]:h-8 [&_svg]:w-7">
                <BrandMark compact />
              </span>
              <span className="text-lg font-extrabold tracking-tight">
                Pixel<span className="text-primary">Vault</span>
              </span>
            </Link>
            <div className="flex items-center gap-1">
              <ThemeToggle />
              {loading ? (
                <span
                  className="size-9 rounded-full bg-muted motion-safe:animate-pulse"
                  aria-label="Loading your session"
                />
              ) : session?.member ? (
                <Link
                  to="/profile"
                  aria-label="Open your profile"
                  className="rounded-full"
                >
                  <PersonAvatar person={session.member} size={36} />
                </Link>
              ) : (
                <Button asChild variant="outline" className="min-h-11">
                  <Link to="/sign-in">Sign in</Link>
                </Button>
              )}
            </div>
          </header>
        </>
      )}
      {!online && (
        <div
          role="status"
          className="sticky top-17 z-30 flex items-center gap-2 bg-muted px-5 py-3 text-xs text-muted-foreground"
        >
          <WifiOff className="size-4" />
          You’re offline. Reconnect to refresh records or make changes.
        </div>
      )}
      <div
        id="mobile-content"
        tabIndex={-1}
        className={`${fullscreen ? "" : "pb-[calc(6rem+env(safe-area-inset-bottom))]"} outline-none`}
      >
        <Outlet />
      </div>
      {!fullscreen && (
        <nav
          aria-label="Main navigation"
          className="fixed right-0 bottom-0 left-0 z-40 mx-auto flex max-w-xl justify-around border-t border-border bg-card px-2 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        >
          {destinations.map(([to, name, Icon]) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `flex min-h-14 min-w-14 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 text-xs font-semibold transition-colors hover:bg-muted focus-visible:outline-2 ${isActive ? "bg-secondary text-primary" : "text-muted-foreground"}`
              }
            >
              <Icon className="size-5" strokeWidth={1.8} />
              {name}
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  );
}
