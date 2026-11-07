import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQueries } from "@tanstack/react-query";
import {
  Bookmark,
  CalendarDays,
  CheckCheck,
  ChevronRight,
  FileText,
  MessageCircle,
} from "lucide-react";
import { Checkbox } from "@pixelvault/ui";
import type {
  ApiSchemas,
  Disclosure,
  InvestmentFund,
  Offer,
  Person,
  Terms,
} from "@pixelvault/contracts";
import {
  Action,
  Button,
  Empty,
  ErrorState,
  Field,
  Heading,
  Loading,
  Note,
  Page,
  Panel,
  PersonLine,
  Picker,
  Status,
  date,
  money,
} from "../../components/ui";
import { api, post, saveFile } from "../../app/api";
import { useMemberQuery } from "../../app/session";
import { type ActionUpdate, mobileHref } from "../home/HomeScreen";
import { toCentavos } from "../offers/OfferScreen";
export function ActivityScreen() {
  const query = useMemberQuery<{ actions: ActionUpdate[]; unread: number }>(
    ["actions"],
    "/hub/actions",
    { interval: 15_000 },
  );
  const [kind, setKind] = useState("all"),
    [unread, setUnread] = useState(false),
    [error, setError] = useState<unknown>(null),
    [busy, setBusy] = useState(false);
  const rows = (query.data?.actions || []).filter(
    (row) => (kind === "all" || row.kind === kind) && (!unread || !row.read),
  );
  async function mark(keys: string[]) {
    setBusy(true);
    setError(null);
    try {
      await post("/hub/actions", { keys });
      await query.refetch();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Page
      title="Your activity"
      description="Private updates and dates that need your attention."
      action={
        <Action to="/calendar" variant="outline">
          <CalendarDays className="size-5" />
          <span className="sr-only">Payment calendar</span>
        </Action>
      }
    >
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="Activity filters"
      >
        {[
          ["all", "All"],
          ["payment", "Payments"],
          ["application", "Applications"],
          ["meeting", "Meetings"],
          ["message", "Messages"],
          ["verification", "Checks"],
        ].map(([value, name]) => (
          <Button
            variant={kind === value ? "secondary" : "outline"}
            key={value}
            onClick={() => setKind(value)}
            aria-pressed={kind === value}
            className="min-h-11 rounded-full text-xs"
          >
            {name}
          </Button>
        ))}
        <Button
          variant={unread ? "secondary" : "ghost"}
          className="min-h-11 rounded-full text-xs"
          aria-pressed={unread}
          onClick={() => setUnread(!unread)}
        >
          Unread only
        </Button>
      </div>
      {error !== null && <ErrorState error={error} />}
      <Button
        variant="ghost"
        className="w-full justify-start! px-0! text-sm"
        disabled={busy || !rows.some((row) => !row.read)}
        onClick={() =>
          void mark(rows.filter((row) => !row.read).map((row) => row.key))
        }
      >
        <CheckCheck />
        Mark displayed updates read
      </Button>
      {query.isPending ? (
        <Loading />
      ) : query.error ? (
        <ErrorState error={query.error} retry={() => query.refetch()} />
      ) : !rows.length ? (
        <Empty title="You’re caught up." scene="community-workshop">
          New applications, payments, meetings and checks will appear here.
        </Empty>
      ) : (
        <div className="divide-y divide-border">
          {rows.map((row) => (
            <article key={row.key} className="py-4">
              <Link
                to={mobileHref(row.href)}
                onClick={() => {
                  if (!row.read) void mark([row.key]);
                }}
                className={`flex min-h-16 items-start gap-3 rounded-lg ${row.read ? "text-muted-foreground" : "text-foreground"}`}
              >
                <FileText className="mt-1 size-5 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-bold">
                    {row.title}
                    {!row.read && (
                      <span className="ml-2 text-xs font-normal text-primary">
                        Unread
                      </span>
                    )}
                  </h2>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {row.detail}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {date(row.at)}
                    {row.urgent ? " — needs attention" : ""}
                  </p>
                </div>
                <ChevronRight className="mt-1 size-4 shrink-0" />
              </Link>
            </article>
          ))}
        </div>
      )}
      <p className="text-xs leading-relaxed text-muted-foreground">
        Reading an update does not dismiss a payment obligation. Open the loan
        for its current balance and schedule.
      </p>
    </Page>
  );
}
type CalendarEvent = ApiSchemas["schemas"]["CalendarEvent"];
export function CalendarScreen() {
  const [role, setRole] = useState("borrower"),
    [start, setStart] = useState(() => {
      const parts = new Intl.DateTimeFormat("en-CA", {
        year: "numeric",
        month: "2-digit",
        timeZone: "Asia/Manila",
      }).formatToParts(new Date());
      return `${parts.find((p) => p.type === "year")?.value}-${parts.find((p) => p.type === "month")?.value}-01`;
    }),
    [error, setError] = useState<unknown>(null);
  const end = useMemo(() => {
    const date = new Date(`${start}T12:00:00+08:00`);
    date.setUTCMonth(date.getUTCMonth() + 1);
    return date.toISOString().slice(0, 10);
  }, [start]);
  const params = new URLSearchParams({ role, start, end });
  const query = useMemberQuery<{ events: CalendarEvent[]; notice: string }>(
    ["calendar", role, start],
    `/hub/calendar?${params}`,
  );
  return (
    <Page
      title="Your payment calendar"
      description="Contractual dates in Manila time. Coverage is not lender settlement."
      back
    >
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Period starts"
          name="start"
          type="date"
          value={start}
          onChange={(e) => {
            if (e.target.value) setStart(e.target.value);
          }}
        />
        <Picker
          label="Perspective"
          value={role}
          onChange={setRole}
          options={[
            { value: "borrower", label: "Borrowing" },
            { value: "lender", label: "Lending" },
          ]}
        />
      </div>
      <Button
        variant="outline"
        className="w-full"
        onClick={async () => {
          setError(null);
          try {
            await saveFile(`/hub/calendar/export?${params}`);
          } catch (e) {
            setError(e);
          }
        }}
      >
        <CalendarDays />
        Export dates only
      </Button>
      {error !== null && <ErrorState error={error} />}
      {query.isPending ? (
        <Loading />
      ) : query.error ? (
        <ErrorState error={query.error} retry={() => query.refetch()} />
      ) : !query.data?.events.length ? (
        <Empty title="No payment dates in this period." scene="lending-journey">
          Your confirmed funded loans and current signed schedules determine
          this calendar.
        </Empty>
      ) : (
        <div className="space-y-3">
          {query.data.events.map((event) => (
            <Link
              key={event.id}
              to={`/loans/${event.loan_id}`}
              className="block rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold">{date(event.due_date)}</p>
                <Status value={event.status} />
              </div>
              <PersonLine
                person={event.person}
                subtitle={`Payment ${event.sequence}`}
              />
              <div className="mt-3 flex justify-between gap-3 text-sm">
                <span className="text-muted-foreground">
                  Remaining on this scheduled date
                </span>
                <strong className="tabular-nums">
                  {money(event.remaining)}
                </strong>
              </div>
            </Link>
          ))}
        </div>
      )}
      {query.data && <Note>{query.data.notice}</Note>}
    </Page>
  );
}
type Saved = ApiSchemas["schemas"]["SavedOffer"];
export function SavedScreen() {
  const query = useMemberQuery<{ saved: Saved[]; limit: number }>(
    ["saved"],
    "/hub/saved-offers",
  );
  const [selected, setSelected] = useState<string[]>([]),
    [amount, setAmount] = useState("1000.00"),
    [frequency, setFrequency] = useState("monthly"),
    [count, setCount] = useState("3"),
    [error, setError] = useState<unknown>(null);
  const offers = (query.data?.saved || [])
    .filter((row) => selected.includes(row.id) && row.available && row.offer)
    .map((row) => row.offer!);
  let principal = 0;
  try {
    principal = toCentavos(amount);
  } catch {}
  const comparisons = useQueries({
    queries: offers.map((offer) => ({
      queryKey: ["mobile-comparison", offer.id, principal, frequency, count],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        api<{ terms: Terms; disclosure: Disclosure; notice: string }>(
          `/engagement/offers/${offer.id}/calculator?${new URLSearchParams({ principal: String(principal), frequency, installment_count: count })}`,
          { signal },
        ),
      enabled: offers.length >= 2 && principal > 0,
      retry: false,
    })),
  });
  return (
    <Page
      title="A shortlist worth reviewing."
      description="Choose two or three current offers to compare the same amount and payment plan."
      back
    >
      {error !== null && <ErrorState error={error} />}
      {query.isPending ? (
        <Loading />
      ) : query.error ? (
        <ErrorState error={query.error} retry={() => query.refetch()} />
      ) : !query.data?.saved.length ? (
        <Empty
          title="Keep a few possibilities close."
          scene="shared-plan"
          action={
            <Action to="/explore">
              <Bookmark />
              Explore offers
            </Action>
          }
        >
          Save an offer from discovery, then return here to compare its
          disclosed costs.
        </Empty>
      ) : (
        <div className="space-y-3">
          {query.data.saved.map((row) => (
            <section
              key={row.id}
              className="rounded-2xl border border-border bg-card p-4"
            >
              {row.offer ? (
                <>
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id={`compare-${row.id}`}
                      checked={selected.includes(row.id)}
                      disabled={
                        !selected.includes(row.id) && selected.length >= 3
                      }
                      aria-label={`Compare ${row.offer.title}`}
                      onCheckedChange={(checked) =>
                        setSelected((ids) =>
                          checked
                            ? [...ids, row.id]
                            : ids.filter((id) => id !== row.id),
                        )
                      }
                    />
                    <Link
                      to={`/offers/${row.id}`}
                      className="flex-1 text-sm font-bold"
                    >
                      {row.offer.title}
                    </Link>
                  </div>
                  <PersonLine
                    person={row.offer.lender}
                    subtitle={money(row.offer.available_amount)}
                  />
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  This saved offer is no longer available.
                </p>
              )}
              <Button
                variant="ghost"
                className="mt-2 min-h-11 w-full text-sm"
                onClick={async () => {
                  try {
                    await api(`/hub/saved-offers/${row.id}`, {
                      method: "PUT",
                      body: JSON.stringify({ saved: false }),
                    });
                    setSelected((ids) => ids.filter((id) => id !== row.id));
                    await query.refetch();
                  } catch (e) {
                    setError(e);
                  }
                }}
              >
                Remove saved offer
              </Button>
            </section>
          ))}
        </div>
      )}
      {offers.length >= 2 && (
        <section className="space-y-4">
          <Heading>Compare a common plan</Heading>
          <Field
            label="Amount (₱)"
            name="compare_amount"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <Picker
              label="Frequency"
              value={frequency}
              onChange={setFrequency}
              options={["weekly", "twice_monthly", "monthly", "maturity"].map(
                (value) => ({ value, label: value.replaceAll("_", " ") }),
              )}
            />
            <Picker
              label="Payments"
              value={count}
              onChange={setCount}
              options={["1", "2", "3", "6", "12"].map((value) => ({
                value,
                label: value,
              }))}
            />
          </div>
          <Note>
            Effective dates can differ. These are dated cost examples, not a
            cheapest-offer ranking or a replacement for original application
            terms.
          </Note>
          {offers.map((offer, index) => {
            const result = comparisons[index];
            return (
              <Panel key={offer.id}>
                <PersonLine person={offer.lender} subtitle={offer.title} />
                {result.isPending ? (
                  <Loading />
                ) : result.error ? (
                  <ErrorState error={result.error} />
                ) : (
                  result.data && (
                    <dl className="mt-4 space-y-3 text-sm">
                      {[
                        [
                          "Effective date",
                          date(result.data.terms.effective_date),
                        ],
                        [
                          "Estimated interest",
                          money(result.data.disclosure.total_interest),
                        ],
                        [
                          "Total repayment",
                          money(result.data.disclosure.total_repayment),
                        ],
                      ].map(([name, value]) => (
                        <div key={name} className="flex justify-between gap-3">
                          <dt className="text-muted-foreground">{name}</dt>
                          <dd className="font-bold tabular-nums">{value}</dd>
                        </div>
                      ))}
                    </dl>
                  )
                )}
              </Panel>
            );
          })}
        </section>
      )}
    </Page>
  );
}
export function DecisionsScreen() {
  const query = useMemberQuery<{
    applications: {
      id: string;
      title: string;
      offer_title: string;
      borrower: Person;
      amount: string;
      status: string;
      created_at: string;
      reservation_expires_at: string | null;
    }[];
    meetings: {
      id: string;
      person: Person;
      title: string;
      scheduled_at: string | null;
      state: string;
    }[];
  }>(["decisions"], "/hub/decisions");
  return (
    <Page
      title="Your lender decisions"
      description="Current private requests, ordered by their actual application history."
      back
    >
      {query.isPending ? (
        <Loading />
      ) : query.error ? (
        <ErrorState error={query.error} retry={() => query.refetch()} />
      ) : (
        <>
          <section>
            <Heading>Open applications</Heading>
            {query.data?.applications.map((row) => (
              <Link
                to={`/applications/${row.id}`}
                key={row.id}
                className="mb-3 block rounded-2xl border border-border bg-card p-4"
              >
                <PersonLine person={row.borrower} subtitle={row.offer_title} />
                <div className="mt-3 flex justify-between gap-3">
                  <strong className="tabular-nums">{money(row.amount)}</strong>
                  <Status value={row.status} />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {date(row.created_at)}
                  {row.reservation_expires_at
                    ? ` — reservation ends ${date(row.reservation_expires_at)}`
                    : ""}
                </p>
              </Link>
            ))}
            {!query.data?.applications.length && (
              <Note>No open applications currently need a decision.</Note>
            )}
          </section>
          <section>
            <Heading>Meeting follow-ups</Heading>
            {query.data?.meetings.map((row) => (
              <Link
                key={row.id}
                to={`/meetings/${row.id}`}
                className="mb-3 block border-b border-border pb-3"
              >
                <PersonLine person={row.person} subtitle={row.title} />
                <p className="mt-2 text-xs text-muted-foreground">
                  {date(row.scheduled_at)}
                </p>
              </Link>
            ))}
            {!query.data?.meetings.length && (
              <Note>No meetings currently need follow-up.</Note>
            )}
          </section>
        </>
      )}
      <Note>
        Community XP does not determine affordability or eligibility. Review the
        member’s actual application and disclosed terms.
      </Note>
    </Page>
  );
}
type Fund = InvestmentFund & {
  role: string;
  person: Person;
  offer_title: string;
  room_id: string;
  share_bps: number;
};
export function InvestmentsScreen() {
  const query = useMemberQuery<{ funds: Fund[]; notice: string }>(
    ["investments"],
    "/investments/portfolio",
  );
  return (
    <Page
      title="Your investment agreements"
      description="Private, attributed positions. Every funding and payout confirmation here is simulated."
      back
    >
      {query.isPending ? (
        <Loading />
      ) : query.error ? (
        <ErrorState error={query.error} retry={() => query.refetch()} />
      ) : !query.data?.funds.length ? (
        <Empty
          title="No confirmed contributions yet."
          scene="shared-plan"
          action={
            <Action to="/meetings" variant="outline">
              Review your meetings
            </Action>
          }
        >
          A pitch becomes a position only after the exact contract and separate
          test funding are mutually confirmed.
        </Empty>
      ) : (
        <div className="space-y-4">
          {query.data.funds.map((fund) => (
            <Panel key={fund.id}>
              <PersonLine person={fund.person} subtitle={fund.offer_title} />
              <p className="mt-3 text-xs text-muted-foreground">
                You are the {fund.role}. Interest share:{" "}
                {(fund.share_bps / 100).toFixed(2)}%.
              </p>
              <dl className="mt-4 grid grid-cols-2 gap-4">
                {[
                  ["Contributed", fund.position.contributed],
                  ["Attributed earnings", fund.position.earnings],
                  ["Unused capital", fund.position.unallocated],
                  ["Recorded loss", fund.position.recorded_loss],
                  ["Principal returned", fund.position.principal_returned],
                  ["Earnings paid", fund.position.earnings_paid],
                ].map(([name, value]) => (
                  <div key={name}>
                    <dt className="text-xs text-muted-foreground">{name}</dt>
                    <dd className="mt-1 text-base font-bold tabular-nums">
                      {money(value)}
                    </dd>
                  </div>
                ))}
              </dl>
              <Action
                to={`/meetings/${fund.room_id}`}
                className="mt-5 w-full"
                variant="outline"
              >
                <MessageCircle />
                Open conversation and records
              </Action>
            </Panel>
          ))}
        </div>
      )}
      {query.data && <Note>{query.data.notice}</Note>}
    </Page>
  );
}
