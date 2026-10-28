import { useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, BookOpen, MessageSquare } from "lucide-react";
import type { DataRecord, Loan } from "@pixelvault/contracts";
import { apiRequest, items, post } from "../app/api";
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
  RecordRows,
  SelectField,
  Status,
  TextField,
} from "../components";
import { label, money, text } from "../lib/format";
import { Schedule } from "./ExplorePages";
import type { Installment } from "@pixelvault/contracts";
export function ContributionsPage() {
  const query = useQuery({
    queryKey: ["contributions"],
    queryFn: () =>
      apiRequest<{ contributions: DataRecord[] }>("/community/contributions"),
  });
  return (
    <>
      <PageHeading
        title="A useful idea can go a long way."
        description="Share an educational contribution for moderation. Community progress comes from helping, not borrowing more."
      />
      <div className="form-layout">
        <section className="surface">
          <ApiForm
            submitLabel="Submit for moderation"
            onSubmit={(data) =>
              post("/community/contributions", {
                title: text(data, "title"),
                body: text(data, "body"),
              })
            }
            successMessage="Your contribution is awaiting moderation. Submission does not automatically earn a badge."
          >
            <Field name="title" label="Your idea in one line" required />
            <TextField
              name="body"
              label="What can the community learn?"
              maxLength={4000}
              required
              help="Share general learning. Do not include individual debt claims, identities, account details or financial promises."
            />
          </ApiForm>
        </section>
        <aside className="surface">
          <h2>Your contributions</h2>
          {query.isPending ? (
            <Loading />
          ) : query.error ? (
            <ErrorNotice error={query.error} />
          ) : (
            <RecordRows
              records={query.data.contributions}
              empty="Your first idea is still ahead"
            />
          )}
        </aside>
      </div>
    </>
  );
}
export function ReportContentPage() {
  const [params] = useSearchParams();
  const type = params.get("type") || "review",
    id = params.get("id");
  return (
    <>
      <PageHeading
        title="Help keep the community respectful."
        description="Reports go to authorized moderation. A report alone does not establish wrongdoing."
      />
      <section className="surface narrow">
        <ApiForm
          submitLabel="Submit private report"
          onSubmit={(data) =>
            post("/community/reports", {
              content_type: type,
              content_id: id || text(data, "content_id"),
              reason: text(data, "reason"),
            })
          }
          successMessage="Your report was received for review."
        >
          {!id && (
            <Field name="content_id" label="Content reference" required />
          )}
          <TextField
            name="reason"
            label="What should a moderator review?"
            required
            help="Describe the concern without adding unnecessary private information."
          />
        </ApiForm>
      </section>
    </>
  );
}
export function OwnReviews() {
  const query = useQuery({
    queryKey: ["own-reviews"],
    queryFn: () => apiRequest<{ reviews: DataRecord[] }>("/community/reviews"),
  });
  return (
    <>
      <PageHeading
        title="Your reviews, with context."
        description="Reviews remain sealed until eligible publication and moderation. Private financial details never belong in a public review."
      />
      {query.isPending ? (
        <Loading />
      ) : query.error ? (
        <ErrorNotice error={query.error} />
      ) : query.data.reviews.length ? (
        query.data.reviews.map((record) => (
          <section className="surface" key={String(record.id)}>
            <Status value={String(record.status)} />
            <p className="preserve-lines">{String(record.body)}</p>
            <ApiForm
              submitLabel="Request review appeal"
              onSubmit={(data) =>
                post(`/community/reviews/${record.id}/appeal`, {
                  reason: text(data, "reason"),
                })
              }
              successMessage="An appeal was recorded for review."
            >
              <TextField
                name="reason"
                label="Explain the correction or appeal"
                required
              />
            </ApiForm>
          </section>
        ))
      ) : (
        <Empty title="No reviews submitted" icon={MessageSquare}>
          Review a counterparty from an eligible loan’s private timeline.
        </Empty>
      )}
    </>
  );
}
export function ReviewResponsePage() {
  const { id } = useParams();
  return (
    <>
      <PageHeading
        title="Add your perspective respectfully."
        description="Responses are moderated before publication. Keep financial claims in private cases."
      />
      <section className="surface narrow">
        <ApiForm
          submitLabel="Submit response for moderation"
          onSubmit={(data) =>
            post(`/community/reviews/${id}/response`, {
              body: text(data, "body"),
            })
          }
          successMessage="Your response is awaiting moderation."
        >
          <TextField name="body" label="Your response" required />
        </ApiForm>
      </section>
    </>
  );
}
export function NotificationPreferences() {
  const query = useQuery({
    queryKey: ["notices"],
    queryFn: () => apiRequest<DataRecord>("/notices"),
  });
  return (
    <>
      <PageHeading
        title="Updates on your terms."
        description="Choose your reminder preferences. Test messages are captured locally and never sent as live SMS or email."
      />
      <section className="surface narrow">
        {query.isPending ? (
          <Loading />
        ) : query.error ? (
          <ErrorNotice error={query.error} />
        ) : (
          <ApiForm
            submitLabel="Save reminder preferences"
            onSubmit={(data) =>
              apiRequest("/notices", {
                method: "PATCH",
                body: JSON.stringify({
                  channel: text(data, "channel"),
                  debt_reminders: data.get("debt_reminders") === "on",
                }),
              })
            }
            successMessage="Your reminder preferences were updated."
          >
            <SelectField
              name="channel"
              label="Preferred channel"
              defaultValue={String(
                (query.data.preferences as DataRecord | undefined)?.channel ||
                  query.data.channel ||
                  "in_app",
              )}
              options={[
                { value: "in_app", label: "In-app notices" },
                { value: "email", label: "Email · test capture only" },
                { value: "sms", label: "SMS · test capture only" },
              ]}
            />
            <CheckField
              name="debt_reminders"
              defaultChecked={Boolean(
                (query.data.preferences as DataRecord | undefined)
                  ?.debt_reminders,
              )}
            >
              Receive private payment reminders
            </CheckField>
            <Notice>
              Proposed test quiet hours are 8 PM–8 AM Asia/Manila, with at most
              one debt reminder per day across channels. Unrelated contacts are
              never used for collection.
            </Notice>
          </ApiForm>
        )}
      </section>
    </>
  );
}
export function AmendmentsPage() {
  const [params] = useSearchParams();
  const query = useQuery({
    queryKey: ["amendments"],
    queryFn: () => apiRequest<DataRecord>("/cases/amendments"),
  });
  const records = items<DataRecord>(query.data, "amendments").filter(
    (row) => !params.get("loan") || row.loan_id === params.get("loan"),
  );
  return (
    <>
      <PageHeading
        title="A revised plan, agreed together."
        description="Pending proposals never overwrite your existing agreement. Both parties accept the exact new version."
        action={
          <ActionLink
            to={`/cases/amendments/new${params.get("loan") ? `?loan=${params.get("loan")}` : ""}`}
          >
            Propose an adjustment
          </ActionLink>
        }
      />
      {query.isPending ? (
        <Loading />
      ) : query.error ? (
        <ErrorNotice error={query.error} />
      ) : records.length ? (
        <div className="surface flush">
          <RecordRows records={records} linkPrefix="/cases/amendments" />
        </div>
      ) : (
        <Empty title="No adjustment proposals yet">
          Your existing schedule remains authoritative until a new proposal is
          accepted by both parties.
        </Empty>
      )}
    </>
  );
}
export function NewAmendment() {
  const [params] = useSearchParams();
  const loanId = params.get("loan");
  const query = useQuery({
    queryKey: ["loan", loanId],
    queryFn: () => apiRequest<Loan>(`/loans/${loanId}`),
    enabled: !!loanId,
  });
  const navigate = useNavigate();
  if (!loanId)
    return (
      <Empty
        title="Choose a loan first"
        action={<ActionLink to="/loans">My loans</ActionLink>}
      >
        Open the loan you want to discuss, then propose an adjustment.
      </Empty>
    );
  if (query.isPending) return <Loading />;
  if (query.error) return <ErrorNotice error={query.error} />;
  const loan = query.data;
  return (
    <>
      <PageHeading
        title="Propose a workable next chapter."
        description="Exact dates and terms are reviewed by both parties. Existing accrued interest is preserved separately."
      />
      <div className="form-layout">
        <section className="surface">
          <ApiForm
            submitLabel="Create test amendment proposal"
            onSubmit={(data) => {
              const dates = text(data, "due_dates")
                .split(/\s+/)
                .filter(Boolean);
              return post("/cases/amendments", {
                loan_id: loanId,
                reason: text(data, "reason"),
                terms: {
                  ...loan.terms,
                  principal: Number(loan.principal_balance),
                  annual_rate_bps: Math.round(
                    Number(data.get("annual_rate")) * 100,
                  ),
                  frequency: text(data, "frequency"),
                  effective_date: text(data, "effective_date"),
                  installment_count: dates.length,
                  due_dates: dates,
                  borrower_fees: [],
                  lender_fees: [],
                },
              });
            }}
            onSuccess={(data) =>
              navigate(`/cases/amendments/${(data as DataRecord).id}`)
            }
          >
            <DefinitionList
              rows={[
                ["Remaining principal", money(loan.principal_balance)],
                ["Existing accrued interest", money(loan.accrued_interest)],
              ]}
            />
            <Field
              name="annual_rate"
              label="Proposed annual interest (%)"
              defaultValue={loan.terms.annual_rate_bps / 100}
              type="number"
              min={0}
              max={100}
              step="0.01"
              required
            />
            <SelectField
              name="frequency"
              label="Payment frequency"
              defaultValue={loan.terms.frequency}
              options={[
                { value: "monthly", label: "Monthly" },
                { value: "twice_monthly", label: "Twice monthly" },
                { value: "weekly", label: "Weekly" },
                { value: "maturity", label: "Single maturity" },
              ]}
            />
            <Field
              name="effective_date"
              label="Effective date"
              type="date"
              required
              help="Use today’s Asia/Manila date. The server validates the effective date and balances."
            />
            <TextField
              name="due_dates"
              label="Exact future due dates"
              required
              placeholder="2026-11-28&#10;2026-12-28"
              help="Enter one YYYY-MM-DD date per line in increasing order. Single maturity requires one date."
            />
            <TextField
              name="reason"
              label="Why this adjustment is requested"
              required
            />
          </ApiForm>
        </section>
        <aside className="form-aside">
          <h2>Preserve the record.</h2>
          <p>
            The original agreement, ledger and acceptance history remain
            unchanged. This proposal cannot add hidden charges or automatically
            capitalize accrued interest.
          </p>
          <Notice>
            Both named parties must accept the same proposal hash. Acceptance
            uses the authenticated sandbox signing process.
          </Notice>
        </aside>
      </div>
    </>
  );
}
export function AmendmentDetail() {
  const { id } = useParams();
  const query = useQuery({
    queryKey: ["amendments"],
    queryFn: () => apiRequest<DataRecord>("/cases/amendments"),
  });
  if (query.isPending) return <Loading />;
  if (query.error) return <ErrorNotice error={query.error} />;
  const record = items<DataRecord>(query.data, "amendments").find(
    (row) => row.id === id,
  );
  if (!record)
    return (
      <Empty title="This proposal is unavailable">
        It may not belong to your account, or the reference may be incorrect.
      </Empty>
    );
  const disclosures = record.disclosures as DataRecord;
  return (
    <>
      <Link className="back-link" to="/cases/amendments">
        <ArrowLeft size={16} />
        Adjustment proposals
      </Link>
      <PageHeading
        title="Review the exact revised plan."
        description="Acceptance applies only to the version and hash shown here."
        action={<Status value={String(record.status)} />}
      />
      <div className="form-layout">
        <section className="surface">
          <h2>Financial effect</h2>
          <DefinitionList
            rows={[
              ["Principal", money(String(disclosures.principal))],
              [
                "Preserved accrued interest",
                money(String(disclosures.preserved_accrued_interest)),
              ],
              [
                "New scheduled interest",
                money(String(disclosures.total_interest)),
              ],
              [
                "Total remaining obligation",
                money(String(disclosures.total_remaining_obligation)),
              ],
              ["Recorded acceptances", String(record.acceptance_count)],
            ]}
          />
          <Schedule rows={(disclosures.schedule as Installment[]) || []} />
          <h2>Reason</h2>
          <p className="prose">{String(record.reason)}</p>
          <p className="hash">Proposal hash: {String(record.proposal_hash)}</p>
          <p className="hash">
            Original agreement: {String(record.original_agreement_hash)}
          </p>
        </section>
        <aside className="surface">
          <h2>A mutual decision</h2>
          {record.status === "awaiting_acceptance" ? (
            <>
              <ApiForm
                submitLabel="Accept test amendment"
                onSubmit={() =>
                  post(`/cases/amendments/${id}/accept`, {
                    proposal_hash: record.proposal_hash,
                  })
                }
                successMessage="Your acceptance was recorded. The revised plan activates only after both required acceptances."
              >
                <CheckField name="accept" required>
                  I understand the preserved interest, new dates and total
                  remaining obligation.
                </CheckField>
              </ApiForm>
              <div className="amendment-withdraw">
                <ApiForm
                  submitLabel="Withdraw pending proposal"
                  onSubmit={() => post(`/cases/amendments/${id}/withdraw`, {})}
                  successMessage="The pending proposal was withdrawn. Your existing schedule remains in place."
                >
                  <Notice>
                    If balances or circumstances have changed, withdraw and
                    request a fresh proposal.
                  </Notice>
                </ApiForm>
              </div>
            </>
          ) : (
            <Notice>
              This proposal is {label(record.status)}. Financial history remains
              traceable.
            </Notice>
          )}
        </aside>
      </div>
    </>
  );
}
