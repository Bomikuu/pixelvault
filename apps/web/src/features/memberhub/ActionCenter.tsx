import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Bell,
  CalendarClock,
  CheckCheck,
  ChevronRight,
  FileCheck2,
  MessageSquare,
  Wallet,
} from "lucide-react";
import { Button } from "@pixelvault/ui";
import { apiRequest, post } from "../../app/api";
import {
  PageHeading,
  Loading,
  ErrorNotice,
  Empty,
  ActionLink,
} from "../../components";
import { date } from "../../lib/format";
import { hubPanel, useActions } from "./shared";
const icons: Record<string, typeof Bell> = {
  payment: Wallet,
  application: FileCheck2,
  meeting: CalendarClock,
  message: MessageSquare,
};
export function ActionCenter() {
  const query = useActions();
  const [filter, setFilter] = useState("all"),
    [unread, setUnread] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>();
  const rows = (query.data?.actions || []).filter(
    (row) =>
      (filter === "all" || row.kind === filter) && (!unread || !row.read),
  );
  async function mark(keys: string[]) {
    setBusy(true);
    setError(undefined);
    try {
      await post("/hub/actions", { keys });
      await query.refetch();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-5">
      <PageHeading
        title="Your next steps, in one place."
        description="Private updates from your actual records. Read status does not dismiss an obligation."
        action={
          <Button
            variant="outline"
            disabled={busy || !query.data?.unread}
            onClick={() =>
              void mark(
                (query.data?.actions || [])
                  .filter((row) => !row.read)
                  .map((row) => row.key),
              )
            }
          >
            <CheckCheck size={16} />
            Mark displayed read
          </Button>
        }
      />
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="Action filters"
      >
        {[
          ["all", "All updates"],
          ["payment", "Payments"],
          ["application", "Applications"],
          ["meeting", "Meetings"],
          ["verification", "Verification"],
          ["message", "Messages"],
        ].map(([key, name]) => (
          <Button
            key={key}
            variant={key === filter ? "default" : "outline"}
            aria-pressed={key === filter}
            onClick={() => setFilter(key)}
          >
            {name}
          </Button>
        ))}
        <Button
          variant={unread ? "secondary" : "ghost"}
          aria-pressed={unread}
          onClick={() => setUnread(!unread)}
        >
          Unread only
        </Button>
      </div>
      {error !== undefined && <ErrorNotice error={error} />}
      {query.isPending ? (
        <Loading text="Finding your current updates…" />
      ) : query.error ? (
        <ErrorNotice error={query.error} retry={() => void query.refetch()} />
      ) : rows.length ? (
        <section
          className={`${hubPanel} divide-y divide-border p-0!`}
          aria-label="Private updates"
        >
          {rows.map((row) => {
            const Icon = icons[row.kind] || Bell;
            return (
              <article
                className={`flex flex-wrap items-center gap-4 p-4 sm:p-5 ${row.read ? "" : "bg-accent/30"}`}
                key={row.key}
              >
                <Icon className="size-5 shrink-0 text-primary" />
                <Link
                  to={row.href}
                  className="min-w-0 flex-1 text-foreground! hover:text-primary!"
                  onClick={() => {
                    if (!row.read) void mark([row.key]);
                  }}
                >
                  <strong className="flex items-center gap-2 text-sm">
                    {!row.read && (
                      <span
                        className="size-2 shrink-0 rounded-full bg-primary"
                        aria-label="Unread"
                      />
                    )}
                    {row.title}
                  </strong>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {row.detail}
                  </p>
                  <span className="mt-2 block text-xs text-muted-foreground">
                    {date(row.at)}
                    {row.urgent ? " · Needs attention" : ""}
                  </span>
                </Link>
                {!row.read && (
                  <Button
                    variant="ghost"
                    disabled={busy}
                    onClick={() => void mark([row.key])}
                  >
                    Mark read
                  </Button>
                )}
                <ChevronRight className="size-4 text-muted-foreground" />
              </article>
            );
          })}
        </section>
      ) : (
        <Empty
          title={unread ? "You’re caught up." : "No updates in this view."}
          icon={Bell}
          action={
            <ActionLink to="/dashboard" variant="outline">
              Open your overview
            </ActionLink>
          }
        >
          New updates appear when your applications, payments, checks or
          conversations change.
        </Empty>
      )}
      <p className="text-xs leading-relaxed text-muted-foreground">
        Showing up to 200 current updates from recent records. Review your loans
        for current obligations. Completed or no-longer-relevant actions leave
        this list. This center sends no email or SMS.{" "}
        <Link to="/settings/notifications" className="text-primary! underline">
          Reminder preferences
        </Link>
      </p>
    </div>
  );
}
