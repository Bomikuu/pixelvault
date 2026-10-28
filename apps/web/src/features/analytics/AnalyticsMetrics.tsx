import { ChartColumn, Info, LayoutGrid } from "lucide-react";
import { Button } from "@pixelvault/ui";
import {
  analyticsPanel,
  metricMeta,
  metricValue,
  tones,
  type Report,
  type Section,
} from "./types";

export function SummaryTiles({
  report,
  section,
  select,
}: {
  report: Report;
  section: Section;
  select: (section: Section) => void;
}) {
  const keys =
    section === "overview"
      ? [
          "principal_disbursed",
          "net_collections",
          "interest_collected",
          "commission_collected",
        ]
      : Object.keys(report.metrics)
          .filter((key) => metricMeta(key).group === section)
          .slice(0, 4);
  const names: Record<string, string> =
    report.role === "borrower"
      ? {
          principal_disbursed: "Principal borrowed",
          net_collections: "Net amount repaid",
          interest_collected: "Interest paid",
          commission_collected: "Platform fees collected",
        }
      : {
          principal_disbursed: report.role
            ? "Principal lent"
            : "Principal disbursed",
          commission_collected: "Platform fees collected",
        };
  return (
    <div className="grid min-w-0 grid-cols-2 gap-3 xl:grid-cols-4">
      {keys.map((key, index) => {
        const meta = metricMeta(key),
          tone =
            section === "overview"
              ? tones[(["blue", "green", "purple", "amber"] as const)[index]]
              : tones[meta.tone];
        const surfaces = {
          blue: "border-primary/20! bg-primary/[0.035]!",
          green: "border-emerald-500/20! bg-emerald-500/[0.035]!",
          purple: "border-violet-500/20! bg-violet-500/[0.035]!",
          amber: "border-amber-500/20! bg-amber-500/[0.035]!",
          neutral: "border-border! bg-muted/40!",
        };
        const toneName =
          section === "overview"
            ? (["blue", "green", "purple", "amber"] as const)[index]
            : meta.tone;
        return (
          <Button
            key={key}
            variant="outline"
            className={`group h-auto! min-w-0 w-full flex-col items-stretch! gap-2! whitespace-normal! rounded-2xl! p-3! text-left! shadow-none! transition-colors duration-200 hover:border-primary/60! hover:bg-accent! motion-reduce:transition-none sm:p-5! ${surfaces[toneName]}`}
            onClick={() => select(meta.group)}
            aria-label={`${names[key] || meta.name}: ${metricValue(key, report.metrics[key])}. Open ${meta.group} metrics.`}
          >
            <span className="flex min-w-0 items-center gap-2 sm:gap-3">
              <span
                className={`flex size-8 shrink-0 items-center justify-center rounded-xl sm:size-10 ${tone.icon}`}
              >
                <meta.Icon size={18} />
              </span>
              <span className="min-w-0 text-[11px] font-medium leading-relaxed text-muted-foreground">
                {names[key] || meta.name}
              </span>
            </span>
            <strong className="block break-words text-lg font-extrabold tracking-tight tabular-nums text-foreground sm:pl-[52px] sm:text-[22px]">
              {metricValue(key, report.metrics[key])}
            </strong>
            <span className="text-[10px] font-medium leading-relaxed text-muted-foreground">
              {key === "commission_collected"
                ? "Loan-linked fees · payer per agreement"
                : meta.basis ||
                  (key.endsWith("_count")
                    ? "Recorded count in this period"
                    : "Recorded within the selected period")}
            </span>
          </Button>
        );
      })}
    </div>
  );
}

function MetricBars({ keys, report }: { keys: string[]; report: Report }) {
  return (
    <div className="space-y-7">
      {[false, true].map((count) => {
        const group = keys.filter((key) => key.endsWith("_count") === count);
        if (!group.length) return null;
        const magnitude = (key: string) => {
          const value = BigInt(report.metrics[key]);
          return value < 0n ? -value : value;
        };
        const max = group.reduce(
          (previous, key) =>
            magnitude(key) > previous ? magnitude(key) : previous,
          1n,
        );
        return (
          <div key={String(count)}>
            <h3 className="mb-4 text-xs font-bold text-muted-foreground">
              {count ? "Recorded counts" : "Reported amounts (PHP)"}
            </h3>
            <div className="space-y-4">
              {group.map((key) => {
                const value = BigInt(report.metrics[key]);
                const width = (Number(magnitude(key)) / Number(max)) * 50;
                return (
                  <div key={key}>
                    <div className="mb-2 flex flex-wrap justify-between gap-2 text-xs">
                      <span>{metricMeta(key).name}</span>
                      <strong className="tabular-nums">
                        {metricValue(key, report.metrics[key])}
                      </strong>
                    </div>
                    <div
                      className="relative h-4 rounded-md bg-muted"
                      aria-hidden="true"
                    >
                      <span className="absolute inset-y-0 left-1/2 w-px bg-muted-foreground/40" />
                      <span
                        className={`absolute inset-y-0 rounded-sm ${value < 0n ? "bg-amber-500 dark:bg-amber-400" : "bg-primary"}`}
                        style={{
                          width: `${width}%`,
                          ...(value < 0n ? { right: "50%" } : { left: "50%" }),
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Bars share a zero at the center. These are individual measures, not
        parts of one total. Period flows, cutoff balances and current-status
        counts must not be added together.
      </p>
    </div>
  );
}

export function DetailedMetrics({
  report,
  section,
  layout,
  setLayout,
}: {
  report: Report;
  section: Section;
  layout: "cards" | "chart";
  setLayout: (layout: "cards" | "chart") => void;
}) {
  const keys = Object.keys(report.metrics).filter(
    (key) => section === "overview" || metricMeta(key).group === section,
  );
  return (
    <section
      className={analyticsPanel}
      aria-labelledby="detailed-breakdown-title"
    >
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2
            id="detailed-breakdown-title"
            className="text-base! font-extrabold!"
          >
            Detailed breakdown
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Exact reported figures and what each one means.
          </p>
        </div>
        <div
          className="flex rounded-xl border border-border bg-muted p-1"
          role="group"
          aria-label="Detailed metric layout"
        >
          <Button
            variant={layout === "cards" ? "default" : "ghost"}
            aria-pressed={layout === "cards"}
            className="min-h-11! text-xs"
            onClick={() => setLayout("cards")}
          >
            <LayoutGrid size={15} />
            Cards
          </Button>
          <Button
            variant={layout === "chart" ? "default" : "ghost"}
            aria-pressed={layout === "chart"}
            className="min-h-11! text-xs"
            onClick={() => setLayout("chart")}
          >
            <ChartColumn size={15} />
            Chart
          </Button>
        </div>
      </div>
      {layout === "cards" ? (
        <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {keys.map((key) => {
            const meta = metricMeta(key),
              tone = tones[meta.tone];
            return (
              <article
                key={key}
                className={`min-w-0 rounded-xl border p-4 transition-colors hover:border-primary/60 ${tone.surface}`}
              >
                <div className="flex items-start gap-2">
                  <span
                    className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${tone.icon}`}
                  >
                    <meta.Icon size={16} />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-xs font-bold leading-relaxed">
                      {meta.name}
                    </h3>
                    <strong className="mt-2 block break-words text-lg font-extrabold tabular-nums">
                      {metricValue(key, report.metrics[key])}
                    </strong>
                    <span className="mt-1 block text-[10px] text-muted-foreground">
                      {meta.basis ||
                        (key.endsWith("_count")
                          ? "Period count"
                          : "Period total")}
                    </span>
                  </div>
                </div>
                <p className="mt-4 text-[10px] leading-relaxed text-muted-foreground">
                  {report.definitions[key] || "Reported value for this period."}
                </p>
              </article>
            );
          })}
        </div>
      ) : (
        <MetricBars keys={keys} report={report} />
      )}
      <p className="mt-5 flex items-start gap-3 rounded-xl bg-accent p-4 text-xs leading-relaxed text-accent-foreground">
        <Info size={18} className="mt-0.5 shrink-0" />
        Expected interest is not earned income. Payment collection does not
        establish that the lender has received settlement. These figures are not
        a withdrawable wallet balance.
      </p>
    </section>
  );
}
