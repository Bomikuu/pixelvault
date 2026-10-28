import { MeetingGateway } from "./MeetingGateway";
import { legacyThemeClasses } from "../../app/ThemeToggle";
import { useSession } from "../../app/session";
import { Link } from "react-router-dom";

export function MeetingLayout() {
  const { session } = useSession();
  return (
    <div
      className={`flex h-dvh w-full min-w-0 flex-col overflow-hidden bg-background text-foreground ${legacyThemeClasses}`}
    >
      <a className="skip-link" href="#main-content">
        Skip to meeting
      </a>
      {session?.member?.suspended && (
        <p className="shrink-0 border-b border-border bg-accent px-4 py-2 text-xs">
          New borrowing is restricted. Your records remain accessible.{" "}
          <Link to="/cases/new" className="font-bold underline!">
            Contact support
          </Link>
        </p>
      )}
      <main
        id="main-content"
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-5 lg:overflow-hidden"
      >
        <MeetingGateway />
      </main>
    </div>
  );
}
