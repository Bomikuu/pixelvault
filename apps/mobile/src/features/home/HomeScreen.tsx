import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  ChevronRight,
  FileText,
  HandCoins,
  Plus,
  Bookmark,
  Users,
} from "lucide-react";
import type { Loan, Application } from "@pixelvault/contracts";
import {
  Action,
  Button,
  Empty,
  ErrorState,
  Heading,
  Loading,
  Note,
  Page,
  Panel,
  PersonLine,
  Status,
  date,
  money,
} from "../../components/ui";
import { useMemberQuery, useSession } from "../../app/session";
export type ActionUpdate = {
  key: string;
  kind: string;
  title: string;
  detail: string;
  href: string;
  at: string;
  urgent: boolean;
  read: boolean;
};
export function mobileHref(href: string) {
  if (href.startsWith("/inbox?thread="))
    return `/inbox/${new URLSearchParams(href.split("?")[1]).get("thread")}`;
  if (href === "/dashboard") return "/";
  return /^\/(applications|loans|meetings|verification|inbox|profile|activity)(\/|\?|$)/.test(
    href,
  )
    ? href
    : "/activity";
}
export function HomeScreen() {
  const { session } = useSession();
  const [role, setRole] = useState<"borrower" | "lender">("borrower");
  const loans = useMemberQuery<Loan[]>(["loans"], "/loans");
  const applications = useMemberQuery<Application[]>(
    ["applications"],
    "/applications",
  );
  const actions = useMemberQuery<{ actions: ActionUpdate[]; unread: number }>(
    ["actions"],
    "/hub/actions",
  );
  if (loans.isPending || applications.isPending) return <Loading />;
  if (loans.error || applications.error)
    return (
      <Page title="Your overview">
        <ErrorState
          error={loans.error || applications.error}
          retry={() => {
            void loans.refetch();
            void applications.refetch();
          }}
        />
      </Page>
    );
  const records = (loans.data || []).filter(
    (loan) => loan[role]?.id === session?.member?.id,
  );
  const active = records.filter((loan) => loan.status === "active");
  const principal = active
    .reduce((sum, loan) => sum + BigInt(loan.principal_balance), 0n)
    .toString();
  const interest = active
    .reduce((sum, loan) => sum + BigInt(loan.accrued_interest), 0n)
    .toString();
  const pending = (applications.data || []).filter(
    (item) =>
      item[role]?.id === session?.member?.id &&
      ["submitted", "reviewing", "selected"].includes(item.status),
  );
  const next = [...active]
    .filter((loan) => loan.next_due_date)
    .sort((a, b) =>
      String(a.next_due_date).localeCompare(String(b.next_due_date)),
    )[0];
  const schedule = active
    .flatMap((loan) =>
      loan.schedule.map((line) => ({
        date: line.due_date,
        total: BigInt(line.total),
      })),
    )
    .filter(
      (line) =>
        line.date >=
        new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" }),
    )
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);
  const max = schedule.reduce(
    (v, line) => (line.total > v ? line.total : v),
    1n,
  );
  return (
    <Page
      title="Your overview"
      description={`Welcome back, ${session?.member?.display_name.split(" ")[0] || "neighbor"}.`}
      action={
        <Action to="/calendar" variant="ghost">
          <CalendarDays className="size-5" />
          <span className="sr-only">Payment calendar</span>
        </Action>
      }
    >
      <section className="overflow-hidden rounded-2xl bg-primary text-primary-foreground">
        <div
          className="flex gap-1 border-b border-current/15 p-2"
          role="group"
          aria-label="Your dashboard context"
        >
          {(["borrower", "lender"] as const).map((value) => (
            <Button
              key={value}
              variant="ghost"
              aria-pressed={role === value}
              onClick={() => setRole(value)}
              className={`min-h-11 flex-1 rounded-xl text-sm! ${role === value ? "bg-card! text-foreground!" : "text-primary-foreground! hover:bg-primary-foreground/10!"}`}
            >
              {value === "borrower" ? <ArrowDownLeft /> : <ArrowUpRight />}I’m{" "}
              {value === "borrower" ? "borrowing" : "lending"}
            </Button>
          ))}
        </div>
        <div className="p-5">
          <p className="text-sm font-medium">
            {next
              ? role === "borrower"
                ? "Your next payment"
                : "Your next scheduled collection"
              : "A clear plan starts here."}
          </p>
          <p className="mt-2 text-3xl font-extrabold tracking-tight tabular-nums">
            {next
              ? money(next.next_installment_due)
              : role === "borrower"
                ? "Find your next step."
                : "Meet your community."}
          </p>
          <p className="mt-2 text-sm opacity-90">
            {next
              ? `Scheduled for ${date(next.next_due_date)}. Settlement is recorded separately.`
              : "Explore current offers and review the full terms before deciding."}
          </p>
          <Action
            to={next ? `/loans/${next.id}` : "/explore"}
            variant="secondary"
            className="mt-5 bg-card! text-foreground!"
          >
            {next ? "Review loan" : "Explore offers"}
            <ChevronRight />
          </Action>
        </div>
      </section>
      <div className="grid grid-cols-2 gap-3">
        {[
          ["Current principal", money(principal)],
          ["Accrued interest", money(interest)],
          ["Active loans", String(active.length)],
          ["Open applications", String(pending.length)],
        ].map(([name, value]) => (
          <Link
            to={name === "Open applications" ? "/applications" : "/loans"}
            key={name}
            className="rounded-xl border border-border bg-card p-4 transition-[background-color,border-color,transform] hover:-translate-y-0.5 hover:border-primary/40 hover:bg-secondary/40 motion-reduce:transform-none"
          >
            <p className="text-xs font-medium text-muted-foreground">{name}</p>
            <p className="mt-2 text-xl font-extrabold tracking-tight tabular-nums">
              {value}
            </p>
          </Link>
        ))}
      </div>
      <section>
        <Heading
          action={
            <Action to="/activity" variant="ghost">
              View all
            </Action>
          }
        >
          Your next steps
        </Heading>
        {actions.error ? (
          <ErrorState error={actions.error} retry={() => actions.refetch()} />
        ) : (
          (actions.data?.actions || []).slice(0, 3).map((row) => (
            <Link
              key={row.key}
              to={mobileHref(row.href)}
              className="flex min-h-20 items-center gap-3 border-b border-border py-4 transition-colors hover:text-primary"
            >
              <FileText className="size-5 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">{row.title}</p>
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                  {row.detail}
                </p>
              </div>
              <ChevronRight className="size-4" />
            </Link>
          ))
        )}
        {actions.data && !actions.data.actions.length && (
          <Note>
            You’re caught up. New updates appear when your applications,
            payments or conversations change.
          </Note>
        )}
      </section>
      <Panel>
        <Heading>Scheduled payments</Heading>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Next five dates from the current signed schedules. Future interest is
          included; this is not earned income.
        </p>
        {schedule.length ? (
          <div
            className="mt-5 flex h-40 items-end gap-3"
            role="img"
            aria-label={schedule
              .map(
                (line) => `${date(line.date)}: ${money(line.total.toString())}`,
              )
              .join("; ")}
          >
            {schedule.map((line, index) => (
              <div
                key={`${line.date}-${index}`}
                className="flex h-full min-w-0 flex-1 flex-col justify-end gap-2 text-center"
              >
                <span className="truncate text-[10px] font-semibold tabular-nums">
                  {money(line.total.toString())}
                </span>
                <div
                  className="mx-auto w-full max-w-12 rounded-t-md bg-primary"
                  style={{
                    height: `${Math.max(8, Number((line.total * 100n) / max))}%`,
                  }}
                />
                <span className="text-[10px] text-muted-foreground">
                  {new Intl.DateTimeFormat("en-PH", {
                    month: "short",
                    day: "numeric",
                    timeZone: "Asia/Manila",
                  }).format(new Date(`${line.date}T12:00:00+08:00`))}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No upcoming scheduled payments in these records.
          </p>
        )}
      </Panel>
      <div className="grid grid-cols-2 gap-3">
        {[
          ["/saved", "Saved offers", Bookmark],
          ["/calendar", "Payment calendar", CalendarDays],
          ["/decisions", "Lender decisions", Users],
          ["/investments", "My investments", HandCoins],
        ].map(([to, name, Icon]) => {
          const I = Icon as typeof Bookmark;
          return (
            <Action
              key={String(to)}
              to={String(to)}
              variant="outline"
              className="justify-start text-sm"
            >
              <I className="size-4" />
              {String(name)}
            </Action>
          );
        })}
      </div>
      {role === "lender" && (
        <Action to="/offers/new" className="w-full">
          <Plus />
          Post a lending offer
        </Action>
      )}
    </Page>
  );
}
