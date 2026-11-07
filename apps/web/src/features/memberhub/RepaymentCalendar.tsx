import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
} from "lucide-react";
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@pixelvault/ui";
import { apiRequest } from "../../app/api";
import { useSession } from "../../app/session";
import {
  PageHeading,
  Loading,
  ErrorNotice,
  Empty,
  MemberAvatar,
  Status,
} from "../../components";
import { money } from "../../lib/format";
import { hubPanel, type CalendarEvent } from "./shared";
export function RepaymentCalendar() {
  const { session } = useSession();
  const [params, setParams] = useSearchParams();
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const month = /^(19|20|21)\d{2}-(0[1-9]|1[0-2])$/.test(
    params.get("month") || "",
  )
    ? params.get("month")!
    : today.slice(0, 7);
  const role = params.get("role") === "lender" ? "lender" : "borrower";
  const status = params.get("status") || "all";
  const start = `${month}-01`,
    end = new Date(
      Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5)), 1),
    )
      .toISOString()
      .slice(0, 10);
  const search = new URLSearchParams({ start, end, role }).toString();
  const query = useQuery({
    queryKey: ["calendar", session?.member?.id, start, end, role],
    queryFn: () =>
      apiRequest<{ events: CalendarEvent[]; notice: string }>(
        `/hub/calendar?${search}`,
      ),
  });
  const rows = (query.data?.events || []).filter(
    (row) =>
      status === "all" ||
      (status === "unpaid" ? row.status !== "covered" : row.status === status),
  );
  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    next.set(key, value);
    setParams(next);
  };
  const move = (delta: number) => {
    const date = new Date(`${start}T00:00:00Z`);
    date.setUTCMonth(date.getUTCMonth() + delta);
    update("month", date.toISOString().slice(0, 7));
  };
  const heading = new Intl.DateTimeFormat("en-PH", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${start}T00:00:00Z`));
  const days =
    new Date(`${end}T00:00:00Z`).getUTCDate() === 1
      ? Math.round(
          (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) /
            86400000,
        )
      : 31;
  const offset = new Date(`${start}T00:00:00Z`).getUTCDay();
  return (
    <div className="space-y-5">
      <PageHeading
        title="Plan around your payment dates."
        description="Your current signed schedules, in Manila time."
        action={
          <Button asChild variant="outline">
            <a href={`/api/v1/hub/calendar/export?${search}`} download>
              <Download size={16} />
              Export dates only
            </a>
          </Button>
        }
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            aria-label="Previous month"
            onClick={() => move(-1)}
          >
            <ChevronLeft size={18} />
          </Button>
          <h2 className="min-w-44 text-center text-lg font-extrabold">
            {heading}
          </h2>
          <Button
            variant="outline"
            size="icon"
            aria-label="Next month"
            onClick={() => move(1)}
          >
            <ChevronRight size={18} />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={role} onValueChange={(value) => update("role", value)}>
            <SelectTrigger aria-label="Calendar perspective" className="w-40!">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="borrower">I’m borrowing</SelectItem>
              <SelectItem value="lender">I’m lending</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={status}
            onValueChange={(value) => update("status", value)}
          >
            <SelectTrigger aria-label="Payment status" className="w-40!">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[
                ["all", "All dates"],
                ["unpaid", "Not fully covered"],
                ["covered", "Covered"],
                ["overdue", "Overdue"],
              ].map(([key, label]) => (
                <SelectItem value={key} key={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {query.isPending ? (
        <Loading text="Reading your current schedules…" />
      ) : query.error ? (
        <ErrorNotice error={query.error} retry={() => void query.refetch()} />
      ) : (
        <>
          <div
            className="hidden grid-cols-7 gap-px overflow-hidden rounded-[14px] border border-border bg-border md:grid"
            aria-label={heading}
          >
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div
                key={day}
                className="bg-muted px-3 py-2 text-center text-xs font-semibold"
              >
                {day}
              </div>
            ))}
            {Array.from(
              { length: Math.ceil((offset + days) / 7) * 7 },
              (_, index) => {
                const day = index - offset + 1;
                const value = `${month}-${String(day).padStart(2, "0")}`;
                const events =
                  day > 0 && day <= days
                    ? rows.filter((row) => row.due_date === value)
                    : [];
                return (
                  <div
                    key={index}
                    className={`min-h-24 min-w-0 bg-card p-2 ${value === today ? "ring-2 ring-inset ring-primary" : ""}`}
                  >
                    {day > 0 && day <= days && (
                      <>
                        <span className="text-sm font-bold">{day}</span>
                        {events.map((row) => (
                          <Link
                            key={row.id}
                            to={row.href}
                            className="mt-1 block rounded-md bg-accent p-2 text-xs text-accent-foreground! hover:underline"
                          >
                            {row.person.display_name}
                            <strong className="mt-1 block tabular-nums">
                              {money(row.remaining)}
                            </strong>
                            <span>{row.status}</span>
                          </Link>
                        ))}
                      </>
                    )}
                  </div>
                );
              },
            )}
          </div>
          {rows.length ? (
            <section
              className={`${hubPanel} divide-y divide-border p-0!`}
              aria-label="Payment dates"
            >
              {rows.map((row) => (
                <Link
                  key={row.id}
                  to={row.href}
                  className="grid grid-cols-[40px_minmax(0,1fr)] items-center gap-3 p-4 text-foreground! transition-colors hover:bg-accent sm:flex sm:flex-nowrap"
                >
                  <span className="col-span-2 flex items-center justify-between gap-3 text-sm font-bold sm:w-14 sm:shrink-0">
                    <time dateTime={row.due_date}>
                      {new Intl.DateTimeFormat("en-PH", {
                        month: "short",
                        day: "numeric",
                        timeZone: "UTC",
                      }).format(new Date(`${row.due_date}T00:00:00Z`))}
                    </time>
                    <span className="sm:hidden">
                      <Status value={row.status} />
                    </span>
                  </span>
                  <MemberAvatar
                    name={row.person.display_name}
                    avatarKey={row.person.avatar_key}
                    photoUrl={row.person.photo_url}
                    reputation={row.person.reputation}
                  />
                  <span className="min-w-0 flex-1">
                    <strong className="block text-sm">
                      {row.person.display_name}
                    </strong>
                    <span className="text-xs text-muted-foreground">
                      Installment {row.sequence} · Loan{" "}
                      {row.loan_id.slice(0, 8)}
                    </span>
                  </span>
                  <span className="col-span-2 flex items-center justify-between gap-3 border-t border-border pt-3 sm:block sm:border-0 sm:pt-0 sm:text-right">
                    <strong className="order-2 block tabular-nums sm:order-none">
                      {money(row.remaining)}
                    </strong>
                    <span className="text-xs text-muted-foreground">
                      Scheduled remaining
                    </span>
                  </span>
                  <span className="hidden sm:block">
                    <Status value={row.status} />
                  </span>
                </Link>
              ))}
            </section>
          ) : (
            <Empty title="No payment dates in this view." icon={CalendarDays}>
              Choose another month or perspective to review your signed
              schedules.
            </Empty>
          )}
          <p className="text-sm leading-relaxed text-muted-foreground">
            {query.data?.notice}
          </p>
        </>
      )}
      <p className="text-xs text-muted-foreground">
        This calendar uses up to 200 recent confirmed loan records. Review{" "}
        <Link className="text-primary! underline!" to="/loans">
          My loans
        </Link>{" "}
        for your current obligations. Calendar export includes dates only,
        without amounts or names. Re-export after a schedule changes; imported
        files do not sync automatically.
      </p>
    </div>
  );
}
