import {
  ArrowDownToLine,
  ArrowLeftRight,
  BadgePercent,
  Banknote,
  CircleDollarSign,
  Clock3,
  FileCheck2,
  HandCoins,
  Landmark,
  Receipt,
  ShieldQuestion,
  Undo2,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { label, money } from "../../lib/format";

export type Section =
  "overview" | "collections" | "interest" | "fees" | "settlement" | "loss";
export type Grouping = "daily" | "monthly" | "quarterly";
export interface ActivityPoint {
  date: string;
  principal_collected: string;
  interest_collected: string;
  confirmed_collections: string;
  collection_reversals: string;
  net_collections: string;
  collection_count: string;
  principal_disbursed: string;
  interest_accrued: string;
}
export interface Report {
  period: { start: string; end: string; timezone: string; basis: string };
  role?: string;
  metrics: Record<string, string | number>;
  definitions: Record<string, string>;
  activity?: {
    granularity: "day" | "month";
    points: ActivityPoint[];
    repayment_breakdown: {
      principal: string;
      interest: string;
      other_charges: string;
      total: string;
    };
    current_annual_rates_bps: number[];
    definitions: Record<string, string>;
  };
}
export const sections: { key: Section; name: string }[] = [
  { key: "overview", name: "Overview" },
  { key: "collections", name: "Collections" },
  { key: "interest", name: "Interest" },
  { key: "fees", name: "Fees & commission" },
  { key: "settlement", name: "Settlement" },
  { key: "loss", name: "Loss & status" },
];
export const tones = {
  blue: {
    surface: "border-primary/20 bg-primary/[0.035]",
    icon: "bg-primary/10 text-primary",
  },
  green: {
    surface: "border-emerald-500/20 bg-emerald-500/[0.035]",
    icon: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  purple: {
    surface: "border-violet-500/20 bg-violet-500/[0.035]",
    icon: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  },
  amber: {
    surface: "border-amber-500/20 bg-amber-500/[0.035]",
    icon: "bg-amber-500/10 text-amber-800 dark:text-amber-300",
  },
  neutral: {
    surface: "border-border bg-muted/40",
    icon: "bg-muted text-foreground",
  },
};
type MetricMeta = {
  name: string;
  group: Section;
  tone: keyof typeof tones;
  Icon: LucideIcon;
  basis?: string;
};
const metadata: Record<string, MetricMeta> = {
  principal_disbursed: {
    name: "Principal disbursed",
    group: "collections",
    tone: "blue",
    Icon: Wallet,
  },
  confirmed_collections: {
    name: "Confirmed collections",
    group: "collections",
    tone: "green",
    Icon: Banknote,
  },
  collection_reversals: {
    name: "Collection reversals",
    group: "collections",
    tone: "amber",
    Icon: Undo2,
  },
  net_collections: {
    name: "Net collections",
    group: "collections",
    tone: "blue",
    Icon: ArrowLeftRight,
    basis: "Net of reversals",
  },
  interest_accrued: {
    name: "Interest accrued",
    group: "interest",
    tone: "purple",
    Icon: BadgePercent,
  },
  interest_collected: {
    name: "Interest collected",
    group: "interest",
    tone: "purple",
    Icon: HandCoins,
    basis: "Net of reversals",
  },
  principal_outstanding: {
    name: "Principal outstanding",
    group: "collections",
    tone: "blue",
    Icon: Wallet,
    basis: "Balance at cutoff",
  },
  interest_outstanding: {
    name: "Interest outstanding",
    group: "interest",
    tone: "green",
    Icon: CircleDollarSign,
    basis: "Balance at cutoff",
  },
  contractual_future_interest: {
    name: "Contractual future interest",
    group: "interest",
    tone: "amber",
    Icon: Clock3,
    basis: "Projection only",
  },
  overdue_contractual_amount: {
    name: "Overdue contractual amount",
    group: "loss",
    tone: "purple",
    Icon: Clock3,
    basis: "At cutoff",
  },
  loss_recorded: {
    name: "Loss recorded",
    group: "loss",
    tone: "amber",
    Icon: Receipt,
  },
  closed_with_loss_count: {
    name: "Closed with loss",
    group: "loss",
    tone: "green",
    Icon: FileCheck2,
  },
  settlement_unknown_count: {
    name: "Settlement unknown",
    group: "settlement",
    tone: "blue",
    Icon: ShieldQuestion,
    basis: "Current status",
  },
  settlement_confirmed_count: {
    name: "Settlement confirmed",
    group: "settlement",
    tone: "blue",
    Icon: Landmark,
    basis: "Current status",
  },
  commission_earned: {
    name: "Commission earned",
    group: "fees",
    tone: "purple",
    Icon: Receipt,
  },
  commission_collected: {
    name: "Commission collected",
    group: "fees",
    tone: "purple",
    Icon: ArrowDownToLine,
    basis: "Net of refunds",
  },
  commission_reversed: {
    name: "Commission reversed",
    group: "fees",
    tone: "purple",
    Icon: Undo2,
  },
};
export function metricMeta(key: string): MetricMeta {
  return (
    metadata[key] || {
      name: label(key),
      group: "overview",
      tone: "neutral",
      Icon: Receipt,
    }
  );
}
export function metricValue(key: string, value: string | number | undefined) {
  return value === undefined
    ? "—"
    : key.endsWith("_count")
      ? new Intl.NumberFormat("en-PH").format(BigInt(value))
      : money(value);
}
export const analyticsPanel =
  "min-w-0 rounded-2xl border border-border bg-card p-4 text-card-foreground sm:p-5";
export function groupedPoints(points: ActivityPoint[], grouping: Grouping) {
  const groups = new Map<string, ActivityPoint>();
  for (const point of points) {
    const month = Number(point.date.slice(5, 7));
    const key =
      grouping === "daily"
        ? point.date
        : grouping === "monthly"
          ? `${point.date.slice(0, 7)}-01`
          : `${point.date.slice(0, 4)}-${String(Math.floor((month - 1) / 3) * 3 + 1).padStart(2, "0")}-01`;
    const previous = groups.get(key);
    const next = { ...point, date: key };
    if (previous)
      for (const field of Object.keys(point) as (keyof ActivityPoint)[])
        if (field !== "date")
          next[field] = String(BigInt(previous[field]) + BigInt(point[field]));
    groups.set(key, next);
  }
  return [...groups.values()];
}
export function pointLabel(date: string, grouping: Grouping) {
  if (grouping === "quarterly")
    return `Q${Math.floor((Number(date.slice(5, 7)) - 1) / 3) + 1} ${date.slice(0, 4)}`;
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    ...(grouping === "daily"
      ? ({ month: "short", day: "numeric" } as const)
      : ({ month: "short", year: "numeric" } as const)),
  }).format(new Date(`${date}T12:00:00+08:00`));
}
