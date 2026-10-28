import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, LockKeyhole } from "lucide-react";
import type { CaseRecord, DataRecord } from "@pixelvault/contracts";
import { apiRequest, operationId, post } from "../app/api";
import {
  ApiForm,
  DefinitionList,
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
import { date, text } from "../lib/format";
export function NewCase() {
  const [params] = useSearchParams(),
    navigate = useNavigate();
  return (
    <>
      <PageHeading
        title="Let’s work through this privately."
        description="Request help, explain hardship, dispute a record or raise a privacy concern."
      />
      <div className="form-layout">
        <section className="surface">
          <ApiForm
            submitLabel="Open private case"
            onSubmit={(data) =>
              post<CaseRecord>("/cases", {
                kind: text(data, "kind"),
                loan_id: text(data, "loan_id") || undefined,
                body: text(data, "body"),
                operation_id: text(data, "operation_id"),
              })
            }
            onSuccess={(data) => navigate(`/cases/${(data as CaseRecord).id}`)}
          >
            <SelectField
              name="kind"
              label="What do you need help with?"
              options={[
                { value: "hardship", label: "Hardship or repayment support" },
                { value: "dispute", label: "Dispute a financial record" },
                { value: "complaint", label: "Complaint about conduct" },
                { value: "privacy", label: "Privacy or data request" },
                { value: "appeal", label: "Appeal a decision" },
              ]}
            />
            <Field
              name="loan_id"
              label="Related loan reference (optional)"
              defaultValue={params.get("loan") || ""}
            />
            <TextField
              name="body"
              label="Tell us what happened"
              required
              help="Include the relevant dates and the outcome you are seeking. Avoid unnecessary sensitive details."
            />
          </ApiForm>
        </section>
        <aside className="form-aside">
          <LockKeyhole size={26} />
          <h2>A private path forward.</h2>
          <p>
            Your case is visible only to authorized participants and assigned
            staff. Opening a complaint does not automatically mark anyone as
            fraudulent.
          </p>
          <Notice>
            Support remains available when new borrowing is restricted. A
            hardship request does not automatically change your payment
            schedule; an amendment needs the required acceptance.
          </Notice>
        </aside>
      </div>
    </>
  );
}
export function CaseDetail() {
  const { id } = useParams();
  const query = useQuery({
    queryKey: ["case", id],
    queryFn: () => apiRequest<CaseRecord>(`/cases/${id}`),
  });
  if (query.isPending) return <Loading />;
  if (query.error) return <ErrorNotice error={query.error} />;
  const c = query.data;
  return (
    <>
      <Link className="back-link" to="/cases">
        <ArrowLeft size={16} />
        Private cases
      </Link>
      <PageHeading
        title="Your private support record."
        description={`Case ${c.id.slice(0, 8)}`}
        action={<Status value={c.status} />}
      />
      <div className="form-layout">
        <section className="surface">
          <DefinitionList
            rows={[
              ["Case type", c.kind],
              ["Opened", date(c.created_at)],
              ["Related loan", c.loan_id || "No loan linked"],
            ]}
          />
          <h2>What you shared</h2>
          <p className="prose preserve-lines">{c.body}</p>
          <h2>Responses & decisions</h2>
          <RecordRows
            records={[
              ...((c.responses || []) as DataRecord[]),
              ...((c.decisions || []) as DataRecord[]),
            ]}
            empty="No decisions have been recorded"
          />
          <Notice>
            Any revised financial terms require a separately reviewed amendment.
            This case does not publish debt details or file a government
            complaint automatically.
          </Notice>
        </section>
        <aside className="surface">
          <h2>Add context</h2>
          {c.loan_id && (
            <Link
              className="text-link"
              to={`/cases/amendments/new?loan=${c.loan_id}`}
            >
              Propose a revised plan
              <ArrowRight size={15} />
            </Link>
          )}
          <ApiForm
            submitLabel="Add private response"
            onSubmit={(data) =>
              post(`/cases/${id}/responses`, { body: text(data, "body") })
            }
            successMessage="Your response was added to the case."
          >
            <TextField name="body" label="Your response" required />
          </ApiForm>
        </aside>
      </div>
    </>
  );
}
