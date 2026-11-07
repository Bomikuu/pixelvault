import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { HandCoins, ArrowRight } from "lucide-react";
import { apiRequest } from "../../app/api";
import { useSession } from "../../app/session";
import {
  ActionLink,
  PageHeading,
  Loading,
  ErrorNotice,
  Empty,
  PersonName,
  Notice,
  Status,
} from "../../components";
import type { Person } from "@pixelvault/contracts";
import { money, date } from "../../lib/format";
import type { InvestmentFund } from "./types";
import { hubPanel } from "../memberhub/shared";
export function InvestmentsPage() {
  const { session } = useSession();
  const query = useQuery({
    queryKey: ["investment-portfolio", session?.member?.id],
    queryFn: () =>
      apiRequest<{
        funds: (InvestmentFund & {
          role: string;
          person: Person;
          offer_title: string;
          room_id: string;
          share_bps: number;
        })[];
        notice: string;
        limit: number;
      }>("/investments/portfolio"),
    refetchInterval: 15000,
    refetchIntervalInBackground: false,
  });
  return (
    <div className="space-y-5">
      <PageHeading
        title="Contributions, with a shared record."
        description="Track your test contributions, allocated capital, collected-interest shares and mutual payout confirmations."
        action={
          <ActionLink to="/investment-discussions" variant="outline">
            Investment discussions
            <ArrowRight size={16} />
          </ActionLink>
        }
      />
      <Notice>
        All funding and payout confirmations here are simulations. Live
        investment origination and external transfers remain disabled.
      </Notice>
      {query.isPending ? (
        <Loading text="Opening your investment records…" />
      ) : query.error ? (
        <ErrorNotice error={query.error} retry={() => void query.refetch()} />
      ) : query.data?.funds.length ? (
        <div className="space-y-4">
          {query.data.funds.map((fund) => (
            <section className={hubPanel} key={fund.id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <PersonName
                  person={fund.person}
                  subtitle={
                    fund.role === "investor"
                      ? "You contributed to this lender"
                      : "You received this contribution"
                  }
                />
                <Status value={fund.status} />
              </div>
              <h2 className="mt-4 text-base font-extrabold">
                {fund.offer_title}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Confirmed {date(fund.confirmed_at)} ·{" "}
                {(fund.share_bps / 100).toFixed(2)}% of attributable collected
                interest
              </p>
              <dl className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
                {[
                  ["Contribution", fund.position.contributed],
                  ["Capital exposure", fund.position.capital_exposure],
                  ["Net earnings due", fund.position.earnings_due],
                  ["Principal returned", fund.position.principal_returned],
                ].map(([name, value]) => (
                  <div key={name}>
                    <dt className="text-xs text-muted-foreground">{name}</dt>
                    <dd className="mt-1 break-words text-lg font-extrabold tabular-nums">
                      {money(value)}
                    </dd>
                  </div>
                ))}
              </dl>
              <details className="mt-4 border-t border-border pt-2">
                <summary className="cursor-pointer py-2 text-sm font-semibold text-primary">
                  Capital allocation & payout history
                </summary>
                <p className="my-3 text-sm text-muted-foreground">
                  Unallocated capital: {money(fund.position.unallocated)} ·
                  Allocated loss: {money(fund.position.recorded_loss)} ·
                  Separate lender-paid test fee:{" "}
                  {money(fund.position.platform_fee)}
                </p>
                {fund.allocations.length ? (
                  fund.allocations.map((row) => (
                    <p key={row.id} className="py-2 text-sm">
                      Loan {row.loan_reference} · {money(row.amount)} allocated
                      · {row.status}
                    </p>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No newly funded loan has used this contribution.
                  </p>
                )}
                {fund.payouts.length ? (
                  fund.payouts.map((row) => (
                    <div
                      className="flex flex-wrap justify-between gap-2 border-t border-border py-3 text-sm"
                      key={row.id}
                    >
                      <span>
                        {date(row.created_at)} · Principal{" "}
                        {money(row.principal)} · Earnings {money(row.earnings)}
                      </span>
                      <Status value={row.status} />
                    </div>
                  ))
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">
                    No payout proposals yet.
                  </p>
                )}
              </details>
              <Link
                to={`/meetings/${fund.room_id}`}
                className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-primary!"
              >
                Open shared agreement
                <ArrowRight size={16} />
              </Link>
            </section>
          ))}
        </div>
      ) : (
        <Empty
          title="A contribution starts with a conversation."
          icon={HandCoins}
          action={
            <ActionLink to="/investment-discussions">
              Open investment discussions
            </ActionLink>
          }
        >
          Negotiate a proposal, review evidence and accept the same test
          agreement. A pending pitch does not add money to an offer.
        </Empty>
      )}
      <p className="text-sm leading-relaxed text-muted-foreground">
        {query.data?.notice ||
          "Principal, collected interest, platform fees and settlement are separate facts. No guaranteed return or withdrawable balance is shown."}
      </p>
    </div>
  );
}
