import { useEffect, useRef, useState } from "react";
import type { Offer, Money } from "@pixelvault/contracts";
import {
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@pixelvault/ui";
import { Calculator, Info, Loader2 } from "lucide-react";
import { ActionLink, ErrorNotice } from "../../components";
import { apiRequest } from "../../app/api";
import { cents, date, label, money } from "../../lib/format";
import type { OfferPreview } from "./types";
import {
  OfferCostPanels,
  OfferSectionHeading,
  offerPanel,
} from "../offers/OfferCostPanels";
export function OfferCalculator({
  offer,
  canApply = true,
  onPreviewChange,
}: {
  offer: Offer;
  canApply?: boolean;
  onPreviewChange?: (preview: OfferPreview | null) => void;
}) {
  const maximum = Math.min(
    Number(offer.max_amount),
    Number(offer.available_amount),
  );
  const [amount, setAmount] = useState(
    String(Math.min(Number(offer.terms.principal), maximum) / 100),
  );
  const [count, setCount] = useState(String(offer.installment_count));
  const [frequency, setFrequency] = useState(offer.frequency);
  const [preview, setPreview] = useState<OfferPreview | null>(null);
  const [limits, setLimits] = useState<OfferPreview["limits"] | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const sequence = useRef(0);
  const offerRevision = JSON.stringify({
    version: offer.version,
    annual_rate_bps: offer.annual_rate_bps,
    frequency: offer.frequency,
    installment_count: offer.installment_count,
    terms: offer.terms,
    available_amount: offer.available_amount,
    status: offer.status,
  });
  useEffect(() => {
    const request = ++sequence.current;
    const controller = new AbortController();
    setPreview(null);
    setError(null);
    setPending(true);
    let principal: number;
    try {
      principal = cents(amount);
      if (
        !amount ||
        principal < Number(offer.min_amount) ||
        principal > maximum
      )
        throw new Error(
          `Choose an amount from ${money(offer.min_amount)} to ${money(maximum)}.`,
        );
    } catch (problem) {
      setPending(false);
      setError(problem);
      return () => controller.abort();
    }
    const timer = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          principal: String(principal),
          installment_count: count,
          frequency,
        });
        const next = await apiRequest<OfferPreview>(
          `/engagement/offers/${offer.id}/calculator?${params}`,
          { signal: controller.signal },
        );
        if (controller.signal.aborted || request !== sequence.current) return;
        setPreview(next);
        setLimits(next.limits);
      } catch (problem) {
        if (!controller.signal.aborted && request === sequence.current)
          setError(problem);
      } finally {
        if (!controller.signal.aborted && request === sequence.current)
          setPending(false);
      }
    }, 300);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [
    amount,
    count,
    frequency,
    offer.id,
    offer.min_amount,
    maximum,
    offerRevision,
  ]);
  useEffect(() => {
    onPreviewChange?.(preview);
  }, [preview, onPreviewChange]);
  const frequencies = limits?.frequencies || [
    "weekly",
    "twice_monthly",
    "monthly",
    "maturity",
  ];
  return (
    <div className="space-y-4">
      <section className={offerPanel} aria-labelledby="offer-calculator-title">
        <OfferSectionHeading
          id="offer-calculator-title"
          title="Plan your loan"
          description="Try an amount, payment frequency and number of payments to compare estimated costs."
          Icon={Calculator}
        />
        <div className="grid min-w-0 gap-4 md:grid-cols-[1.1fr_1fr_1fr]">
          <div className="min-w-0 space-y-2">
            <Label htmlFor="preview-amount" className="text-xs">
              Amount to explore (₱)
            </Label>
            <Input
              id="preview-amount"
              type="number"
              className="w-full min-w-0"
              min={Number(offer.min_amount) / 100}
              max={maximum / 100}
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              aria-describedby="preview-amount-limits"
            />
            <p
              id="preview-amount-limits"
              className="text-[10px] leading-relaxed text-muted-foreground"
            >
              {money(offer.min_amount)}–{money(maximum)} currently available
            </p>
          </div>
          <div className="min-w-0 space-y-2">
            <Label htmlFor="preview-frequency" className="text-xs">
              Payment frequency
            </Label>
            <Select
              value={frequency}
              onValueChange={(next) => {
                setFrequency(next);
                if (next === "maturity") setCount("1");
              }}
            >
              <SelectTrigger id="preview-frequency" className="w-full min-w-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {frequencies.map((value) => (
                  <SelectItem value={value} key={value}>
                    {label(value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-0 space-y-2">
            <Label htmlFor="preview-count" className="text-xs">
              Number of payments
            </Label>
            <Select
              value={count}
              onValueChange={setCount}
              disabled={frequency === "maturity"}
            >
              <SelectTrigger id="preview-count" className="w-full min-w-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from(
                  { length: limits?.max_installments || 24 },
                  (_, index) => index + 1,
                ).map((value) => (
                  <SelectItem value={String(value)} key={value}>
                    {value} {value === 1 ? "payment" : "payments"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
          Annual reducing-balance interest:{" "}
          <strong className="text-foreground">
            {(offer.annual_rate_bps / 100).toFixed(2)}%
          </strong>{" "}
          · proposed start: {date(offer.terms.effective_date)}
        </p>
        {pending && (
          <p
            role="status"
            className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"
          >
            <Loader2
              size={15}
              className="animate-spin motion-reduce:animate-none"
            />
            Updating your server-calculated preview…
          </p>
        )}
        {error !== null && (
          <div className="mt-4">
            <ErrorNotice error={error} />
          </div>
        )}
        <div
          className="mt-5 rounded-xl bg-muted/70 p-3 sm:p-4"
          aria-live="polite"
          aria-busy={pending}
        >
          <h3 className="mb-3 text-xs font-bold">Estimated payment summary</h3>
          <dl className="grid grid-cols-2 gap-4 min-[1100px]:grid-cols-4">
            {[
              [
                "Net amount received",
                preview ? money(preview.disclosure.net_proceeds as Money) : "—",
              ],
              [
                "First payment",
                preview ? money(preview.disclosure.schedule?.[0]?.total) : "—",
              ],
              [
                "Total interest",
                preview ? money(preview.disclosure.total_interest) : "—",
              ],
              [
                "Total repayment",
                preview ? money(preview.disclosure.total_repayment) : "—",
              ],
            ].map(([name, value]) => (
              <div key={name} className="flex min-w-0 flex-col">
                <dt className="order-2 mt-1 text-[10px] leading-relaxed text-muted-foreground">
                  {name}
                </dt>
                <dd className="order-1 break-words text-sm font-extrabold tabular-nums">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
        <p
          className={`mt-3 flex items-start gap-2 rounded-lg p-3 text-[11px] leading-relaxed ${preview?.simulation_only ? "bg-[var(--warning-background)] text-[var(--warning)]" : "bg-accent text-accent-foreground"}`}
        >
          <Info size={15} className="mt-0.5 shrink-0" />
          <span>
            {preview?.simulation_only ? (
              <>
                This is a comparison only. This lender’s actual offer uses{" "}
                {offer.installment_count} {label(offer.frequency).toLowerCase()}{" "}
                payments. The preview does not change those terms.
              </>
            ) : (
              "This is an estimate using the lender’s current terms. Final dates and costs require agreement review. No funds move when you calculate."
            )}
          </span>
        </p>
        {preview && canApply && offer.status === "published" && (
          <ActionLink
            to={`/applications/new?offer=${offer.id}&amount=${preview.terms.principal}`}
          >
            {preview.simulation_only
              ? "Use this amount with the original offer terms"
              : "Use this amount in a private request"}
          </ActionLink>
        )}
      </section>
      <OfferCostPanels preview={preview} pending={pending} />
    </div>
  );
}
