import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Bookmark, Scale, Trash2 } from "lucide-react";
import {
  Button,
  Checkbox,
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
import type { Disclosure, Terms } from "@pixelvault/contracts";
import { apiRequest } from "../../app/api";
import {
  PageHeading,
  Loading,
  ErrorNotice,
  Empty,
  ActionLink,
  PersonName,
} from "../../components";
import { money, date, label } from "../../lib/format";
import { hubPanel, useSavedOffers } from "./shared";
function amountValue(value: string) {
  if (value.length > 20 || !/^\d+(\.\d{0,2})?$/.test(value)) return null;
  const [whole, fraction = ""] = value.split(".");
  const exact = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  return exact > 0n && exact <= BigInt(Number.MAX_SAFE_INTEGER)
    ? Number(exact)
    : null;
}
export function SavedOffers() {
  const saved = useSavedOffers();
  const [selected, setSelected] = useState<string[]>([]),
    [amount, setAmount] = useState("1000"),
    [frequency, setFrequency] = useState("monthly"),
    [count, setCount] = useState("3"),
    [settledAmount, setSettledAmount] = useState("1000"),
    [error, setError] = useState<unknown>(),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSettledAmount(amount), 350);
    return () => clearTimeout(timer);
  }, [amount]);
  const offers = (saved.data?.saved || []).filter(
    (item) => selected.includes(item.id) && item.offer && item.available,
  );
  const ids = offers.map((item) => item.id),
    principal = amountValue(settledAmount);
  const previews = useQuery({
    queryKey: ["offer-comparison", ids.join(","), principal, frequency, count],
    enabled: ids.length >= 2 && principal !== null,
    queryFn: async () =>
      Promise.all(
        ids.map(async (id) => {
          try {
            return {
              id,
              result: await apiRequest<{
                terms: Terms;
                disclosure: Disclosure;
              }>(
                `/engagement/offers/${id}/calculator?${new URLSearchParams({ principal: String(principal), frequency, installment_count: count })}`,
              ),
            };
          } catch (problem) {
            return {
              id,
              error:
                problem instanceof Error
                  ? problem.message
                  : "Preview unavailable. Try again.",
            };
          }
        }),
      ),
  });
  async function remove(id: string) {
    setBusy(true);
    setError(undefined);
    try {
      await apiRequest(`/hub/saved-offers/${id}`, {
        method: "PUT",
        body: JSON.stringify({ saved: false }),
      });
      setSelected(selected.filter((value) => value !== id));
      await saved.refetch();
    } catch (problem) {
      setError(problem);
    } finally {
      setBusy(false);
    }
  }
  const measures: {
    name: string;
    value: (result: { terms: Terms; disclosure: Disclosure }) => string;
  }[] = [
    { name: "Amount explored", value: (r) => money(r.terms.principal) },
    {
      name: "Number of payments",
      value: (r) => String(r.terms.installment_count),
    },
    { name: "Frequency", value: (r) => label(r.terms.frequency) },
    {
      name: "Proposed start",
      value: (r) => date(String(r.terms.effective_date)),
    },
    {
      name: "Annual reducing rate",
      value: (r) => `${(r.terms.annual_rate_bps / 100).toFixed(2)}%`,
    },
    {
      name: "Total interest",
      value: (r) => money(r.disclosure.total_interest),
    },
    {
      name: "Total repayment",
      value: (r) => money(r.disclosure.total_repayment),
    },
    {
      name: "First payment date",
      value: (r) => date(r.disclosure.schedule?.[0]?.due_date),
    },
    {
      name: "First payment",
      value: (r) => money(r.disclosure.schedule?.[0]?.total),
    },
  ];
  return (
    <div className="space-y-6">
      <PageHeading
        title="Keep your options together."
        description="Your saved offers are private. Compare current terms before starting an application."
        action={
          <ActionLink to="/explore?view=list" variant="outline">
            <Bookmark size={16} />
            Find offers
          </ActionLink>
        }
      />
      {error !== undefined && <ErrorNotice error={error} />}
      {saved.isPending ? (
        <Loading text="Opening your saved offers…" />
      ) : saved.error ? (
        <ErrorNotice error={saved.error} retry={() => void saved.refetch()} />
      ) : !saved.data?.saved.length ? (
        <Empty
          title="An offer worth another look?"
          icon={Bookmark}
          action={
            <ActionLink to="/explore?view=list">
              Explore lending offers
            </ActionLink>
          }
        >
          Use Save offer on an offer page or list card. You can keep up to 50
          and compare three at a time.
        </Empty>
      ) : (
        <section
          className={`${hubPanel} divide-y divide-border p-0!`}
          aria-label="Saved offers"
        >
          {saved.data.saved.map((item) => (
            <div
              className="flex flex-wrap items-center gap-3 p-4"
              key={item.id}
            >
              <div className="flex min-h-11 items-center gap-3">
                <Checkbox
                  id={`compare-${item.id}`}
                  checked={selected.includes(item.id)}
                  disabled={
                    !item.available ||
                    (!selected.includes(item.id) && selected.length >= 3)
                  }
                  onCheckedChange={(value) =>
                    setSelected(
                      value
                        ? [...selected, item.id]
                        : selected.filter((id) => id !== item.id),
                    )
                  }
                />
                <Label htmlFor={`compare-${item.id}`} className="sr-only">
                  Compare {item.offer?.title || "unavailable offer"}
                </Label>
              </div>
              <div className="min-w-0 flex-1">
                {item.offer ? (
                  <>
                    <Link
                      to={`/offers/${item.id}`}
                      className="block text-sm font-bold text-foreground! hover:text-primary!"
                    >
                      {item.offer.title}
                    </Link>
                    <div className="mt-2">
                      <PersonName
                        person={item.offer.lender}
                        subtitle={`${money(item.offer.available_amount)} currently available`}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <strong className="text-sm">
                      This saved offer is no longer public.
                    </strong>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Remove it or choose another current offer.
                    </p>
                  </>
                )}
              </div>
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() => void remove(item.id)}
                aria-label={`Remove ${item.offer?.title || "unavailable offer"} from saved offers`}
              >
                <Trash2 size={16} />
                <span className="hidden sm:inline">Remove</span>
              </Button>
            </div>
          ))}
        </section>
      )}
      {!!saved.data?.saved.length && (
        <section
          className={`${hubPanel} space-y-5`}
          aria-labelledby="compare-heading"
        >
          <div>
            <h2
              id="compare-heading"
              className="flex items-center gap-2 text-lg font-extrabold"
            >
              <Scale className="size-5 text-primary" />
              Compare the same plan
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Choose two or three saved offers, then use one amount, frequency
              and payment count. Proposed start dates remain each lender’s;
              these previews are not ranked as identical quotes.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="compare-amount">Amount to compare (₱)</Label>
              <Input
                id="compare-amount"
                className="mt-2 text-base!"
                inputMode="decimal"
                maxLength={20}
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                aria-invalid={principal === null}
              />
            </div>
            <div>
              <Label htmlFor="compare-frequency">Payment frequency</Label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger id="compare-frequency" className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["weekly", "twice_monthly", "monthly", "maturity"].map(
                    (value) => (
                      <SelectItem value={value} key={value}>
                        {label(value)}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="compare-count">Number of payments</Label>
              <Select value={count} onValueChange={setCount}>
                <SelectTrigger id="compare-count" className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 6, 9, 12, 18, 24].map((value) => (
                    <SelectItem value={String(value)} key={value}>
                      {value} payments
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {principal === null ? (
            <p role="alert" className="text-sm text-destructive">
              Enter a positive amount with at most two decimal places.
            </p>
          ) : ids.length < 2 ? (
            <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
              Select {2 - ids.length} more offer{ids.length === 0 ? "s" : ""} to
              compare. Up to three can be selected.
            </p>
          ) : previews.isFetching || amount !== settledAmount ? (
            <Loading text="Calculating the same plan for each lender…" />
          ) : previews.error ? (
            <ErrorNotice
              error={previews.error}
              retry={() => void previews.refetch()}
            />
          ) : (
            <div
              role="region"
              aria-label="Offer comparison"
              tabIndex={0}
              className="overflow-x-auto rounded-xl border border-border focus-visible:outline-2 focus-visible:outline-ring [&_[data-slot=table-container]]:overflow-visible!"
            >
              <p className="p-3 text-xs text-muted-foreground md:hidden">
                Scroll horizontally to compare every lender.
              </p>
              <Table className="min-w-[640px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Plan details</TableHead>
                    {offers.map((item) => (
                      <TableHead key={item.id} className="min-w-48">
                        {item.offer!.lender.display_name}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {measures.map((measure) => (
                    <TableRow key={measure.name}>
                      <TableCell className="font-semibold">
                        {measure.name}
                      </TableCell>
                      {offers.map((item) => {
                        const preview = previews.data?.find(
                          (value) => value.id === item.id,
                        );
                        return (
                          <TableCell key={item.id} className="tabular-nums">
                            {preview?.result
                              ? measure.value(preview.result)
                              : "Unavailable"}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell>Next step</TableCell>
                    {offers.map((item) => {
                      const preview = previews.data?.find(
                        (value) => value.id === item.id,
                      );
                      return (
                        <TableCell key={item.id}>
                          {preview?.error ? (
                            <p className="max-w-60 text-sm text-destructive">
                              {preview.error}
                            </p>
                          ) : (
                            <Link
                              to={`/offers/${item.id}?amount=${principal}`}
                              className="inline-flex min-h-11 items-center gap-2 text-primary!"
                            >
                              Review original terms
                              <ArrowRight size={15} />
                            </Link>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
          <p className="text-sm leading-relaxed text-muted-foreground">
            Comparing changes no offer or application. Applications use each
            lender’s original payment frequency and count. Availability and
            final terms are checked again by the server.
          </p>
        </section>
      )}
    </div>
  );
}
