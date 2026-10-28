import { Link, useSearchParams } from "react-router-dom";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  Download,
  Loader2,
} from "lucide-react";
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@pixelvault/ui";
import { apiRequest, post } from "../app/api";
import { useSession } from "../app/session";
import { ErrorNotice } from "../components";
import { AnalyticsCharts } from "./analytics/AnalyticsCharts";
import { DetailedMetrics, SummaryTiles } from "./analytics/AnalyticsMetrics";
import { sections, type Report, type Section } from "./analytics/types";

function shiftDate(value: string, days: number) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "";
  const date = new Date(`${value}T00:00:00Z`);
  if (
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  )
    return "";
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
export function AnalyticsPage({ admin = false }: { admin?: boolean }) {
  const { session } = useSession();
  const [params, setParams] = useSearchParams();
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const start = params.has("start")
    ? params.get("start")!
    : `${today.slice(0, 7)}-01`;
  const through = params.has("through") ? params.get("through")! : today;
  const end = shiftDate(through, 1);
  const role = params.get("role") === "lender" ? "lender" : "borrower";
  const section = sections.some((item) => item.key === params.get("section"))
    ? (params.get("section") as Section)
    : "overview";
  const layout = params.get("layout") === "chart" ? "chart" : "cards";
  const duration =
    end && shiftDate(start, 0)
      ? (new Date(`${end}T00:00:00Z`).getTime() -
          new Date(`${start}T00:00:00Z`).getTime()) /
        86400000
      : 0;
  const valid = duration > 0 && duration <= 3660;
  const [exportBusy, setExportBusy] = useState(false);
  const [exportError, setExportError] = useState<unknown>();
  const [exportStatus, setExportStatus] = useState("");
  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    next.set(key, value);
    setParams(next, { replace: true });
  };
  const query = useQuery({
    queryKey: [
      "report",
      session?.member?.id,
      admin,
      admin ? "operations" : role,
      start,
      end,
    ],
    enabled: valid,
    queryFn: () =>
      apiRequest<Report>(
        `${admin ? "/admin/reporting" : "/reporting/member"}?${new URLSearchParams({ start, end, ...(!admin ? { role } : {}) })}`,
      ),
  });
  return (
    <div className="min-w-0 space-y-5">
      <nav
        aria-label="Analytics breadcrumb"
        className="flex items-center gap-2 text-[11px] text-muted-foreground"
      >
        <Link
          to={admin ? "/admin" : "/dashboard"}
          className="flex min-h-11 items-center gap-2 text-muted-foreground! hover:text-primary!"
        >
          <ArrowLeft size={14} />
          {admin ? "Administration" : "My dashboard"}
        </Link>
        <ChevronRight size={13} />
        <span className="text-foreground">Analytics</span>
      </nav>
      <header className="flex min-w-0 flex-wrap items-start justify-between gap-5">
        <div>
          <h1 className="text-2xl! font-extrabold! leading-tight! tracking-tight">
            {admin
              ? "Operations, from the same record."
              : "A clearer view of your activity."}
          </h1>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Confirmed facts and future expectations, shown separately.
          </p>
        </div>
        <div className="flex min-w-0 w-full flex-wrap items-end gap-3 xl:w-auto">
          <div className="w-full min-w-0 xl:w-auto xl:flex-none">
            <span className="mb-1.5 block text-[10px] text-muted-foreground">
              Date range · Manila
            </span>
            <div className="flex min-w-0 items-center gap-2 rounded-xl border border-border bg-card p-0.5">
              <div className="min-w-0 flex-1">
                <Label htmlFor="report-start" className="sr-only">
                  From
                </Label>
                <Input
                  id="report-start"
                  type="date"
                  value={start}
                  onChange={(event) => update("start", event.target.value)}
                  className="min-w-0 w-full border-0! bg-transparent! px-1! text-[11px]! shadow-none! xl:w-[120px]"
                />
              </div>
              <ArrowRight
                size={14}
                className="shrink-0 text-muted-foreground"
              />
              <div className="min-w-0 flex-1">
                <Label htmlFor="report-through" className="sr-only">
                  Through (inclusive)
                </Label>
                <Input
                  id="report-through"
                  type="date"
                  value={through}
                  onChange={(event) => update("through", event.target.value)}
                  className="min-w-0 w-full border-0! bg-transparent! px-1! text-[11px]! shadow-none! xl:w-[120px]"
                />
              </div>
            </div>
          </div>
          {!admin && (
            <div className="min-w-[130px] flex-1 xl:flex-none">
              <Label
                htmlFor="report-role"
                className="mb-1.5 block text-[10px] text-muted-foreground"
              >
                Perspective
              </Label>
              <Select
                value={role}
                onValueChange={(value) => update("role", value)}
              >
                <SelectTrigger
                  id="report-role"
                  className="h-12! w-full text-xs"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="borrower">Borrowing</SelectItem>
                  <SelectItem value="lender">Lending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <Button
            variant="outline"
            className="h-12! min-w-[150px] flex-1 text-xs xl:flex-none"
            disabled={!valid || query.isFetching || !!query.error || exportBusy}
            onClick={async () => {
              setExportError(undefined);
              setExportStatus("");
              setExportBusy(true);
              try {
                const result = await post<{ download_path: string }>(
                  "/reporting/exports",
                  {
                    purpose: admin ? "operations_summary" : "member_statement",
                    start,
                    end,
                    ...(!admin ? { role } : {}),
                  },
                );
                const target = new URL(result.download_path, location.origin);
                if (target.origin !== location.origin)
                  throw new Error(
                    "The export download address is unavailable. Request a new statement.",
                  );
                window.location.assign(target.href);
                setExportStatus("Statement download requested.");
              } catch (problem) {
                setExportError(problem);
              } finally {
                setExportBusy(false);
              }
            }}
          >
            {exportBusy ? (
              <Loader2
                size={15}
                className="animate-spin motion-reduce:animate-none"
              />
            ) : (
              <Download size={15} />
            )}
            {exportBusy ? "Preparing…" : "Export statement"}
          </Button>
        </div>
      </header>
      {exportError !== undefined && <ErrorNotice error={exportError} />}
      {exportStatus && (
        <p role="status" className="text-xs text-muted-foreground">
          {exportStatus}
        </p>
      )}
      <Tabs
        value={section}
        onValueChange={(value) => update("section", value)}
        className="min-w-0 gap-5!"
      >
        <div
          className="min-w-0 overflow-x-auto border-b border-border pb-1 focus-visible:outline-2 focus-visible:outline-primary"
          tabIndex={0}
          role="region"
          aria-label="Analytics sections"
        >
          <TabsList
            variant="line"
            className="h-auto! w-max justify-start! gap-1! rounded-none! bg-transparent! p-0!"
          >
            {sections.map((item) => (
              <TabsTrigger
                key={item.key}
                value={item.key}
                className="min-h-11! shrink-0 px-4! text-xs! data-[state=active]:text-primary! data-[state=active]:after:bg-primary!"
              >
                {item.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        <TabsContent value={section} className="min-w-0 space-y-5">
          {!valid ? (
            <p
              role="alert"
              className="rounded-xl border border-border bg-accent p-4 text-sm text-accent-foreground"
            >
              Choose valid From and Through dates, in order, within a ten-year
              reporting window. Through includes the selected day.
            </p>
          ) : query.isPending ? (
            <div
              aria-busy="true"
              aria-label="Loading analytics"
              className="space-y-4"
            >
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[0, 1, 2, 3].map((key) => (
                  <div
                    key={key}
                    className="h-32 animate-pulse rounded-2xl bg-muted motion-reduce:animate-none"
                  />
                ))}
              </div>
              <div className="h-72 animate-pulse rounded-2xl bg-muted motion-reduce:animate-none" />
              <span className="sr-only" role="status">
                Loading your report…
              </span>
            </div>
          ) : query.error ? (
            <ErrorNotice
              error={query.error}
              retry={() => void query.refetch()}
            />
          ) : query.data ? (
            <>
              <SummaryTiles
                report={query.data}
                section={section}
                select={(value) => update("section", value)}
              />
              {section === "overview" && (
                <AnalyticsCharts report={query.data} />
              )}
              <DetailedMetrics
                report={query.data}
                section={section}
                layout={layout}
                setLayout={(value) => update("layout", value)}
              />
              <p className="text-[10px] leading-relaxed text-muted-foreground">
                {start} through {through} · Asia/Manila. Financial entries use
                effective dates; balances use the closing cutoff. Settlement and
                annual-rate status are explicitly current. Through includes the
                full day.
              </p>
            </>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}
