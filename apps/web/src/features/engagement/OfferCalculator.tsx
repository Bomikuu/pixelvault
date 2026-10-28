import { useEffect, useRef, useState } from "react";
import type { Offer } from "@pixelvault/contracts";
import {
  Input,
  Label,
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
import { Calculator, Loader2 } from "lucide-react";
import {
  ActionLink,
  DefinitionList,
  ErrorNotice,
  Notice,
} from "../../components";
import { apiRequest } from "../../app/api";
import { cents, date, label, money } from "../../lib/format";
import type { OfferPreview } from "./types";
import "./engagement.css";
export function OfferCalculator({
  offer,
  canApply = true,
}: {
  offer: Offer;
  canApply?: boolean;
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
  const frequencies = limits?.frequencies || [
    "weekly",
    "twice_monthly",
    "monthly",
    "maturity",
  ];
  return (
    <section
      className="surface offer-calculator"
      aria-labelledby="offer-calculator-title"
    >
      <div className="offer-section-heading">
        <Calculator size={21} />
        <div>
          <h2 id="offer-calculator-title">Find a plan you can understand.</h2>
          <p>
            Compare an amount and repayment rhythm using the server’s exact
            calculation.
          </p>
        </div>
      </div>
      <div className="offer-calculator-controls">
        <div className="field">
          <Label htmlFor="preview-amount">Amount to explore (₱)</Label>
          <Input
            id="preview-amount"
            type="number"
            min={Number(offer.min_amount) / 100}
            max={maximum / 100}
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
          <small>
            {money(offer.min_amount)}–{money(maximum)} currently available
          </small>
        </div>
        <div className="field">
          <Label htmlFor="preview-frequency">Payment frequency</Label>
          <Select
            value={frequency}
            onValueChange={(next) => {
              setFrequency(next);
              if (next === "maturity") setCount("1");
            }}
          >
            <SelectTrigger id="preview-frequency">
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
        <div className="field">
          <Label htmlFor="preview-count">Number of payments</Label>
          <Select
            value={count}
            onValueChange={setCount}
            disabled={frequency === "maturity"}
          >
            <SelectTrigger id="preview-count">
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
      <p className="offer-calculator-fixed">
        Annual reducing-balance interest:{" "}
        <strong>{(offer.annual_rate_bps / 100).toFixed(2)}%</strong> · proposed
        start: {date(offer.terms.effective_date)}
      </p>
      {pending && (
        <p className="offer-calculator-pending" role="status">
          <Loader2 size={16} className="spin" />
          Updating your server-calculated preview…
        </p>
      )}
      {error !== null && <ErrorNotice error={error} />}
      {preview && (
        <div className="offer-calculator-result" aria-live="polite">
          <DefinitionList
            rows={[
              [
                "Net amount received",
                money(preview.disclosure.net_proceeds as number),
              ],
              [
                "Interest across this plan",
                money(preview.disclosure.total_interest),
              ],
              ["Total repayment", money(preview.disclosure.total_repayment)],
              [
                "Effective annual interest",
                `${preview.disclosure.effective_annual_percentage}%`,
              ],
              ["Platform commission on repayments", money(0)],
            ]}
          />
          {preview.simulation_only ? (
            <Notice tone="warning">
              This is a comparison only. This lender’s actual offer uses{" "}
              {offer.installment_count} {label(offer.frequency).toLowerCase()}{" "}
              payments. The preview does not change those terms.
            </Notice>
          ) : (
            <Notice>
              This preview uses the lender’s original payment frequency and
              installment count. Final dates and costs still require agreement
              review.
            </Notice>
          )}
          <details className="offer-preview-schedule">
            <summary>
              See all {preview.disclosure.schedule?.length || 0} payment dates
            </summary>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Due date</TableHead>
                  <TableHead>Principal</TableHead>
                  <TableHead>Interest</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.disclosure.schedule?.map((line, index) => (
                  <TableRow key={`${line.due_date}-${index}`}>
                    <TableCell>{date(line.due_date)}</TableCell>
                    <TableCell>{money(line.principal)}</TableCell>
                    <TableCell>{money(line.interest)}</TableCell>
                    <TableCell>{money(line.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </details>
          {canApply && offer.status === "published" && (
            <ActionLink
              to={`/applications/new?offer=${offer.id}&amount=${preview.terms.principal}`}
            >
              {preview.simulation_only
                ? "Use this amount with the original offer terms"
                : "Use this amount in a private request"}
            </ActionLink>
          )}
        </div>
      )}
      <p className="small-text">
        No funds move when you calculate. Different preview terms are never
        submitted as part of your application.
      </p>
    </section>
  );
}
