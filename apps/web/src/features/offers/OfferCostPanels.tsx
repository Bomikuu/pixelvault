import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { CalendarDays, ChartPie, Info } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@pixelvault/ui";
import type { Money } from "@pixelvault/contracts";
import { date, label, money } from "../../lib/format";
import type { OfferPreview } from "../engagement/types";

export function OfferSectionHeading({
  title,
  description,
  Icon,
  id,
}: {
  title: string;
  description: string;
  Icon: LucideIcon;
  id?: string;
}) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
        <Icon size={19} />
      </span>
      <div className="min-w-0">
        <h2 id={id} className="text-base! font-extrabold! leading-snug!">
          {title}
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  );
}

export const offerPanel =
  "min-w-0 scroll-mt-6 rounded-2xl border border-border bg-card p-4 text-card-foreground sm:p-5";

export function OfferCostPanels({
  preview,
  pending,
}: {
  preview: OfferPreview | null;
  pending: boolean;
}) {
  const d = preview?.disclosure;
  const integer = (value: unknown) => BigInt(String(value ?? 0));
  const principal = integer(d?.principal),
    interest = integer(d?.total_interest),
    total = integer(d?.total_repayment);
  const feeDifference = total - principal - interest;
  const repaymentFees = feeDifference > 0n ? feeDifference : 0n;
  const parts = [
    {
      name: "Principal",
      amount: principal,
      color: "stroke-primary",
      dot: "bg-primary",
    },
    {
      name: "Interest",
      amount: interest,
      color: "stroke-amber-500 dark:stroke-amber-400",
      dot: "bg-amber-500 dark:bg-amber-400",
    },
    {
      name: "Fees in repayments",
      amount: repaymentFees,
      color: "stroke-sky-400",
      dot: "bg-sky-400",
    },
  ];
  const feeRows = (["borrower", "lender"] as const).flatMap((payer) => {
    const fees = d?.[`${payer}_fees`];
    return Array.isArray(fees)
      ? fees.map(
          (fee: { code: string; timing: string; amount: Money }) =>
            [
              `${label(fee.code)} · ${payer} · ${label(fee.timing)}`,
              money(fee.amount),
            ] as [string, ReactNode],
        )
      : [];
  });
  let offset = 0;
  return (
    <>
      <section
        id="offer-cost-breakdown"
        className={offerPanel}
        aria-labelledby="cost-breakdown-title"
        aria-busy={pending}
      >
        <OfferSectionHeading
          id="cost-breakdown-title"
          title="Full cost breakdown"
          description="See how this estimated plan’s total is calculated."
          Icon={ChartPie}
        />
        {d ? (
          <div className="grid min-w-0 gap-6 min-[900px]:grid-cols-[minmax(0,1fr)_minmax(220px,0.9fr)]">
            <dl className="min-w-0 divide-y divide-border text-xs">
              {(
                [
                  ["Principal", money(d.principal)],
                  ["Net amount received", money(d.net_proceeds as Money)],
                  ["Total interest", money(d.total_interest)],
                  ["Total repayment", money(d.total_repayment)],
                  [
                    "Effective annual interest",
                    `${d.effective_annual_percentage}%`,
                  ],
                  ...feeRows,
                  ["Platform commission on repayments", money(0)],
                  ["Late charge under these terms", money(d.late_fee as Money)],
                ] as [string, ReactNode][]
              ).map(([name, value]) => (
                <div
                  key={name}
                  className="flex items-start justify-between gap-4 py-3 first:pt-0"
                >
                  <dt className="min-w-0 text-muted-foreground">{name}</dt>
                  <dd className="shrink-0 font-bold tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>
            <figure
              className="min-w-0 self-start rounded-xl bg-muted/60 p-4"
              aria-label="Estimated repayment composition"
            >
              <div className="flex flex-wrap items-center justify-center gap-3">
                <svg
                  viewBox="0 0 120 120"
                  className="size-32 shrink-0 -rotate-90"
                  role="img"
                  aria-label="Principal, interest and repayment fees as shares of total repayment"
                >
                  <circle
                    cx="60"
                    cy="60"
                    r="45"
                    fill="none"
                    strokeWidth="19"
                    className="stroke-border"
                  />
                  {parts.map((part) => {
                    const percent =
                      total > 0n
                        ? (Number(part.amount) / Number(total)) * 100
                        : 0;
                    const start = offset;
                    offset += percent;
                    return (
                      <circle
                        key={part.name}
                        cx="60"
                        cy="60"
                        r="45"
                        fill="none"
                        strokeWidth="19"
                        pathLength="100"
                        strokeDasharray={`${percent} ${100 - percent}`}
                        strokeDashoffset={-start}
                        className={part.color}
                      />
                    );
                  })}
                </svg>
                <figcaption className="min-w-0">
                  <span className="block text-[11px] text-muted-foreground">
                    Total repayment
                  </span>
                  <strong className="mt-1 block text-lg font-extrabold tabular-nums">
                    {money(d.total_repayment)}
                  </strong>
                </figcaption>
              </div>
              <ul className="mt-4 space-y-3 text-[11px]">
                {parts.map((part) => (
                  <li
                    key={part.name}
                    className="flex flex-wrap items-center justify-between gap-2"
                  >
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <span
                        aria-hidden="true"
                        className={`size-2 shrink-0 rounded-full ${part.dot}`}
                      />
                      {part.name}
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="text-muted-foreground">
                        {total > 0n
                          ? (
                              (Number(part.amount) / Number(total)) *
                              100
                            ).toFixed(1)
                          : "0.0"}
                        %
                      </span>
                      <strong className="tabular-nums">
                        {money(part.amount.toString())}
                      </strong>
                    </span>
                  </li>
                ))}
              </ul>
            </figure>
          </div>
        ) : (
          <p className="min-h-32 text-sm text-muted-foreground">
            {pending
              ? "Updating the cost breakdown…"
              : "Choose a valid amount to see the cost breakdown."}
          </p>
        )}
      </section>
      <section
        id="offer-repayment-schedule"
        className={offerPanel}
        aria-labelledby="repayment-schedule-title"
        aria-busy={pending}
      >
        <OfferSectionHeading
          id="repayment-schedule-title"
          title="Repayment schedule"
          description="Estimated payment dates and exact amounts for this plan · Manila time."
          Icon={CalendarDays}
        />
        {d?.schedule?.length && (
          <p className="mb-3 text-[11px] text-muted-foreground min-[700px]:hidden">
            Scroll horizontally to see all payment amounts.
          </p>
        )}
        {d?.schedule?.length ? (
          <div
            className="min-w-0 overflow-x-auto rounded-xl border border-border focus-visible:outline-2 focus-visible:outline-primary [&_[data-slot=table-container]]:overflow-visible!"
            tabIndex={0}
            role="region"
            aria-label="Estimated repayment schedule"
          >
            <Table className="min-w-[520px] text-xs">
              <TableHeader className="bg-muted">
                <TableRow>
                  <TableHead>Payment</TableHead>
                  <TableHead>Due date</TableHead>
                  <TableHead className="text-right">Principal</TableHead>
                  <TableHead className="text-right">Interest</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {d.schedule.map((line, index) => (
                  <TableRow key={`${line.due_date}-${index}`}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {date(line.due_date)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {money(line.principal)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {money(line.interest)}
                    </TableCell>
                    <TableCell className="text-right font-bold tabular-nums">
                      {money(line.total)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="min-h-20 text-sm text-muted-foreground">
            {pending
              ? "Updating payment dates…"
              : "Your schedule appears after a valid calculation."}
          </p>
        )}
        <p className="mt-3 flex items-start gap-2 text-[11px] leading-relaxed text-muted-foreground">
          <Info size={14} className="mt-0.5 shrink-0" />
          Equal-principal payments can vary. Dates and costs require final
          agreement review.
        </p>
      </section>
    </>
  );
}
