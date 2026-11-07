import { useSearchParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Clock3, FileCheck2, ArrowRight, CalendarClock } from "lucide-react";
import type { Person } from "@pixelvault/contracts";
import { Button } from "@pixelvault/ui";
import { apiRequest } from "../../app/api";
import { useSession } from "../../app/session";
import {
  PageHeading,
  Loading,
  ErrorNotice,
  Empty,
  ActionLink,
  PersonName,
  Status,
} from "../../components";
import { money, date } from "../../lib/format";
import { meetingTime } from "../negotiations/MeetingList";
import { hubPanel } from "./shared";
interface ApplicationRow {
  id: string;
  title: string;
  offer_title: string;
  borrower: Person;
  amount: string;
  status: string;
  created_at: string;
  reservation_expires_at: string | null;
  offer_expires_at: string;
  href: string;
}
export function LenderDesk() {
  const { session } = useSession();
  const [params, setParams] = useSearchParams();
  const filter = params.get("status") || "all";
  const query = useQuery({
    queryKey: ["lender-desk", session?.member?.id],
    queryFn: () =>
      apiRequest<{
        applications: ApplicationRow[];
        meetings: {
          id: string;
          person: Person;
          title: string;
          scheduled_at: string | null;
          href: string;
        }[];
        limit: number;
        server_time: string;
      }>("/hub/decisions"),
    refetchInterval: 15000,
    refetchIntervalInBackground: false,
  });
  const rows = (query.data?.applications || [])
    .filter((row) => filter === "all" || row.status === filter)
    .sort(
      (a, b) =>
        (a.reservation_expires_at || "9999").localeCompare(
          b.reservation_expires_at || "9999",
        ) || a.created_at.localeCompare(b.created_at),
    );
  return (
    <div className="space-y-6">
      <PageHeading
        title="Your lending decisions."
        description="Review private applications, time-limited reservations and meeting follow-ups. Every decision stays yours."
        action={
          <ActionLink to="/offers/new" variant="outline">
            Post an offer
          </ActionLink>
        }
      />
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="Application status"
      >
        {[
          ["all", "All open"],
          ["submitted", "New requests"],
          ["reviewing", "In review"],
          ["selected", "Reserved"],
        ].map(([key, name]) => (
          <Button
            key={key}
            variant={filter === key ? "default" : "outline"}
            aria-pressed={filter === key}
            onClick={() => setParams({ status: key })}
          >
            {name}
          </Button>
        ))}
      </div>
      {query.isPending ? (
        <Loading text="Finding your lending decisions…" />
      ) : query.error ? (
        <ErrorNotice error={query.error} retry={() => void query.refetch()} />
      ) : (
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <section
            className={`${hubPanel} p-0!`}
            aria-label="Applications to review"
          >
            {rows.length ? (
              rows.map((row) => (
                <article
                  key={row.id}
                  className="space-y-3 border-b border-border p-4 last:border-0 sm:p-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <PersonName person={row.borrower} />
                    <Status value={row.status} />
                  </div>
                  <Link
                    to={row.href}
                    className="block text-base font-bold text-foreground! hover:text-primary!"
                  >
                    {row.title}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {row.offer_title}
                  </p>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <strong className="text-lg tabular-nums">
                      {money(row.amount)}
                    </strong>
                    <Link
                      to={row.href}
                      className="flex min-h-11 items-center gap-2 text-sm font-bold text-primary!"
                    >
                      Review application
                      <ArrowRight size={16} />
                    </Link>
                  </div>
                  {row.reservation_expires_at && (
                    <p className="flex items-start gap-2 rounded-lg bg-accent p-3 text-sm text-accent-foreground">
                      <Clock3 className="mt-0.5 size-4 shrink-0" />
                      {Date.parse(row.reservation_expires_at) <
                      Date.parse(query.data!.server_time)
                        ? "Reservation time has passed. Open the application for its current status."
                        : `Reservation expires ${meetingTime(row.reservation_expires_at)}.`}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Received {date(row.created_at)} · Offer expires{" "}
                    {date(row.offer_expires_at)}
                  </p>
                </article>
              ))
            ) : (
              <Empty title="No applications in this view." icon={FileCheck2}>
                New requests for your offers will appear here. Your borrowing
                applications stay in the borrowing view.
              </Empty>
            )}
          </section>
          <aside className={`${hubPanel} space-y-4`}>
            <h2 className="flex items-center gap-2 text-base font-extrabold">
              <CalendarClock className="size-5 text-primary" />
              Meeting follow-ups
            </h2>
            {query.data?.meetings.length ? (
              query.data.meetings.map((room) => (
                <div
                  key={room.id}
                  className="block border-t border-border py-3 text-foreground"
                >
                  <PersonName person={room.person} />
                  <Link
                    to={room.href}
                    className="mt-3 block text-sm font-bold text-primary!"
                  >
                    {room.title}
                  </Link>
                  <span className="mt-1 block text-sm text-muted-foreground">
                    {meetingTime(room.scheduled_at)}
                  </span>
                  {room.scheduled_at &&
                    Date.parse(room.scheduled_at) <
                      Date.parse(query.data.server_time) && (
                      <span className="mt-2 block text-xs text-primary">
                        Review or reschedule
                      </span>
                    )}
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No open meeting follow-ups.
              </p>
            )}
            <Link
              to="/meetings"
              className="inline-flex min-h-11 items-center gap-2 text-sm text-primary!"
            >
              All meeting rooms
              <ArrowRight size={15} />
            </Link>
          </aside>
        </div>
      )}
      <p className="text-sm text-muted-foreground">
        Up to 100 open applications and meetings. No request is automatically
        ranked, selected or approved.
      </p>
    </div>
  );
}
