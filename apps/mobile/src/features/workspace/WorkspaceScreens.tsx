import { useRef, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  FileText,
  MessageCircle,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import type {
  ApiSchemas,
  Application,
  Agreement,
  Disclosure,
  Loan,
  Person,
  Terms,
} from "@pixelvault/contracts";
import {
  Action,
  Button,
  DisclosureBlock,
  Empty,
  ErrorState,
  Field,
  Form,
  Heading,
  Loading,
  Note,
  Page,
  Panel,
  PersonLine,
  Picker,
  Status,
  TextField,
  date,
  money,
} from "../../components/ui";
import { LoanRecords } from "./LoanRecords";
import { ConfirmAction } from "../../components/ConfirmAction";
import { api, operationId, post, saveFile } from "../../app/api";
import { financialPost } from "../../app/financial";
import { useMemberQuery, useSession } from "../../app/session";
import { LoanPlanner, pesoInput, toCentavos } from "../offers/OfferScreen";
type ApplicationDetail = Omit<Application, "offer"> & {
  offer: { id: string; version: number; title: string };
  terms: Terms;
  disclosure: Disclosure;
};
export function RecordsScreen({ kind }: { kind: "loans" | "applications" }) {
  const { session } = useSession();
  const [role, setRole] = useState("all");
  const query = useMemberQuery<(Loan | ApplicationDetail)[]>(
    [kind],
    `/${kind}`,
  );
  const rows = (query.data || []).filter(
    (row) =>
      role === "all" ||
      row[role as "borrower" | "lender"]?.id === session?.member?.id,
  );
  return (
    <Page
      title={kind === "loans" ? "Your loans" : "Your applications"}
      description="Private records shared only with their counterparties."
      back
    >
      <div className="flex gap-2" role="group" aria-label="Record perspective">
        {[
          ["all", "All"],
          ["borrower", "Borrowing"],
          ["lender", "Lending"],
        ].map(([value, name]) => (
          <Button
            key={value}
            variant={role === value ? "secondary" : "outline"}
            className="min-h-11 flex-1 text-sm"
            onClick={() => setRole(value)}
            aria-pressed={role === value}
          >
            {name}
          </Button>
        ))}
      </div>
      {query.isPending ? (
        <Loading />
      ) : query.error ? (
        <ErrorState error={query.error} retry={() => query.refetch()} />
      ) : !rows.length ? (
        <Empty
          title={`No ${kind} in this view.`}
          action={
            <Action to="/explore" variant="outline">
              Explore offers
            </Action>
          }
        >
          Your current {kind} will appear here.
        </Empty>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => {
            const person =
              row.borrower?.id === session?.member?.id
                ? row.lender
                : row.borrower;
            return (
              <Link
                key={row.id}
                to={`/${kind}/${row.id}`}
                className="block rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
              >
                <div className="flex items-start justify-between gap-3">
                  {person && (
                    <PersonLine
                      person={person}
                      subtitle={
                        row.borrower?.id === session?.member?.id
                          ? "You’re borrowing"
                          : "You’re lending"
                      }
                    />
                  )}
                  <Status value={row.status} />
                </div>
                <div className="mt-4 flex justify-between gap-3">
                  <p className="text-lg font-extrabold tabular-nums">
                    {money(
                      "principal_balance" in row
                        ? row.principal_balance
                        : row.principal,
                    )}
                  </p>
                  <ArrowRight className="size-5 text-primary" />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {"next_due_date" in row
                    ? `Next date: ${date(row.next_due_date)}`
                    : (row as ApplicationDetail).offer.title}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </Page>
  );
}
export function ApplicationFlow() {
  const { offerId = "" } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { session } = useSession();
  const offer = useMemberQuery<import("@pixelvault/contracts").Offer>(
    ["offer", offerId],
    `/offers/${offerId}`,
  );
  const invitations = useMemberQuery<{
    invitations: {
      id: string;
      display_name: string;
      ready_for_application: boolean;
      direction: string;
    }[];
  }>(["invitations"], "/connections/co-borrowers");
  const [stage, setStage] = useState(0),
    [amount, setAmount] = useState(""),
    [purpose, setPurpose] = useState(""),
    [coBorrower, setCoBorrower] = useState("none"),
    [error, setError] = useState<unknown>(null);
  if (offer.isPending) return <Loading />;
  if (offer.error || !offer.data)
    return (
      <Page title="Application unavailable" back>
        <ErrorState error={offer.error} />
      </Page>
    );
  const data = offer.data,
    initial = /^\d{1,15}$/.test(params.get("amount") || "")
      ? params.get("amount")!
      : String(
          Math.min(Number(data.terms.principal), Number(data.available_amount)),
        );
  const entered = amount || pesoInput(initial);
  return (
    <Page
      title="A plan you both understand."
      description={`Private application for ${data.title}.`}
      back
    >
      <div>
        <div
          role="progressbar"
          aria-label="Application steps"
          aria-valuenow={stage + 1}
          aria-valuemin={1}
          aria-valuemax={3}
          className="h-1.5 rounded-full bg-muted"
        >
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${((stage + 1) * 100) / 3}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {
            ["Your request", "A consenting co-borrower", "Review and submit"][
              stage
            ]
          }
        </p>
      </div>
      {error !== null && <ErrorState error={error} />}
      {stage === 0 ? (
        <>
          <Note>
            Current identity, income and contact checks are required. The server
            rechecks eligibility when you submit.{" "}
            <Link
              to="/verification"
              className="font-bold text-primary underline"
            >
              View your checks
            </Link>
          </Note>
          <Field
            label="Amount to borrow (₱)"
            name="amount"
            value={entered}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
          />
          <TextField
            label="What is this loan for?"
            name="purpose"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            maxLength={500}
            required
          />
          <Button
            className="min-h-12 w-full"
            onClick={() => {
              try {
                toCentavos(entered);
                if (!purpose.trim())
                  throw new Error("Add a short purpose before continuing.");
                setStage(1);
                setError(null);
              } catch (e) {
                setError(e);
              }
            }}
          >
            Continue
            <ArrowRight />
          </Button>
        </>
      ) : stage === 1 ? (
        <>
          <Picker
            label="Co-borrower invitation"
            value={coBorrower}
            onChange={setCoBorrower}
            options={[
              { value: "none", label: "Continue without one" },
              ...(invitations.data?.invitations || [])
                .filter(
                  (row) =>
                    row.direction === "outgoing" && row.ready_for_application,
                )
                .map((row) => ({ value: row.id, label: row.display_name })),
            ]}
          />
          <Note>
            Only consenting people with current checks can be attached. An
            invitation does not create joint repayment liability or grant access
            to this loan.
          </Note>
          <Action to="/co-borrowers" variant="outline" className="w-full">
            Manage private invitations
          </Action>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setStage(0)}
            >
              Back
            </Button>
            <Button className="flex-1" onClick={() => setStage(2)}>
              Review request
            </Button>
          </div>
        </>
      ) : (
        <>
          <Panel>
            <PersonLine person={data.lender} subtitle="Your proposed lender" />
            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <dt>Requested principal</dt>
                <dd className="font-bold tabular-nums">
                  {money(toCentavos(entered))}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Original terms</dt>
                <dd>
                  {data.installment_count} {data.frequency.replaceAll("_", " ")}{" "}
                  payments
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Annual interest</dt>
                <dd>{(data.annual_rate_bps / 100).toFixed(2)}%</dd>
              </div>
            </dl>
            <p className="mt-5 whitespace-pre-wrap text-sm text-muted-foreground">
              {purpose}
            </p>
          </Panel>
          <Note>
            Submitting requests consideration. It creates no loan, accepts no
            contract and moves no funds. The lender chooses, then both people
            review the same final agreement.
          </Note>
          <ConfirmAction
            label="Submit private application"
            title="Send this request?"
            description="You are requesting these original lender terms. Review the frozen agreement separately if selected."
            fingerprint={`${data.id}:${entered}:${purpose}:${coBorrower}`}
            reconcile={() => offer.refetch()}
            onConfirm={async () => {
              const result = await financialPost<Application>(
                `/offers/${offerId}/applications`,
                `${session?.member?.id}:apply:${offerId}:${entered}`,
                {
                  principal: toCentavos(entered),
                  purpose,
                  summary: {},
                  ...(coBorrower === "none"
                    ? {}
                    : { co_borrower_invitation_id: coBorrower }),
                },
              );
              navigate(`/applications/${result.id}`, { replace: true });
            }}
          />
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => setStage(0)}
          >
            Edit request
          </Button>
        </>
      )}
    </Page>
  );
}
export function ApplicationScreen() {
  const { applicationId = "" } = useParams();
  const navigate = useNavigate();
  const { session } = useSession();
  const cache = useQueryClient();
  const key = useRef(operationId());
  const query = useMemberQuery<ApplicationDetail>(
    ["application", applicationId],
    `/applications/${applicationId}`,
    { interval: 15_000 },
  );
  if (query.isPending) return <Loading />;
  if (query.error || !query.data)
    return (
      <Page title="Application unavailable" back>
        <ErrorState error={query.error} retry={() => query.refetch()} />
      </Page>
    );
  const data = query.data;
  const borrowing = data.borrower?.id === session?.member?.id;
  const person = borrowing ? data.lender : data.borrower;
  return (
    <Page title="Your shared next step." description={data.offer.title} back>
      <Status value={data.status} />
      {person && (
        <PersonLine
          person={person}
          subtitle={borrowing ? "Your proposed lender" : "Private applicant"}
        />
      )}
      <Panel>
        <p className="text-xs text-muted-foreground">Requested principal</p>
        <p className="mt-2 text-3xl font-extrabold tabular-nums">
          {money(data.principal)}
        </p>
        <p className="mt-4 text-sm text-muted-foreground">{data.purpose}</p>
      </Panel>
      <Note>
        The lender selects an applicant. Before any loan is funded, both people
        must review and accept the same disclosed agreement.
      </Note>
      {data.meeting_id ? (
        <Action to={`/meetings/${data.meeting_id}`} className="w-full">
          <MessageCircle />
          Open your waiting room
        </Action>
      ) : (
        ["submitted", "reviewing", "selected"].includes(data.status) && (
          <Form
            submit="Start a mutual review meeting"
            onSubmit={async () => {
              const result = await post<{ id: string }>("/meetings", {
                kind: "borrowing",
                offer_id: data.offer.id,
                application_id: data.id,
                operation_id: key.current,
              });
              key.current = operationId();
              navigate(`/meetings/${result.id}`);
            }}
          >
            <p className="text-sm text-muted-foreground">
              Schedule a private conversation to review the amount, documents
              and final agreement together.
            </p>
          </Form>
        )
      )}
      {data.agreement_id && (
        <Action
          to={`/agreements/${data.agreement_id}`}
          variant="outline"
          className="w-full"
        >
          <FileText />
          Review agreement
        </Action>
      )}
      {borrowing && ["submitted", "reviewing"].includes(data.status) && (
        <ConfirmAction
          label="Withdraw my application"
          title="Withdraw this request?"
          description="The lender will no longer consider this application. Selected applications require a separate agreement resolution."
          onConfirm={async () => {
            await post(`/applications/${data.id}/withdraw`, {});
            await query.refetch();
            await cache.invalidateQueries({
              queryKey: ["member", session?.member?.id, "applications"],
            });
          }}
        />
      )}
      {!borrowing && ["submitted", "reviewing"].includes(data.status) && (
        <ConfirmAction
          label="Decline this application"
          title="Decline this private request?"
          description="This records your decision for this application. It does not publish feedback or affect the member’s community XP."
          onConfirm={async () => {
            await post(`/applications/${data.id}/decline`, {});
            await query.refetch();
          }}
        />
      )}
      <DisclosureBlock title="Disclosed original schedule">
        {data.disclosure?.schedule?.map((line, index) => (
          <div
            key={index}
            className="flex justify-between gap-3 border-b border-border py-3 text-sm"
          >
            <span>{date(line.due_date)}</span>
            <strong>{money(line.total)}</strong>
          </div>
        ))}
      </DisclosureBlock>
    </Page>
  );
}
type PaymentReview = ApiSchemas["schemas"]["PaymentReview"];
export function LoanScreen() {
  const { loanId = "" } = useParams();
  const { session } = useSession();
  const [mode, setMode] = useState("installment"),
    [partial, setPartial] = useState(""),
    [checkout, setCheckout] = useState<{
      checkout_url: string;
      status: string;
    } | null>(null);
  const query = useMemberQuery<Loan>(["loan", loanId], `/loans/${loanId}`, {
    interval: 15_000,
  });
  const borrowing = query.data?.borrower.id === session?.member?.id;
  let requested: number | undefined;
  try {
    if (mode === "partial" && partial) requested = toCentavos(partial);
  } catch {}
  const review = useMemberQuery<PaymentReview>(
    ["payment-review", loanId, mode, requested],
    `/loans/${loanId}/payment-preview?${new URLSearchParams({ mode, ...(requested ? { amount: String(requested) } : {}) })}`,
    {
      enabled:
        !!borrowing &&
        query.data?.status === "active" &&
        (mode !== "partial" || !!requested),
    },
  );
  if (query.isPending) return <Loading />;
  if (query.error || !query.data)
    return (
      <Page title="Loan unavailable" back>
        <ErrorState error={query.error} retry={() => query.refetch()} />
      </Page>
    );
  const data = query.data,
    person = borrowing ? data.lender : data.borrower;
  return (
    <Page
      title="Your shared loan record."
      description="Current obligations, future dates and separate settlement facts."
      back
    >
      <PersonLine
        person={person}
        subtitle={borrowing ? "Your lender" : "Your borrower"}
      />
      <Status value={data.status} />
      <section className="border-y border-border py-5">
        <p className="text-sm text-muted-foreground">Current accrued payoff</p>
        <p className="mt-2 text-4xl font-extrabold tracking-tight tabular-nums">
          {money(data.payoff_amount ?? data.total_due)}
        </p>
        <div className="mt-5 grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Principal balance</p>
            <p className="mt-1 font-bold tabular-nums">
              {money(data.principal_balance)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Accrued interest</p>
            <p className="mt-1 font-bold tabular-nums">
              {money(data.accrued_interest)}
            </p>
          </div>
        </div>
      </section>
      <Note>
        Funding: {data.disbursement_status.replaceAll("_", " ")}. Lender
        settlement: {data.settlement_status.replaceAll("_", " ")}. These are
        separate from payment collection.
      </Note>
      {borrowing && data.status === "active" && (
        <section>
          <Heading>Review a payment</Heading>
          <Picker
            label="Payment choice"
            value={mode}
            onChange={(value) => {
              setMode(value);
              setCheckout(null);
            }}
            options={[
              { value: "installment", label: "Next installment" },
              { value: "payoff", label: "Current accrued payoff" },
              { value: "partial", label: "A partial amount" },
            ]}
          />
          {mode === "partial" && (
            <div className="mt-4">
              <Field
                label="Partial payment (₱)"
                name="partial"
                value={partial}
                inputMode="decimal"
                onChange={(e) => {
                  setPartial(e.target.value);
                  setCheckout(null);
                }}
              />
            </div>
          )}
          {review.error ? (
            <div className="mt-4">
              <ErrorState error={review.error} />
            </div>
          ) : (
            review.data && (
              <>
                <div className="my-5 flex items-end justify-between">
                  <span className="text-sm text-muted-foreground">
                    Current payment amount
                  </span>
                  <strong className="text-2xl tabular-nums">
                    {money(review.data.amount)}
                  </strong>
                </div>
                <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
                  {review.data.allocation_note}
                </p>
                <ConfirmAction
                  label="Continue to payment"
                  title="Review this payment request."
                  description={`You are requesting a checkout for ${money(review.data.amount)}. The server determines the payable amount and routing. This confirmation does not mark the loan paid.`}
                  fingerprint={`${loanId}:${mode}:${review.data.amount}`}
                  reconcile={() => query.refetch()}
                  onConfirm={async () => {
                    const result = await financialPost<{
                      checkout_url: string;
                      status: string;
                    }>(
                      `/loans/${loanId}/checkout`,
                      `${session?.member?.id}:checkout:${loanId}:${mode}:${requested || ""}`,
                      {
                        mode,
                        ...(mode === "partial"
                          ? { requested_amount: requested }
                          : {}),
                      },
                    );
                    setCheckout(result);
                  }}
                />
              </>
            )
          )}
          {checkout && (
            <div className="mt-4 space-y-3">
              <Note>
                Checkout state: {checkout.status.replaceAll("_", " ")}. Refresh
                this record after returning; only confirmed server events change
                your balance.
              </Note>
              {/^https:\/\//.test(checkout.checkout_url) && (
                <Button asChild className="w-full">
                  <a href={checkout.checkout_url} rel="noopener noreferrer">
                    Open payment provider
                  </a>
                </Button>
              )}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => void query.refetch()}
              >
                Refresh confirmed status
              </Button>
            </div>
          )}
        </section>
      )}
      <DisclosureBlock title="Current signed schedule" defaultOpen>
        {data.schedule.map((line, index) => (
          <div
            key={`${line.due_date}-${index}`}
            className="flex items-center justify-between gap-3 border-b border-border py-3 text-sm"
          >
            <div>
              <p className="font-semibold">{date(line.due_date)}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {money(line.principal)} principal + {money(line.interest)}{" "}
                interest
              </p>
            </div>
            <strong className="tabular-nums">{money(line.total)}</strong>
          </div>
        ))}
        <Note>
          Scheduled amounts include future interest. Use the current payoff
          above for accrued obligations.
        </Note>
      </DisclosureBlock>
      <LoanRecords loan={data} borrowing={!!borrowing} />
      <Action
        to={`/agreements/${data.agreement_id}`}
        variant="outline"
        className="w-full"
      >
        <FileText />
        Agreement and documents
      </Action>
      <Action to="/calendar" variant="outline" className="w-full">
        <CalendarDays />
        Payment calendar
      </Action>
    </Page>
  );
}
export function AgreementScreen() {
  const { agreementId = "" } = useParams();
  const query = useMemberQuery<
    Agreement & { version: number; expires_at: string }
  >(["agreement", agreementId], `/agreements/${agreementId}`);
  const [error, setError] = useState<unknown>(null);
  if (query.isPending) return <Loading />;
  if (query.error || !query.data)
    return (
      <Page title="Agreement unavailable" back>
        <ErrorState error={query.error} />
      </Page>
    );
  const data = query.data;
  return (
    <Page
      title="The same agreement, for both of you."
      description={`Version ${data.version}. Review every term before accepting.`}
      back
    >
      <Status value={data.state} />
      <PersonLine person={data.lender} subtitle="Lender" />
      <PersonLine person={data.borrower} subtitle="Borrower" />
      <Panel>
        <dl className="space-y-4 text-sm">
          {[
            ["Principal", money(data.terms.principal)],
            ["Total interest", money(data.disclosure.total_interest)],
            ["Total repayment", money(data.disclosure.total_repayment)],
            ["Frequency", data.terms.frequency.replaceAll("_", " ")],
            ["First effective date", date(data.terms.effective_date)],
            ["Reservation expires", date(data.expires_at)],
          ].map(([name, value]) => (
            <div key={name} className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{name}</dt>
              <dd className="text-right font-bold tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      </Panel>
      <p className="break-all text-xs text-muted-foreground">
        Document hash: {data.hash}
      </p>
      {error !== null && <ErrorState error={error} />}
      <Button
        variant="outline"
        className="w-full"
        onClick={async () => {
          try {
            await saveFile(`/agreements/${agreementId}/document`);
          } catch (e) {
            setError(e);
          }
        }}
      >
        <FileText />
        Download the exact agreement PDF
      </Button>
      {data.loan_id ? (
        <Action to={`/loans/${data.loan_id}`} className="w-full">
          Open shared loan record
        </Action>
      ) : (
        <Note>
          Use your scheduled mutual review meeting to resolve documents and
          record acceptance. Opening or downloading this document does not
          accept it.
        </Note>
      )}
      <DisclosureBlock title="Repayment dates" defaultOpen>
        {data.disclosure.schedule?.map((line, index) => (
          <div
            key={index}
            className="flex justify-between border-b border-border py-3 text-sm"
          >
            <span>{date(line.due_date)}</span>
            <strong>{money(line.total)}</strong>
          </div>
        ))}
      </DisclosureBlock>
    </Page>
  );
}
