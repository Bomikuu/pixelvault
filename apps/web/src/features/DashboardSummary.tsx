import { Link } from "react-router-dom";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  HandCoins,
  Users,
  Wallet,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@pixelvault/ui";
import type { Loan } from "@pixelvault/contracts";
import { label, money } from "../lib/format";

export type DashboardRole = "borrowing" | "lending";

export function DashboardSummary({
  role,
  onRoleChange,
  loans,
  pending,
  failed,
}: {
  role: DashboardRole;
  onRoleChange: (role: string) => void;
  loans: Loan[];
  pending: boolean;
  failed: boolean;
}) {
  const active = loans.filter((loan) => loan.status === "active");
  const balance = active.reduce(
    (sum, loan) => sum + BigInt(loan.principal_balance),
    0n,
  );
  const people = new Set(
    loans.map((loan) =>
      role === "borrowing" ? loan.lender.id : loan.borrower.id,
    ),
  ).size;
  const tiles = [
    {
      name: "Remaining principal",
      value: money(balance.toString()),
      detail: "Across active loans · excludes interest",
      Icon: Wallet,
    },
    {
      name: "Active loans",
      value: String(active.length),
      detail:
        role === "borrowing"
          ? "Your current borrowing"
          : "Your current lending",
      Icon: HandCoins,
    },
    {
      name: "Repaid loans",
      value: String(loans.filter((loan) => loan.status === "repaid").length),
      detail: "Completed in your shared records",
      Icon: CheckCircle2,
    },
    {
      name: role === "borrowing" ? "Lenders" : "Borrowers",
      value: String(people),
      detail: "Distinct people across your loan history",
      Icon: Users,
    },
  ];
  return (
    <section
      aria-labelledby="overview-title"
      className="mb-6 overflow-hidden rounded-2xl border border-border bg-card text-card-foreground"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6">
        <h1
          id="overview-title"
          className="text-2xl! font-extrabold tracking-tight"
        >
          Overview
        </h1>
        <Tabs value={role} onValueChange={onRoleChange} className="max-w-full">
          <TabsList
            aria-label="Dashboard perspective"
            className="h-auto! max-w-full flex-wrap gap-1 rounded-xl! bg-muted! p-1!"
          >
            <TabsTrigger
              value="borrowing"
              className="min-h-11! gap-2! px-3! text-xs! data-[state=active]:bg-primary! data-[state=active]:text-primary-foreground!"
            >
              <ArrowDownLeft size={15} />
              I’m borrowing
            </TabsTrigger>
            <TabsTrigger
              value="lending"
              className="min-h-11! gap-2! px-3! text-xs! data-[state=active]:bg-primary! data-[state=active]:text-primary-foreground!"
            >
              <ArrowUpRight size={15} />
              I’m lending
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <div
        className="grid grid-cols-2 gap-px border-t border-border bg-border xl:grid-cols-4"
        aria-busy={pending}
      >
        {tiles.map(({ name, value, detail, Icon }) => (
          <Link
            key={name}
            to="/loans"
            className="group flex min-w-0 flex-col gap-2 bg-card p-3 sm:gap-3 text-foreground! transition-colors duration-200 hover:bg-accent focus-visible:bg-accent focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary motion-reduce:transition-none sm:p-6"
          >
            <span className="flex min-h-8 items-center justify-between gap-2 text-[11px] font-semibold text-muted-foreground sm:min-h-0 sm:text-xs">
              <span>{name}</span>
              <Icon size={18} className="shrink-0 text-primary" />
            </span>
            <strong className="break-words text-xl font-extrabold sm:text-2xl tracking-tight tabular-nums">
              {pending ? "…" : failed ? "—" : value}
            </strong>
            <span className="flex items-center justify-between gap-2 text-[10px] leading-relaxed text-muted-foreground sm:text-[11px]">
              {detail}
              <ArrowUpRight
                size={15}
                className="shrink-0 text-primary transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none"
              />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function LoanStatusChart({
  loans,
  role,
  pending,
  failed,
}: {
  loans: Loan[];
  role: DashboardRole;
  pending: boolean;
  failed: boolean;
}) {
  const statuses = [
    ...new Set([
      "active",
      "awaiting_disbursement",
      "repaid",
      ...loans.map((loan) => loan.status),
    ]),
  ];
  const rows = statuses.map((status) => ({
    status,
    count: loans.filter((loan) => loan.status === status).length,
  }));
  const max = Math.max(1, ...rows.map((row) => row.count));
  return (
    <figure
      className="rounded-2xl border border-border bg-card p-5 text-card-foreground sm:p-6"
      aria-labelledby="loan-chart-title"
      aria-busy={pending}
    >
      <figcaption>
        <h2 id="loan-chart-title" className="text-base! font-extrabold!">
          {role === "borrowing" ? "Borrowing" : "Lending"} by status
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Loan count across your current records.
        </p>
      </figcaption>
      {pending || failed ? (
        <p role="status" className="mt-6 text-sm text-muted-foreground">
          {pending
            ? "Loading loan summary…"
            : "Chart unavailable until your loans load."}
        </p>
      ) : !loans.length ? (
        <div className="mt-6 flex min-h-32 flex-col justify-center gap-2 border-t border-border pt-5">
          <HandCoins size={24} className="text-primary" />
          <strong className="text-sm">No loan history yet</strong>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Your {role} chart will appear when you have a loan record.
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {rows.map(({ status, count }) => (
            <div
              key={status}
              className="rounded-lg px-1 py-1 transition-colors hover:bg-accent"
            >
              <div className="mb-2 flex justify-between gap-3 text-xs">
                <span>{label(status)}</span>
                <strong className="tabular-nums">{count}</strong>
              </div>
              <div
                className="h-3 overflow-hidden rounded-full bg-muted"
                aria-hidden="true"
              >
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out motion-reduce:transition-none"
                  style={{ width: `${(count / max) * 100}%` }}
                />
              </div>
            </div>
          ))}
          <div
            className="flex justify-between border-t border-border pt-3 text-[10px] text-muted-foreground"
            aria-hidden="true"
          >
            <span>0 loans</span>
            <span>
              {max} {max === 1 ? "loan" : "loans"}
            </span>
          </div>
        </div>
      )}
      <Link
        to="/analytics"
        className="mt-5 flex min-h-11 items-center justify-between gap-2 border-t border-border pt-3 text-xs font-bold text-primary! hover:underline"
      >
        Open detailed analytics
        <ArrowUpRight size={15} />
      </Link>
    </figure>
  );
}
