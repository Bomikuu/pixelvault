import type { Money } from "@pixelvault/contracts";
export function money(value: Money | undefined | null) {
  if (value === undefined || value === null) return "—";
  try {
    if (typeof value === "number" && !Number.isSafeInteger(value)) return "—";
    if (!/^-?\d+$/.test(String(value))) return "—";
    const amount = BigInt(value),
      absolute = amount < 0n ? -amount : amount;
    const whole = new Intl.NumberFormat("en-PH", {
      maximumFractionDigits: 0,
    }).format(absolute / 100n);
    const fraction = (absolute % 100n).toString().padStart(2, "0");
    return `${amount < 0n ? "-" : ""}₱${whole}.${fraction}`;
  } catch {
    return "—";
  }
}
export function date(value: string | undefined | null) {
  if (!value) return "Not scheduled";
  const parsed = new Date(
    value.length === 10 ? `${value}T12:00:00+08:00` : value,
  );
  return Number.isNaN(parsed.getTime())
    ? "Date unavailable"
    : new Intl.DateTimeFormat("en-PH", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Manila",
      }).format(parsed);
}
export const label = (value: unknown) =>
  String(value ?? "")
    .replaceAll("_", " ")
    .replace(/^./, (s) => s.toUpperCase());
export function initials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "PV"
  );
}
export function cents(value: FormDataEntryValue | null) {
  return Math.round(Number(value) * 100);
}
export const text = (data: FormData, key: string) =>
  String(data.get(key) || "").trim();
