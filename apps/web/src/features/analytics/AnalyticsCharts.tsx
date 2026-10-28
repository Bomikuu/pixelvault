import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChartNoAxesCombined, Info } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@pixelvault/ui";
import { money } from "../../lib/format";
import {
  analyticsPanel,
  groupedPoints,
  pointLabel,
  type ActivityPoint,
  type Grouping,
  type Report,
} from "./types";

function Plot({ children }: { children: (width: number) => ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(520);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () =>
      setWidth(
        Math.max(220, Math.floor(element.getBoundingClientRect().width)),
      );
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={ref} className="min-w-0 w-full">
      {children(width)}
    </div>
  );
}
function GroupPicker({
  value,
  set,
  daily,
  label,
}: {
  value: Grouping;
  set: (value: Grouping) => void;
  daily: boolean;
  label: string;
}) {
  return (
    <Select value={value} onValueChange={(next) => set(next as Grouping)}>
      <SelectTrigger
        aria-label={label}
        className="h-11! w-[112px]! shrink-0 text-xs"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {daily && <SelectItem value="daily">Daily</SelectItem>}
        <SelectItem value="monthly">Monthly</SelectItem>
        <SelectItem value="quarterly">Quarterly</SelectItem>
      </SelectContent>
    </Select>
  );
}
function EmptyPlot({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[230px] flex-col items-center justify-center gap-3 text-center text-muted-foreground">
      <ChartNoAxesCombined size={28} className="text-primary" />
      <p className="max-w-[36ch] text-xs leading-relaxed">{children}</p>
    </div>
  );
}
function DataTable({
  points,
  grouping,
  count = false,
}: {
  points: ActivityPoint[];
  grouping: Grouping;
  count?: boolean;
}) {
  return (
    <details className="mt-3 border-t border-border pt-2 text-xs">
      <summary className="cursor-pointer py-2 font-semibold text-primary focus-visible:outline-2 focus-visible:outline-primary">
        View chart data
      </summary>
      <div
        className="max-h-60 overflow-auto rounded-lg border border-border focus-visible:outline-2 focus-visible:outline-primary [&_[data-slot=table-container]]:overflow-visible!"
        tabIndex={0}
        role="region"
        aria-label={
          count ? "Confirmed collection counts" : "Net repayment chart values"
        }
      >
        <Table className="min-w-[340px] text-xs">
          <TableHeader>
            <TableRow>
              <TableHead>Period</TableHead>
              {count ? (
                <TableHead className="text-right">Collection events</TableHead>
              ) : (
                <>
                  <TableHead className="text-right">Principal</TableHead>
                  <TableHead className="text-right">Interest</TableHead>
                </>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {points.map((point) => (
              <TableRow key={point.date}>
                <TableCell className="whitespace-nowrap">
                  {pointLabel(point.date, grouping)}
                </TableCell>
                {count ? (
                  <TableCell className="text-right tabular-nums">
                    {point.collection_count}
                  </TableCell>
                ) : (
                  <>
                    <TableCell className="text-right tabular-nums">
                      {money(point.principal_collected)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {money(point.interest_collected)}
                    </TableCell>
                  </>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </details>
  );
}
function RepaymentTrend({ report }: { report: Report }) {
  const [choice, setChoice] = useState<Grouping>("daily");
  const daily = report.activity?.granularity === "day";
  const grouping = choice === "daily" && !daily ? "monthly" : choice;
  const points = groupedPoints(report.activity?.points || [], grouping);
  const values = points.flatMap((p) => [
    Number(p.principal_collected),
    Number(p.interest_collected),
  ]);
  const hasData = values.some((value) => value !== 0);
  const lo = Math.min(0, ...values),
    hi = Math.max(1, ...values);
  const axis = (value: number) =>
    `${value < 0 ? "−" : ""}₱${new Intl.NumberFormat("en-PH", { notation: "compact", maximumFractionDigits: 1 }).format(Math.abs(value) / 100)}`;
  return (
    <section className={analyticsPanel} aria-labelledby="repayment-trend-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="repayment-trend-title" className="text-base! font-extrabold!">
            Repayment trend
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Confirmed principal and interest, net of reversals.
          </p>
        </div>
        <GroupPicker
          value={grouping}
          set={setChoice}
          daily={daily}
          label="Repayment trend grouping"
        />
      </div>
      <ul
        className="mt-4 flex gap-4 text-[11px] text-muted-foreground"
        aria-label="Trend series"
      >
        <li className="flex items-center gap-2">
          <span className="h-0.5 w-4 bg-primary" />
          Principal
        </li>
        <li className="flex items-center gap-2">
          <span className="h-0.5 w-4 bg-amber-500 dark:bg-amber-400" />
          Interest
        </li>
      </ul>
      {!report.activity ? (
        <EmptyPlot>
          Dated reporting data is unavailable. You can still review the exact
          metrics below.
        </EmptyPlot>
      ) : !hasData ? (
        <EmptyPlot>
          No confirmed repayment allocations in this period. Choose another date
          range to explore recorded activity.
        </EmptyPlot>
      ) : (
        <Plot>
          {(width) => {
            const left = 48,
              right = width - 12,
              top = 20,
              bottom = 192;
            const x = (index: number) =>
              points.length === 1
                ? (left + right) / 2
                : left + (index / (points.length - 1)) * (right - left);
            const y = (value: number) =>
              bottom - ((value - lo) / (hi - lo)) * (bottom - top);
            const every = Math.max(
              1,
              Math.ceil(points.length / (width < 400 ? 3 : 6)),
            );
            return (
              <svg
                viewBox={`0 0 ${width} 230`}
                className="mt-2 h-[230px] w-full text-muted-foreground"
                role="img"
                aria-label="Net principal and interest collection amounts over the selected period"
              >
                {[0, 1, 2, 3].map((tick) => {
                  const value = lo + ((hi - lo) * tick) / 3;
                  return (
                    <g key={tick}>
                      <line
                        x1={left}
                        x2={right}
                        y1={y(value)}
                        y2={y(value)}
                        className="stroke-border"
                      />
                      <text
                        x={left - 7}
                        y={y(value) + 3}
                        textAnchor="end"
                        fill="currentColor"
                        fontSize="10"
                      >
                        {axis(value)}
                      </text>
                    </g>
                  );
                })}
                <line
                  x1={left}
                  x2={right}
                  y1={y(0)}
                  y2={y(0)}
                  className="stroke-muted-foreground/50"
                />
                {(
                  [
                    {
                      key: "principal_collected",
                      stroke: "stroke-primary",
                      fill: "fill-primary",
                      name: "Principal",
                    },
                    {
                      key: "interest_collected",
                      stroke: "stroke-amber-500 dark:stroke-amber-400",
                      fill: "fill-amber-500 dark:fill-amber-400",
                      name: "Interest",
                    },
                  ] as const
                ).map((series) => (
                  <g key={series.key}>
                    {lo >= 0 && points.length > 1 && (
                      <polygon
                        points={`${x(0)},${y(0)} ${points.map((p, i) => `${x(i)},${y(Number(p[series.key]))}`).join(" ")} ${x(points.length - 1)},${y(0)}`}
                        className={`${series.fill} opacity-[0.06]`}
                      />
                    )}
                    <polyline
                      points={points
                        .map((p, i) => `${x(i)},${y(Number(p[series.key]))}`)
                        .join(" ")}
                      fill="none"
                      strokeWidth="2"
                      strokeLinejoin="round"
                      className={series.stroke}
                    />
                    {points.map((p, i) => (
                      <circle
                        key={p.date}
                        cx={x(i)}
                        cy={y(Number(p[series.key]))}
                        r={points.length > 40 ? 2 : 3}
                        className={series.fill}
                      >
                        <title>
                          {pointLabel(p.date, grouping)} · {series.name}:{" "}
                          {money(p[series.key])}
                        </title>
                      </circle>
                    ))}
                  </g>
                ))}
                {points.map(
                  (p, i) =>
                    ((i % every === 0 && points.length - 1 - i >= every) ||
                      i === points.length - 1) && (
                      <text
                        key={p.date}
                        x={x(i)}
                        y={216}
                        textAnchor={
                          i === 0
                            ? "start"
                            : i === points.length - 1
                              ? "end"
                              : "middle"
                        }
                        fill="currentColor"
                        fontSize="10"
                      >
                        {pointLabel(p.date, grouping)}
                      </text>
                    ),
                )}
              </svg>
            );
          }}
        </Plot>
      )}
      <DataTable points={points} grouping={grouping} />
    </section>
  );
}
function RepaymentBreakdown({ report }: { report: Report }) {
  const data = report.activity?.repayment_breakdown;
  const parts = [
    {
      name: "Principal",
      value: data?.principal ?? "0",
      stroke: "stroke-primary",
      dot: "bg-primary",
    },
    {
      name: "Interest",
      value: data?.interest ?? "0",
      stroke: "stroke-amber-500 dark:stroke-amber-400",
      dot: "bg-amber-500 dark:bg-amber-400",
    },
    {
      name: "Other loan charges",
      value: data?.other_charges ?? "0",
      stroke: "stroke-sky-400",
      dot: "bg-sky-400",
    },
  ];
  const total = BigInt(data?.total ?? 0);
  const positive =
    !!data && total > 0n && parts.every((part) => BigInt(part.value) >= 0n);
  let offset = 0;
  return (
    <section
      className={analyticsPanel}
      aria-labelledby="repayment-breakdown-title"
    >
      <h2 id="repayment-breakdown-title" className="text-base! font-extrabold!">
        Net repayment breakdown
      </h2>
      <div className="relative mx-auto my-3 size-40">
        <svg
          viewBox="0 0 200 200"
          className="size-full -rotate-90"
          aria-hidden="true"
        >
          <circle
            cx="100"
            cy="100"
            r="78"
            fill="none"
            strokeWidth="28"
            className="stroke-muted"
          />
          {positive &&
            parts.map((part) => {
              const percent = (Number(part.value) / Number(total)) * 100;
              const start = offset;
              offset += percent;
              return (
                <circle
                  key={part.name}
                  cx="100"
                  cy="100"
                  r="78"
                  fill="none"
                  strokeWidth="28"
                  pathLength="100"
                  strokeDasharray={`${percent} ${100 - percent}`}
                  strokeDashoffset={-start}
                  className={part.stroke}
                />
              );
            })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
          <strong className="w-full break-words text-lg font-extrabold tabular-nums">
            {data ? money(data.total) : "—"}
          </strong>
          <span className="mt-1 text-[10px] text-muted-foreground">
            Net collected
          </span>
        </div>
      </div>
      <dl className="space-y-4 text-xs">
        {parts.map((part) => (
          <div
            key={part.name}
            className="flex flex-wrap items-center justify-between gap-2"
          >
            <dt className="flex items-center gap-2 text-muted-foreground">
              <span className={`size-2.5 shrink-0 rounded-full ${part.dot}`} />
              {part.name}
            </dt>
            <dd className="flex items-center gap-3">
              <span className="text-[11px] text-muted-foreground">
                {positive
                  ? `${((Number(part.value) / Number(total)) * 100).toFixed(1)}%`
                  : "—"}
              </span>
              <strong className="tabular-nums">
                {data ? money(part.value) : "—"}
              </strong>
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-5 border-t border-border pt-3 text-[10px] leading-relaxed text-muted-foreground">
        {!data
          ? "Allocation data is unavailable."
          : !positive
            ? "No positive net allocation to chart. Signed amounts remain visible above; reversals can make them negative."
            : "Net confirmed loan allocations. Platform origination fees and lender settlement are separate."}
      </p>
    </section>
  );
}
function PaymentFrequency({ report }: { report: Report }) {
  const [grouping, setGrouping] = useState<Grouping>("monthly");
  const daily = report.activity?.granularity === "day";
  const mode = grouping === "daily" && !daily ? "monthly" : grouping;
  const points = groupedPoints(report.activity?.points || [], mode);
  const max = Math.max(1, ...points.map((p) => Number(p.collection_count)));
  const count = points.reduce((sum, p) => sum + BigInt(p.collection_count), 0n);
  return (
    <section
      className={analyticsPanel}
      aria-labelledby="payment-frequency-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2
            id="payment-frequency-title"
            className="text-base! font-extrabold!"
          >
            Payment frequency
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Confirmed collection events, before reversals.
          </p>
        </div>
        <GroupPicker
          value={mode}
          set={setGrouping}
          daily={daily}
          label="Payment frequency grouping"
        />
      </div>
      {count === 0n ? (
        <EmptyPlot>
          {report.activity
            ? "No confirmed collection events in this period."
            : "Collection event history is unavailable."}
        </EmptyPlot>
      ) : (
        <Plot>
          {(width) => {
            const left = 28,
              right = width - 8,
              top = 25,
              bottom = 177;
            const step = (right - left) / points.length;
            const bar = Math.min(44, step * 0.6);
            return (
              <svg
                viewBox={`0 0 ${width} 215`}
                className="mt-3 h-[215px] w-full text-muted-foreground"
                role="img"
                aria-label="Number of confirmed collection events by period"
              >
                <line
                  x1={left}
                  x2={right}
                  y1={bottom}
                  y2={bottom}
                  className="stroke-border"
                />
                {[0, max].map((value) => (
                  <text
                    key={value}
                    x={left - 8}
                    y={bottom - (value / max) * (bottom - top) + 3}
                    textAnchor="end"
                    fill="currentColor"
                    fontSize="10"
                  >
                    {value}
                  </text>
                ))}
                {points.map((p, i) => {
                  const value = Number(p.collection_count);
                  const height = (value / max) * (bottom - top);
                  const x = left + step * (i + 0.5);
                  return (
                    <g key={p.date}>
                      <rect
                        x={x - bar / 2}
                        y={bottom - height}
                        width={bar}
                        height={height}
                        rx="3"
                        className="fill-primary"
                      >
                        <title>
                          {pointLabel(p.date, mode)}: {p.collection_count}{" "}
                          events
                        </title>
                      </rect>
                      <text
                        x={x}
                        y={bottom - height - 7}
                        textAnchor="middle"
                        fill="currentColor"
                        fontSize="11"
                      >
                        {value}
                      </text>
                      {(i % Math.max(1, Math.ceil(points.length / 4)) === 0 ||
                        i === points.length - 1) && (
                        <text
                          x={x}
                          y={200}
                          textAnchor="middle"
                          fill="currentColor"
                          fontSize="10"
                        >
                          {pointLabel(p.date, mode)}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
            );
          }}
        </Plot>
      )}
      <DataTable points={points} grouping={mode} count />
    </section>
  );
}
function InterestRates({ report }: { report: Report }) {
  const rates = report.activity?.current_annual_rates_bps || [];
  const rate = (bps: number) => `${(bps / 100).toFixed(2)}%`;
  return (
    <section className={analyticsPanel} aria-labelledby="annual-rates-title">
      <h2 id="annual-rates-title" className="text-base! font-extrabold!">
        Current annual rates
      </h2>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        Nominal reducing-balance rates on active agreements.
      </p>
      <strong className="my-5 block text-3xl font-extrabold tracking-tight tabular-nums">
        {!rates.length
          ? "—"
          : rates.length === 1
            ? rate(rates[0])
            : `${rate(rates[0])}–${rate(rates[rates.length - 1])}`}
      </strong>
      <p className="mb-5 text-[11px] text-muted-foreground">
        {rates.length
          ? `${rates.length} distinct signed ${rates.length === 1 ? "rate" : "rates"}. Current status, separate from the selected period.`
          : "No current active agreement rate to display."}
      </p>
      <dl className="space-y-3 border-t border-border pt-4 text-xs">
        {[
          ["Accrued in period", "interest_accrued"],
          ["Net interest collected", "interest_collected"],
          ["Contractual future interest", "contractual_future_interest"],
        ].map(([name, key]) => (
          <div key={key} className="flex flex-wrap justify-between gap-2">
            <dt className="text-muted-foreground">{name}</dt>
            <dd className="font-bold tabular-nums">
              {money(report.metrics[key])}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-5 flex items-start gap-2 rounded-lg bg-accent p-3 text-[11px] leading-relaxed text-accent-foreground">
        <Info size={15} className="mt-0.5 shrink-0" />
        These rates are not a blended effective annual rate or promised return.
        Future interest is a projection.
      </p>
    </section>
  );
}
export function AnalyticsCharts({ report }: { report: Report }) {
  return (
    <div className="space-y-4">
      <div className="grid min-w-0 items-stretch gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,1fr)]">
        <RepaymentTrend report={report} />
        <RepaymentBreakdown report={report} />
      </div>
      <div className="grid min-w-0 items-stretch gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <PaymentFrequency report={report} />
        <InterestRates report={report} />
      </div>
    </div>
  );
}
