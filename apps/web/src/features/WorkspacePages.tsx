import { MeetingEntry } from "./negotiations/MeetingEntry";
import { useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Download,
  FileText,
  HandCoins,
  Plus,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import {
  Button,
  Input,
  Label,
  Tabs,
  TabsList,
  TabsTrigger,
} from "@pixelvault/ui";
import type {
  Agreement,
  Application,
  DataRecord,
  Loan,
  Offer,
} from "@pixelvault/contracts";
import { apiRequest, items, operationId, post } from "../app/api";
import { useSession } from "../app/session";
import {
  ActionLink,
  ApiForm,
  CheckField,
  DefinitionList,
  Empty,
  ErrorNotice,
  Field,
  Loading,
  Notice,
  PageHeading,
  PersonName,
  MemberAvatar,
  RecordRows,
  SelectField,
  Status,
} from "../components";
import { date, label, money, text } from "../lib/format";
import { CostDisclosure, Schedule } from "./ExplorePages";
export function useLoans() {
  return useQuery({
    queryKey: ["loans"],
    queryFn: () =>
      apiRequest<Loan[]>("/loans").then((data) => items<Loan>(data, "loans")),
  });
}
export function useApplications() {
  return useQuery({
    queryKey: ["applications"],
    queryFn: () =>
      apiRequest<Application[]>("/applications").then((data) =>
        items<Application>(data, "applications"),
      ),
  });
}
export function LoanRow({ loan }: { loan: Loan }) {
  const { session } = useSession();
  const other =
    session?.member?.id === loan.lender.id ? loan.borrower : loan.lender;
  return (
    <Link to={`/loans/${loan.id}`} className="loan-row">
      <div className="loan-row-person">
        <MemberAvatar
          name={other.display_name}
          avatarKey={other.avatar_key}
          photoUrl={other.photo_url}
          reputation={other.reputation}
        />
        <div>
          <strong>{other.display_name}</strong>
          <small>
            {loan.borrower.id === session?.member?.id
              ? "Borrowing from"
              : "Lending to"}{" "}
            · Loan {loan.id.slice(0, 8)}
          </small>
        </div>
      </div>
      <div>
        <small>Remaining principal</small>
        <strong className="money">{money(loan.principal_balance)}</strong>
      </div>
      <div>
        <small>Next due</small>
        <strong>{date(loan.next_due_date)}</strong>
      </div>
      <Status value={loan.status} />
      <ChevronRight size={16} />
    </Link>
  );
}
export function Dashboard() {
  const { session } = useSession();
  const member = session?.member;
  const [params, setParams] = useSearchParams();
  const role = params.get("role") || "borrowing";
  const loans = useLoans(),
    applications = useApplications();
  const scoped = (loans.data || []).filter((l) =>
    role === "borrowing"
      ? l.borrower.id === member?.id
      : l.lender.id === member?.id,
  );
  const next = scoped
    .filter((l) => l.next_due_date)
    .sort((a, b) =>
      String(a.next_due_date).localeCompare(String(b.next_due_date)),
    )[0];
  const firstName = member?.display_name.split(" ")[0] || "there";
  return (
    <>
      <PageHeading
        title={`A little clarity, ${firstName}.`}
        description="Your next steps, agreements and shared loan history in one place."
        action={
          <ActionLink to="/explore" variant="outline">
            Explore community
            <ArrowRight size={16} />
          </ActionLink>
        }
      />
      <Tabs
        value={role}
        onValueChange={(value) => setParams({ role: value })}
        className="role-tabs"
      >
        <TabsList>
          <TabsTrigger value="borrowing">I’m borrowing</TabsTrigger>
          <TabsTrigger value="lending">I’m lending</TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="dashboard-layout">
        <div>
          {loans.isPending ? (
            <Loading />
          ) : loans.error ? (
            <ErrorNotice error={loans.error} />
          ) : next ? (
            <section className="next-action">
              <div className="next-action-heading">
                <span className="next-action-icon">
                  <CalendarDays size={24} />
                </span>
                <div>
                  <h2>
                    {role === "borrowing"
                      ? "Your next payment"
                      : "Next expected payment"}
                  </h2>
                  <p>{date(next.next_due_date)} · Asia/Manila</p>
                </div>
                <Status value={next.status} />
              </div>
              <div className="next-action-body">
                <div>
                  <strong>
                    {money(next.next_installment_due ?? next.total_due)}
                  </strong>
                  <small>
                    Next installment · see exact allocation in your loan
                  </small>
                </div>
                <ActionLink
                  to={
                    role === "borrowing"
                      ? `/loans/${next.id}/payments/new`
                      : `/loans/${next.id}`
                  }
                >
                  {role === "borrowing" ? "Review payment" : "View loan"}
                  <ArrowRight size={16} />
                </ActionLink>
              </div>
              <div className="next-action-footer">
                <span>
                  With{" "}
                  {role === "borrowing"
                    ? next.lender.display_name
                    : next.borrower.display_name}
                </span>
                <Link to={`/loans/${next.id}`}>
                  Open shared timeline <ArrowRight size={14} />
                </Link>
              </div>
            </section>
          ) : (
            <section className="workspace-welcome">
              <span>
                <HandCoins size={28} />
              </span>
              <h2>
                {role === "borrowing"
                  ? "Your next chapter is unwritten."
                  : "Good lending starts with clear terms."}
              </h2>
              <p>
                {role === "borrowing"
                  ? "You have no active loans. Explore the community when you have a purpose and a repayment plan."
                  : "Post a lending intention, review eligible private applications and choose the right fit."}
              </p>
              <ActionLink
                to={role === "borrowing" ? "/explore" : "/offers/new"}
              >
                {role === "borrowing" ? "Explore offers" : "Post an offer"}
                <ArrowRight size={16} />
              </ActionLink>
            </section>
          )}
          <div className="section-heading">
            <h2>{role === "borrowing" ? "Your borrowing" : "Your lending"}</h2>
            <Link to="/loans">
              View all
              <ArrowRight size={14} />
            </Link>
          </div>
          {scoped.length ? (
            <div className="surface flush">
              {scoped.slice(0, 4).map((l) => (
                <LoanRow key={l.id} loan={l} />
              ))}
            </div>
          ) : (
            <div className="inline-empty">
              No {role === "borrowing" ? "borrowed" : "funded"} loans to show.
            </div>
          )}
          <div className="section-heading">
            <h2>Applications & decisions</h2>
            <Link to="/applications">
              View all
              <ArrowRight size={14} />
            </Link>
          </div>
          {applications.isPending ? (
            <Loading />
          ) : applications.error ? (
            <ErrorNotice error={applications.error} />
          ) : applications.data?.length ? (
            <div className="surface flush">
              {applications.data.slice(0, 3).map((a) => (
                <Link
                  to={`/applications/${a.id}`}
                  className="record-row"
                  key={a.id}
                >
                  <div className="application-person">
                    {a.borrower && (
                      <MemberAvatar
                        name={a.borrower.display_name}
                        avatarKey={a.borrower.avatar_key}
                        photoUrl={a.borrower.photo_url}
                        reputation={a.borrower.reputation}
                      />
                    )}
                    <div>
                      <strong>{a.purpose || "Private application"}</strong>
                      <p>
                        {money(a.principal)} ·{" "}
                        {a.borrower?.display_name || "Your request"}
                      </p>
                    </div>
                  </div>
                  <Status value={a.status} />
                </Link>
              ))}
            </div>
          ) : (
            <div className="inline-empty">
              Your application updates will appear here.
            </div>
          )}
        </div>
        <aside>
          <section className="surface journey-panel">
            <h2>Your foundation</h2>
            <p>A prepared member makes informed choices.</p>
            <Link to="/verification">
              <span className="journey-icon">
                <ShieldCheck size={19} />
              </span>
              <div>
                <strong>Verification center</strong>
                <small>Review your evidence status</small>
              </div>
              <ChevronRight size={16} />
            </Link>
            <Link to="/learn">
              <span className="journey-icon">
                <FileText size={19} />
              </span>
              <div>
                <strong>Learning room</strong>
                <small>
                  {member?.literacy_completed
                    ? "Learning completed"
                    : "Understand the essentials"}
                </small>
              </div>
              <ChevronRight size={16} />
            </Link>
            <Link to="/profile">
              <span className="journey-icon">
                <CheckCircle2 size={19} />
              </span>
              <div>
                <strong>Make it yours</strong>
                <small>Profile and achievement shelf</small>
              </div>
              <ChevronRight size={16} />
            </Link>
          </section>
          <div className="quiet-note">
            <Clock3 size={19} />
            <p>
              Expected interest, confirmed payments and lender settlement are
              separate facts. Your records show each clearly.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
export function LoansPage() {
  const query = useLoans();
  return (
    <>
      <PageHeading
        title="Your agreements in motion."
        description="Every loan has a private shared record, exact terms and a payment timeline."
      />
      {query.isPending ? (
        <Loading />
      ) : query.error ? (
        <ErrorNotice error={query.error} />
      ) : query.data?.length ? (
        <section className="surface flush">
          {query.data.map((loan) => (
            <LoanRow key={loan.id} loan={loan} />
          ))}
        </section>
      ) : (
        <Empty
          title="No loans yet"
          action={<ActionLink to="/explore">Explore offers</ActionLink>}
        >
          A loan appears after both parties accept an agreement. Offers are
          never presented as approved credit.
        </Empty>
      )}
    </>
  );
}
export function ApplicationsPage() {
  const query = useApplications();
  return (
    <>
      <PageHeading
        title="Private applications."
        description="Keep track of your requests and the decisions waiting for you."
      />
      {query.isPending ? (
        <Loading />
      ) : query.error ? (
        <ErrorNotice error={query.error} />
      ) : query.data?.length ? (
        <div className="surface flush">
          {query.data.map((a) => (
            <Link
              key={a.id}
              to={`/applications/${a.id}`}
              className="record-row"
            >
              <div className="application-person">
                {a.borrower && (
                  <MemberAvatar
                    name={a.borrower.display_name}
                    avatarKey={a.borrower.avatar_key}
                    photoUrl={a.borrower.photo_url}
                    reputation={a.borrower.reputation}
                  />
                )}
                <div>
                  <strong>{a.purpose || "Application"}</strong>
                  <p>
                    {a.borrower?.display_name || "Your request"} ·{" "}
                    {money(a.principal)}
                    {a.created_at ? ` · ${date(a.created_at)}` : ""}
                  </p>
                </div>
              </div>
              <div className="record-end">
                <Status value={a.status} />
                <ChevronRight size={16} />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <Empty
          title="A clear next step starts with an offer."
          action={<ActionLink to="/explore">Find an offer</ActionLink>}
        >
          Applications stay private. Compete on fit and affordability, never
          escalating interest.
        </Empty>
      )}
    </>
  );
}
export function ApplicationDetail() {
  const { id } = useParams(),
    navigate = useNavigate();
  const query = useQuery({
    queryKey: ["application", id],
    queryFn: () => apiRequest<Application>(`/applications/${id}`),
  });
  const { session } = useSession();
  const [actionError, setActionError] = useState<unknown>();
  if (query.isPending) return <Loading />;
  if (query.error) return <ErrorNotice error={query.error} />;
  const a = query.data;
  const offer = typeof a.offer === "object" ? a.offer : undefined;
  const canSelect = (a.lender?.id || offer?.lender?.id) === session?.member?.id;
  return (
    <>
      <Link to="/applications" className="back-link">
        <ArrowLeft size={16} />
        Applications
      </Link>
      <PageHeading
        title="A private request."
        description="Financial details are shared only with the relevant parties."
        action={<Status value={a.status} />}
      />
      <div className="detail-layout">
        <section className="surface">
          <h2>{a.purpose}</h2>
          <DefinitionList
            rows={[
              ["Requested principal", money(a.principal)],
              ["Borrower", a.borrower?.display_name || "You"],
              ["Submitted", date(a.created_at)],
            ]}
          />
          {a.co_borrower && (
            <section
              className="application-co-borrower"
              aria-labelledby="application-companion-heading"
            >
              <h2 id="application-companion-heading">Proposed co-borrower</h2>
              <div className="person">
                <MemberAvatar
                  name={a.co_borrower.member.display_name}
                  avatarKey={a.co_borrower.member.avatar_key}
                  photoUrl={a.co_borrower.member.photo_url}
                  reputation={a.co_borrower.member.reputation}
                />
                <div>
                  <strong>{a.co_borrower.member.display_name}</strong>
                  <p className="small-text">
                    {a.co_borrower.status === "consented"
                      ? "Consent and required checks are current."
                      : "Consent or required checks are not current."}
                  </p>
                </div>
              </div>
              <Notice>
                This invitation link creates no repayment liability or access to
                loans and documents. Any joint obligation would require separate
                accepted terms.
              </Notice>
            </section>
          )}
          <h2>Repayment context</h2>
          {typeof a.summary === "object" ? (
            <DefinitionList
              rows={Object.entries(a.summary).map(([key, value]) => [
                label(key),
                value,
              ])}
            />
          ) : (
            <p className="prose">
              {a.summary || "No additional context provided."}
            </p>
          )}
          {offer && (
            <>
              <h2>Offer terms</h2>
              <CostDisclosure offer={offer} />
            </>
          )}
        </section>
        <aside className="surface">
          <h2>What happens next</h2>
          {a.meeting_id ? (
            <MeetingEntry
              offerId={a.offer_id || offer?.id || ""}
              applicationId={a.id}
              meetingId={a.meeting_id}
            />
          ) : (
            ["submitted", "reviewing", "selected"].includes(a.status) && (
              <MeetingEntry
                offerId={a.offer_id || offer?.id || ""}
                applicationId={a.id}
              />
            )
          )}
          {a.agreement_id ? (
            <ActionLink to={`/agreements/${a.agreement_id}`}>
              Review agreement
              <ArrowRight size={16} />
            </ActionLink>
          ) : canSelect && a.status === "submitted" && !a.meeting_id ? (
            <ApiForm
              onSubmit={async (data) => {
                const result = await post<{ agreement_id: string }>(
                  `/applications/${id}/select`,
                  {
                    expected_offer_version: offer?.version ?? a.version ?? 1,
                    operation_id: text(data, "operation_id"),
                  },
                );
                navigate(`/agreements/${result.agreement_id}`);
              }}
              submitLabel="Select this applicant"
            >
              <Notice>
                Selection reserves the requested amount. Both parties must
                accept the exact agreement before funding.
              </Notice>
            </ApiForm>
          ) : (
            <Notice>
              The lender reviews your application. If selected, you will be
              asked to review and accept the final agreement.
            </Notice>
          )}
          <StartConversation applicationId={a.id} />
          {["submitted", "reviewing"].includes(a.status) && (
            <ApiForm
              submitLabel={
                canSelect ? "Decline application" : "Withdraw application"
              }
              onSubmit={() =>
                post(
                  `/applications/${a.id}/${canSelect ? "decline" : "withdraw"}`,
                  {},
                )
              }
              successMessage={
                canSelect
                  ? "Application declined. This does not affect reputation."
                  : "Application withdrawn."
              }
            >
              <Notice>
                This does not create a loan or damage a member’s reputation.
              </Notice>
            </ApiForm>
          )}
          {actionError !== undefined && <ErrorNotice error={actionError} />}
        </aside>
      </div>
    </>
  );
}
export function AgreementPage() {
  const { id } = useParams(),
    navigate = useNavigate();
  const query = useQuery({
    queryKey: ["agreement", id],
    queryFn: () => apiRequest<Agreement>(`/agreements/${id}`),
  });
  if (query.isPending) return <Loading />;
  if (query.error) return <ErrorNotice error={query.error} />;
  const a = query.data;
  return (
    <>
      <PageHeading
        title="A clear agreement, together."
        description="Review the full terms, repayment dates and document version before accepting."
        action={<Status value={a.state} />}
      />
      <div className="agreement-layout">
        <section className="surface">
          <Notice tone="warning">
            Test agreement. This template has not been represented as
            lawyer-approved and creates no live funding instruction.
          </Notice>
          <h2>Between two individuals</h2>
          <div className="agreement-parties">
            <PersonName person={a.lender} subtitle="Lender" />
            <span>and</span>
            <PersonName person={a.borrower} subtitle="Borrower" />
          </div>
          <h2>Financial disclosure</h2>
          <CostDisclosure disclosure={a.disclosure} />
          <DefinitionList
            rows={[
              [
                "Annual reducing-balance rate",
                `${a.terms.annual_rate_bps / 100}%`,
              ],
              ["Frequency", label(a.terms.frequency)],
              ["Installments", a.terms.installment_count],
              ["Effective date", date(a.terms.effective_date)],
            ]}
          />
          <h2>Your exact payment schedule</h2>
          <Schedule rows={a.disclosure.schedule || []} />
          <h2>Shared responsibilities</h2>
          <div className="contract-copy">
            <p>
              Both parties accept the disclosed principal, interest method and
              dates. A payment is confirmed only after an authoritative provider
              or approved test event. Changes require a separately accepted
              amendment.
            </p>
            <p>
              Hardship and disputed transactions are handled privately. This
              agreement never authorizes public debt shaming, employer exposure,
              contact-list messaging, threats of arrest or automatic government
              referral.
            </p>
            <p>
              Access your documents and complaint routes even if new borrowing
              is restricted. Loan collection, disbursement, lender settlement
              and platform commission are separate records.
            </p>
          </div>
          <h2>Document integrity</h2>
          <p className="hash">Version hash: {a.hash}</p>
          <p className="small-text">
            {a.acceptances.length} recorded acceptance(s). All dates use
            Asia/Manila.
          </p>
        </section>
        <aside className="surface sticky-summary">
          <h2>Accept this version</h2>
          <p>Your acceptance applies to the exact terms and hash shown here.</p>
          {a.loan_id ? (
            <ActionLink to={`/loans/${a.loan_id}`}>
              Open shared loan
              <ArrowRight size={16} />
            </ActionLink>
          ) : (
            <ApiForm
              submitLabel="Accept test agreement"
              onSubmit={(data) =>
                post<{ loan_id?: string }>(`/agreements/${id}/accept`, {
                  expected_hash: a.hash,
                  operation_id: text(data, "operation_id"),
                })
              }
              successMessage="Your acceptance was recorded. Funding waits for all required acceptances."
              onSuccess={(data) => {
                const result = data as { loan_id?: string };
                if (result.loan_id) navigate(`/loans/${result.loan_id}`);
              }}
            >
              <CheckField name="read" required>
                I have read the full cost, dates and private dispute procedures.
              </CheckField>
              <CheckField name="consent" required>
                I accept this exact test agreement electronically.
              </CheckField>
            </ApiForm>
          )}
        </aside>
      </div>
    </>
  );
}
export function LoanDetail({
  payment = false,
  documents = false,
  cases = false,
}: {
  payment?: boolean;
  documents?: boolean;
  cases?: boolean;
}) {
  const { id } = useParams();
  const { session } = useSession();
  const navigate = useNavigate();
  const query = useQuery({
    queryKey: ["loan", id],
    queryFn: () => apiRequest<Loan>(`/loans/${id}`),
  });
  const timeline = useQuery({
    queryKey: ["timeline", id],
    queryFn: () =>
      apiRequest<DataRecord[]>(`/loans/${id}/timeline`).then((d) =>
        items<DataRecord>(d, "events"),
      ),
  });
  if (query.isPending) return <Loading />;
  if (query.error) return <ErrorNotice error={query.error} />;
  const loan = query.data;
  return (
    <>
      <Link className="back-link" to="/loans">
        <ArrowLeft size={16} />
        My loans
      </Link>
      <PageHeading
        title={
          payment
            ? "Review your payment."
            : `A shared record with ${session?.member?.id === loan.lender.id ? loan.borrower.display_name : loan.lender.display_name}.`
        }
        description={`Loan ${loan.id.slice(0, 8)} · All contractual dates use Asia/Manila.`}
        action={<Status value={loan.status} />}
      />
      <div className="loan-nav">
        <NavItem to={`/loans/${id}`} active={!payment && !documents && !cases}>
          Timeline & schedule
        </NavItem>
        <NavItem to={`/loans/${id}/documents`} active={documents}>
          Documents
        </NavItem>
        <NavItem to={`/loans/${id}/cases`} active={cases}>
          Private cases
        </NavItem>
      </div>
      {payment ? (
        <PaymentForm loan={loan} />
      ) : documents ? (
        <ResourcePage
          title="Loan documents"
          path={`/loans/${id}/documents`}
          recordKey="documents"
          documents
          inline
        />
      ) : cases ? (
        <ResourcePage
          title="Private cases"
          path={`/cases?loan_id=${id}`}
          recordKey="cases"
          inline
          action={
            <ActionLink to={`/cases/new?loan=${id}`}>
              Open a private case
            </ActionLink>
          }
        />
      ) : (
        <div className="detail-layout">
          <div>
            <section className="surface">
              <h2>The agreement at a glance</h2>
              <DefinitionList
                rows={[
                  ["Remaining principal", money(loan.principal_balance)],
                  ["Accrued interest", money(loan.accrued_interest)],
                  ["Projected future interest", money(loan.projected_interest)],
                  [
                    "Current payoff balance",
                    money(loan.payoff_amount ?? loan.total_due),
                  ],
                  ["Next installment", money(loan.next_installment_due)],
                  ["Next payment date", date(loan.next_due_date)],
                  ["Disbursement", <Status value={loan.disbursement_status} />],
                  [
                    "Lender settlement",
                    <Status value={loan.settlement_status} />,
                  ],
                ]}
              />
              <Link
                className="text-link"
                to={`/agreements/${loan.agreement_id}`}
              >
                Read accepted agreement
                <ArrowRight size={15} />
              </Link>
            </section>
            <section className="surface">
              <h2>Repayment schedule</h2>
              <Schedule rows={loan.schedule} />
            </section>
            <section className="surface">
              <h2>Your shared timeline</h2>
              {timeline.isPending ? (
                <Loading />
              ) : timeline.error ? (
                <ErrorNotice error={timeline.error} />
              ) : (
                <RecordRows
                  records={timeline.data || []}
                  empty="No timeline events yet"
                />
              )}
            </section>
          </div>
          <aside>
            <section className="surface sticky-summary">
              <h2>The next right step.</h2>
              {session?.member?.id === loan.borrower.id && (
                <ActionLink to={`/loans/${id}/payments/new`}>
                  <Wallet size={16} />
                  Review payment
                </ActionLink>
              )}
              {loan.test_mode &&
                session?.member?.id === loan.lender.id &&
                loan.disbursement_status !== "confirmed" && (
                  <ApiForm
                    submitLabel="Record test disbursement"
                    onSubmit={(data) =>
                      post(`/loans/${id}/disburse`, {
                        operation_id: text(data, "operation_id"),
                      })
                    }
                    successMessage="Synthetic disbursement was recorded."
                  >
                    <Notice>
                      Sandbox only. No real funds move. Funding and lender
                      settlement are distinct.
                    </Notice>
                  </ApiForm>
                )}
              {session?.member?.id === loan.lender.id && (
                <Link className="text-link" to={`/loans/${id}/commission`}>
                  Review origination commission
                  <ArrowRight size={15} />
                </Link>
              )}
              <StartConversation loanId={loan.id} />
              {session?.member?.id === loan.lender.id &&
                loan.disbursement_status !== "confirmed" && (
                  <ApiForm
                    submitLabel="Review a new funding date"
                    onSubmit={async (data) => {
                      const agreement = await post<{ id: string }>(
                        `/loans/${id}/renew-effective-date`,
                        {
                          effective_date: text(data, "effective_date"),
                          operation_id: text(data, "operation_id"),
                        },
                      );
                      navigate(`/agreements/${agreement.id}`);
                    }}
                  >
                    <Field
                      name="effective_date"
                      label="New funding date"
                      type="date"
                      required
                      help="Creates a new agreement requiring both acceptances. Original records remain unchanged."
                    />
                  </ApiForm>
                )}
              <Link className="text-link" to={`/cases/amendments?loan=${id}`}>
                Review adjustment proposals
                <ArrowRight size={15} />
              </Link>
              <Link className="text-link" to={`/cases/new?loan=${id}`}>
                Request support or hardship
                <ArrowRight size={15} />
              </Link>
              <Link className="text-link" to={`/reviews/new?loan=${id}`}>
                Review your counterparty
                <ArrowRight size={15} />
              </Link>
              <p className="small-text">
                Reviews follow transaction eligibility and moderation. They
                never publish private debt details.
              </p>
            </section>
          </aside>
        </div>
      )}
    </>
  );
}
function NavItem({
  to,
  active,
  children,
}: {
  to: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      className={active ? "active" : ""}
      aria-current={active ? "page" : undefined}
    >
      {children}
    </Link>
  );
}
export function PaymentForm({ loan }: { loan: Loan }) {
  const [mode, setMode] = useState("installment"),
    [amount, setAmount] = useState(""),
    [checkout, setCheckout] = useState<DataRecord | null>(null);
  const preview = useQuery({
    queryKey: ["payment-preview", loan.id, mode, amount],
    queryFn: () =>
      apiRequest<DataRecord>(
        `/loans/${loan.id}/payment-preview?mode=${mode}${mode === "partial" ? `&amount=${Math.round(Number(amount) * 100)}` : ""}`,
      ),
    enabled: mode !== "partial" || Number(amount) > 0,
  });
  return (
    <div className="form-layout">
      <section className="surface">
        <h2>Confirm what you are paying</h2>
        <SelectField
          name="payment-mode"
          label="Payment type"
          defaultValue={mode}
          onValueChange={setMode}
          options={[
            { value: "installment", label: "Next scheduled installment" },
            { value: "partial", label: "Make a partial payment" },
            { value: "payoff", label: "Settle the current balance" },
          ]}
        />
        {mode === "partial" && (
          <div className="field payment-amount">
            <Label htmlFor="partial-amount">Amount to pay (₱)</Label>
            <Input
              id="partial-amount"
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </div>
        )}
        {preview.isFetching ? (
          <Loading text="Calculating your payment…" />
        ) : preview.error ? (
          <ErrorNotice error={preview.error} />
        ) : preview.data ? (
          <>
            <DefinitionList
              rows={[
                ["Loan", loan.id.slice(0, 8)],
                ["Payment amount", money(String(preview.data.amount))],
                [
                  "Remaining principal",
                  money(String(preview.data.principal_balance)),
                ],
                [
                  "Accrued interest",
                  money(String(preview.data.accrued_interest)),
                ],
                [
                  "Current payoff amount",
                  money(String(preview.data.payoff_amount)),
                ],
                ["Platform commission on repayment", money(0)],
              ]}
            />
            <Notice>
              {String(
                preview.data.allocation_note ||
                  "Your amount and allocation are calculated by the server. A checkout return page is not payment confirmation.",
              )}
            </Notice>
            <ApiForm
              submitLabel="Create payment checkout"
              onSubmit={(data) =>
                post<DataRecord>(`/loans/${loan.id}/checkout`, {
                  operation_id: text(data, "operation_id"),
                  mode,
                  ...(mode === "partial"
                    ? { requested_amount: Math.round(Number(amount) * 100) }
                    : {}),
                })
              }
              onSuccess={(data) => setCheckout(data as DataRecord)}
            >
              <CheckField name="payment-consent" required>
                I have reviewed this payment and understand that confirmation
                may take time.
              </CheckField>
            </ApiForm>
          </>
        ) : (
          <Notice>
            Enter an amount to request an authoritative partial-payment preview.
          </Notice>
        )}
        {checkout && (
          <div className="checkout-result">
            <Notice tone="success">
              Checkout created. Your payment stays pending until verified
              confirmation.
            </Notice>
            {typeof checkout.checkout_url === "string" &&
              /^https?:\/\//.test(checkout.checkout_url) && (
                <Button asChild>
                  <a href={checkout.checkout_url}>
                    Continue to secure checkout
                    <ArrowRight size={16} />
                  </a>
                </Button>
              )}
            <DefinitionList
              rows={[
                [
                  "Checkout reference",
                  String(
                    checkout.payment_id ||
                      checkout.id ||
                      checkout.reference ||
                      "Created",
                  ),
                ],
                [
                  "Status",
                  <Status value={String(checkout.status || "pending")} />,
                ],
              ]}
            />
          </div>
        )}
      </section>
      <aside className="form-aside">
        <h2>A record you can follow.</h2>
        <p>
          Receipts and allocation updates appear in the shared timeline after
          confirmation. An uploaded screenshot is not a verified payment.
        </p>
        <Notice tone="warning">
          Test provider arrangements do not move real money or establish
          settlement to your lender.
        </Notice>
      </aside>
    </div>
  );
}
export function ResourcePage({
  title,
  path,
  recordKey,
  documents = false,
  inline = false,
  action,
}: {
  title: string;
  path: string;
  recordKey?: string;
  documents?: boolean;
  inline?: boolean;
  action?: React.ReactNode;
}) {
  const query = useQuery({
    queryKey: ["resource", path],
    queryFn: async () => {
      const data = await apiRequest<DataRecord[] | DataRecord>(path);
      const records = items<DataRecord>(data, recordKey);
      if (documents && path === "/documents") {
        const agreements = await apiRequest<DataRecord[]>("/loan-documents");
        return [...items<DataRecord>(agreements), ...records];
      }
      return records;
    },
  });
  const [downloadError, setDownloadError] = useState<unknown>();
  return (
    <>
      {inline ? (
        <div className="section-heading">
          <h2>{title}</h2>
          {action}
        </div>
      ) : (
        <PageHeading
          title={title}
          description={
            documents
              ? "Private records, shared only with the relevant people."
              : "A factual view of your permitted records."
          }
          action={action}
        />
      )}
      {downloadError !== undefined && <ErrorNotice error={downloadError} />}
      {query.isPending ? (
        <Loading />
      ) : query.error ? (
        <ErrorNotice error={query.error} />
      ) : documents && query.data?.length ? (
        <section className="surface flush">
          {query.data.map((d) => (
            <div className="record-row" key={String(d.id)}>
              <div className="document-name">
                <FileText size={21} />
                <div>
                  <strong>
                    {String(d.name || d.title || "Private document")}
                  </strong>
                  <p>
                    {label(d.purpose)} ·{" "}
                    <Status value={String(d.status || d.state || "private")} />
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    const grant =
                      d.kind === "agreement" && typeof d.url === "string"
                        ? { url: d.url }
                        : await apiRequest<{ url: string }>(
                            `/documents/${d.id}/download`,
                          );
                    const target = new URL(grant.url, location.origin);
                    if (target.origin === location.origin)
                      window.location.assign(target.href);
                  } catch (e) {
                    setDownloadError(e);
                  }
                }}
              >
                <Download size={16} />
                Download
              </Button>
            </div>
          ))}
        </section>
      ) : query.data?.length ? (
        <section className="surface flush">
          <RecordRows
            records={query.data}
            linkPrefix={
              recordKey === "cases"
                ? "/cases"
                : recordKey === "people"
                  ? "/members"
                  : undefined
            }
          />
        </section>
      ) : (
        <Empty
          title={documents ? "No documents available" : "Nothing to show yet"}
        >
          {documents
            ? "Accepted agreements, receipts and permitted evidence will appear here. Document access is checked again when you download."
            : "New records will appear here when there is activity."}
        </Empty>
      )}
    </>
  );
}

function StartConversation({
  loanId,
  applicationId,
}: {
  loanId?: string;
  applicationId?: string;
}) {
  const navigate = useNavigate();
  return (
    <div className="conversation-action">
      <ApiForm
        submitLabel="Open private conversation"
        onSubmit={() =>
          post<{ id: string }>("/community/threads", {
            ...(loanId
              ? { loan_id: loanId }
              : { application_id: applicationId }),
          })
        }
        onSuccess={(data) =>
          navigate(`/inbox?thread=${(data as { id: string }).id}`)
        }
      >
        {null}
      </ApiForm>
    </div>
  );
}

export function CommissionReview() {
  const { id } = useParams();
  const query = useQuery({
    queryKey: ["commission", id],
    queryFn: () => apiRequest<DataRecord>(`/loans/${id}/commission`),
  });
  const [checkout, setCheckout] = useState<DataRecord | null>(null);
  if (query.isPending) return <Loading />;
  if (query.error) return <ErrorNotice error={query.error} />;
  const record = query.data;
  return (
    <>
      <Link className="back-link" to={`/loans/${id}`}>
        <ArrowLeft size={16} />
        Shared loan record
      </Link>
      <PageHeading
        title="One funded loan. One platform commission."
        description="The lender-paid origination commission is distinct from interest and provider charges. No commission is taken on repayments."
      />
      <section className="surface narrow">
        <DefinitionList
          rows={[
            ["Commission amount", money(String(record.amount))],
            [
              "Confirmed collected amount",
              money(String(record.collected_amount || 0)),
            ],
            ["Status", <Status value={String(record.status)} />],
            ["Policy version", String(record.policy_version || "Not accrued")],
          ]}
        />
        {record.id && record.status !== "collected" ? (
          <ApiForm
            submitLabel="Create commission checkout"
            onSubmit={(data) =>
              post(String(record.checkout_path), {
                operation_id: text(data, "operation_id"),
              })
            }
            onSuccess={(data) => setCheckout(data as DataRecord)}
          >
            <CheckField name="commission-accept" required>
              I have reviewed this separate platform fee.
            </CheckField>
          </ApiForm>
        ) : (
          <Notice>
            {record.id
              ? "The server records the commission’s confirmed collection status."
              : "No commission has accrued. It is earned only after confirmed funding."}
          </Notice>
        )}
        {checkout && (
          <>
            <Notice tone="success">
              Commission checkout created. Confirmation requires the verified
              provider event.
            </Notice>
            {typeof checkout.checkout_url === "string" &&
              /^https?:\/\//.test(checkout.checkout_url) && (
                <Button asChild>
                  <a href={checkout.checkout_url}>
                    Continue to fee checkout
                    <ArrowRight size={16} />
                  </a>
                </Button>
              )}
          </>
        )}
        <Notice tone="warning">
          An approved, configured PixelFlow platform-fee test route is required.
          Missing arrangements return an explicit error; no payment is
          fabricated.
        </Notice>
      </section>
    </>
  );
}
