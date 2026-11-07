import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCheck, Download, FileText, FlaskConical } from "lucide-react";
import { Button, Checkbox, Label } from "@pixelvault/ui";
import { Notice } from "../../components";
import { money, date } from "../../lib/format";
import type { Meeting } from "../negotiations/types";
type Act = (data: Record<string, unknown>) => Promise<Meeting | null>;
export function InvestmentContractPanel({
  room,
  memberId,
  lender,
  busy,
  act,
}: {
  room: Meeting;
  memberId?: string;
  lender: boolean;
  busy: boolean;
  act: Act;
}) {
  const [accept, setAccept] = useState(false),
    [simulate, setSimulate] = useState(false),
    [unused, setUnused] = useState(false);
  const agreement = room.investment;
  useEffect(() => {
    setAccept(false);
    setSimulate(false);
  }, [agreement?.hash]);
  const ready = room.both_here && !busy && room.state !== "closed";
  const signed = agreement?.approvals.some(
    (row) => row.kind === "contract" && row.member_id === memberId,
  );
  const fundingAck = agreement?.approvals.some(
    (row) => row.kind === "funding" && row.member_id === memberId,
  );
  const pending = agreement?.fund?.payouts.find(
    (row) => row.status === "awaiting_investor",
  );
  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-xl! font-extrabold!">
          Read together. Accept for yourself.
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Every commercial term is frozen into one exact test agreement. Each
          person accepts separately; funding needs a second mutual confirmation.
        </p>
      </div>
      <Notice>
        Test mode only. Contracts, contribution confirmations and payouts here
        are synthetic. No real funds move.
      </Notice>
      {!agreement ? (
        <>
          <dl className="space-y-3 rounded-xl bg-muted p-4 text-sm">
            <div className="flex flex-wrap justify-between gap-2">
              <dt>Contribution</dt>
              <dd className="font-bold">{money(room.proposal.amount)}</dd>
            </div>
            <div className="flex flex-wrap justify-between gap-2">
              <dt>Share of attributable collected interest</dt>
              <dd className="font-bold">
                {((room.proposal.share_bps || 0) / 100).toFixed(2)}%
              </dd>
            </div>
            <div className="flex flex-wrap justify-between gap-2">
              <dt>Separate lender-paid test fee</dt>
              <dd className="font-bold">
                {room.proposal.fee_policy
                  ? `${(room.proposal.fee_policy.bps / 100).toFixed(2)}%`
                  : "Publish updated proposal"}
              </dd>
            </div>
          </dl>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Confirmed contributions fund new loans in first-in, first-out order.
            Capital is not automatically reinvested. The investor bears
            allocated losses; capital and earnings are not guaranteed. Collected
            principal and jointly agreed unused-capital returns repay capital
            separately from earnings.
          </p>
          {!room.proposal.fee_policy && (
            <Notice tone="warning">
              This older proposal does not contain the new test fee and
              allocation terms. The lender must publish a revised proposal; both
              people must review it again.
            </Notice>
          )}
          {lender && (
            <Button
              disabled={
                !ready || !room.both_approved || !room.evidence_reviewed
              }
              onClick={() => void act({ action: "prepare" })}
            >
              <FileText size={16} />
              Prepare exact test agreement
            </Button>
          )}
          <p className="text-xs text-muted-foreground">
            Both people must be here, approve the current proposal and review
            the current evidence statuses first.
          </p>
        </>
      ) : (
        <>
          <div className="rounded-xl border border-border p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-base font-extrabold">
                Frozen test agreement
              </h3>
              <Button asChild variant="outline">
                <a href={agreement.download_url} download>
                  <Download size={16} />
                  Download record
                </a>
              </Button>
            </div>
            <div
              className="mt-4 max-h-80 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed"
              role="region"
              tabIndex={0}
              aria-label="Full test investment agreement"
            >
              {agreement.body}
            </div>
            <details className="mt-4 text-xs text-muted-foreground">
              <summary className="cursor-pointer py-2">
                Exact document hash
              </summary>
              <p className="break-all">{agreement.hash}</p>
            </details>
          </div>
          <div className="space-y-2">
            {room.participants.map((person) => (
              <p key={person.id} className="flex items-center gap-2 text-sm">
                <CheckCheck
                  className={`size-4 ${agreement.approvals.some((row) => row.member_id === person.id && row.kind === "contract") ? "text-primary" : "text-muted-foreground"}`}
                />
                {person.display_name}:{" "}
                {agreement.approvals.some(
                  (row) =>
                    row.member_id === person.id && row.kind === "contract",
                )
                  ? "accepted this version"
                  : "acceptance pending"}
              </p>
            ))}
          </div>
          {!signed && (
            <>
              <Label
                htmlFor="accept-investment-contract"
                className="flex min-h-11 items-start gap-3 text-sm leading-relaxed"
              >
                <Checkbox
                  id="accept-investment-contract"
                  checked={accept}
                  onCheckedChange={(value) => setAccept(value === true)}
                />
                I have read the full document and accept this exact synthetic
                investment agreement for myself.
              </Label>
              <Button
                disabled={!ready || !accept}
                onClick={() =>
                  void act({
                    action: "accept_contract",
                    expected_hash: agreement.hash,
                    accepted: true,
                  })
                }
              >
                Accept this test agreement
              </Button>
            </>
          )}
          {agreement.accepted && !agreement.fund && (
            <section className="space-y-4 rounded-xl bg-accent p-4 text-accent-foreground">
              <h3 className="flex items-center gap-2 text-base font-extrabold">
                <FlaskConical className="size-5" />
                Mutual simulated funding
              </h3>
              <p className="text-sm leading-relaxed">
                The full {money(agreement.terms.amount)} enters this test offer
                pool only after both confirmations. The lender’s separate test
                platform fee is {money(agreement.terms.platform_fee)}. Uploaded
                receipts do not credit capital.
              </p>
              {room.participants.map((person) => (
                <p className="text-sm" key={person.id}>
                  {person.display_name}:{" "}
                  {agreement.approvals.some(
                    (row) =>
                      row.kind === "funding" && row.member_id === person.id,
                  )
                    ? "confirmed simulation"
                    : "confirmation pending"}
                </p>
              ))}
              {!fundingAck && (
                <>
                  <Label
                    htmlFor="simulate-investment"
                    className="flex min-h-11 items-start gap-3 text-sm leading-relaxed"
                  >
                    <Checkbox
                      id="simulate-investment"
                      checked={simulate}
                      onCheckedChange={(value) => setSimulate(value === true)}
                    />
                    I understand this records a synthetic transfer and fee, with
                    no real money movement.
                  </Label>
                  <Button
                    disabled={!ready || !simulate}
                    onClick={() =>
                      void act({
                        action: "confirm_test_funding",
                        expected_hash: agreement.hash,
                        confirmed_simulation: true,
                      })
                    }
                  >
                    Confirm my simulated funding step
                  </Button>
                </>
              )}
            </section>
          )}
          {agreement.fund && (
            <section className="space-y-4 rounded-xl border border-border p-4">
              <h3 className="text-base font-extrabold">
                Contribution & allocated collections
              </h3>
              <p className="text-xs text-muted-foreground">
                Simulated confirmation · {date(agreement.fund.confirmed_at)}
              </p>
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                {[
                  ["Contributed", agreement.fund.position.contributed],
                  ["Unallocated capital", agreement.fund.position.unallocated],
                  [
                    "Capital exposure",
                    agreement.fund.position.capital_exposure,
                  ],
                  [
                    "Recorded allocated loss",
                    agreement.fund.position.recorded_loss,
                  ],
                  [
                    "Collected principal due",
                    agreement.fund.position.principal_due,
                  ],
                  ["Net earnings due", agreement.fund.position.earnings_due],
                ].map(([name, value]) => (
                  <div key={name}>
                    <dt className="text-muted-foreground">{name}</dt>
                    <dd className="mt-1 font-bold tabular-nums">
                      {money(value)}
                    </dd>
                  </div>
                ))}
              </dl>
              <Notice>
                Allocated collections are not proof of lender settlement or a
                withdrawable balance. The actions below simulate a payout only.
              </Notice>
              {pending ? (
                <div className="space-y-3 rounded-xl bg-muted p-4">
                  <h4 className="text-sm font-bold">
                    Pending simulated payout
                  </h4>
                  <p className="text-sm">
                    Principal: {money(pending.principal)} · Earnings:{" "}
                    {money(pending.earnings)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Includes {money(pending.unused_capital)} of unused capital.
                    Availability is checked again when the investor confirms.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {!lender && (
                      <Button
                        disabled={!ready}
                        onClick={() =>
                          void act({
                            action: "confirm_payout",
                            payout_id: pending.id,
                            confirmed_simulation: true,
                          })
                        }
                      >
                        Confirm simulated payout
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      disabled={!ready}
                      onClick={() =>
                        void act({
                          action: "cancel_payout",
                          payout_id: pending.id,
                          confirmed_simulation: true,
                        })
                      }
                    >
                      Cancel payout proposal
                    </Button>
                  </div>
                </div>
              ) : (
                lender && (
                  <>
                    <Label
                      htmlFor="return-unused-capital"
                      className="flex min-h-11 items-start gap-3 text-sm"
                    >
                      <Checkbox
                        id="return-unused-capital"
                        checked={unused}
                        onCheckedChange={(value) => setUnused(value === true)}
                      />
                      Include unallocated capital in the return proposal.
                    </Label>
                    <Button
                      variant="outline"
                      disabled={!ready}
                      onClick={() =>
                        void act({
                          action: "prepare_payout",
                          return_unallocated: unused,
                          confirmed_simulation: true,
                        })
                      }
                    >
                      Propose a simulated payout
                    </Button>
                  </>
                )
              )}
              <Link
                to="/investments"
                className="inline-flex min-h-11 items-center text-sm font-bold text-primary!"
              >
                Open investment records
              </Link>
            </section>
          )}
        </>
      )}
      {!room.both_here && (
        <p className="text-sm text-muted-foreground">
          Both people must be present before accepting or confirming a test
          financial step.
        </p>
      )}
    </section>
  );
}
