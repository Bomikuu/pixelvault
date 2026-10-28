import { Link, useParams } from "react-router-dom";
import { useQuery, useQueries } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  ClipboardList,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import type { CaseRecord, DataRecord } from "@pixelvault/contracts";
import { apiRequest, items, post } from "../app/api";
import {
  ApiForm,
  ActionLink,
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
import { date, label, text } from "../lib/format";
const queueTypes = [
  {
    key: "verifications",
    name: "Verification reviews",
    description: "Review assigned evidence and specific checks.",
    icon: ShieldCheck,
  },
  {
    key: "registrations",
    name: "Lender registrations",
    description: "Separate eligibility evidence from identity checks.",
    icon: ClipboardList,
  },
  {
    key: "cases",
    name: "Private support cases",
    description: "Resolve a named issue with a traceable reason.",
    icon: LockKeyhole,
  },
];
export function WorkQueues() {
  const queues = useQueries({
    queries: queueTypes.map((kind) => ({
      queryKey: ["admin", kind.key],
      queryFn: () =>
        apiRequest<DataRecord | DataRecord[]>(`/admin/${kind.key}`),
      retry: false,
    })),
  });
  return (
    <>
      <PageHeading
        title="Give every decision a clear record."
        description="Choose a purpose-scoped queue. Your role does not grant universal access to documents."
      />
      <Notice>
        Staff decisions require the relevant purpose grant and recent
        authentication. No staff action activates live lending without the
        complete server-side evidence gate.
      </Notice>
      <div className="queue-list">
        {queueTypes.map((q, index) => (
          <Link to={`/admin/${q.key}`} key={q.key}>
            <q.icon size={25} />
            <div>
              <h2>{q.name}</h2>
              <p>{q.description}</p>
            </div>
            <span className="queue-count">
              {queues[index].isPending
                ? "Loading"
                : queues[index].error
                  ? "Grant required"
                  : Array.isArray(queues[index].data)
                    ? `${(queues[index].data as DataRecord[]).length} available`
                    : `${items<DataRecord>(queues[index].data, "assigned").length + items<DataRecord>(queues[index].data, "unassigned").length} available`}
            </span>
            <ArrowRight size={20} />
          </Link>
        ))}
      </div>
      <section className="surface narrow">
        <h2>Confirm sensitive access</h2>
        <ApiForm
          submitLabel="Confirm password"
          onSubmit={(data) =>
            post("/auth/step-up", {
              password: String(data.get("password") || ""),
            })
          }
          successMessage="Recent authentication recorded. Purpose grants are still checked for each operation."
        >
          <Field
            name="password"
            label="Account password"
            type="password"
            required
            autoComplete="current-password"
          />
        </ApiForm>
      </section>
    </>
  );
}
export function AdminQueue({
  kind,
}: {
  kind: "verifications" | "registrations" | "cases";
}) {
  const query = useQuery({
    queryKey: ["admin", kind],
    queryFn: () => apiRequest<DataRecord | DataRecord[]>(`/admin/${kind}`),
  });
  let records: DataRecord[] = [];
  if (query.data) {
    records = Array.isArray(query.data)
      ? query.data
      : kind === "cases"
        ? [
            ...items<DataRecord>(query.data, "assigned"),
            ...items<DataRecord>(query.data, "unassigned"),
          ]
        : items<DataRecord>(
            query.data,
            kind === "verifications" ? "cases" : "registrations",
          );
  }
  return (
    <>
      <PageHeading
        title={label(kind)}
        description="Only the minimum evidence needed for an assigned decision is available."
      />
      {query.isPending ? (
        <Loading />
      ) : query.error ? (
        <ErrorNotice error={query.error} />
      ) : records.length ? (
        <section className="surface flush">
          <RecordRows records={records} linkPrefix={`/admin/${kind}`} />
        </section>
      ) : (
        <Empty title="This queue is clear." icon={ClipboardList}>
          There are no records available for your current purpose grants.
        </Empty>
      )}
    </>
  );
}
export function AdminDecision({
  kind,
}: {
  kind: "verifications" | "registrations" | "cases";
}) {
  const { id } = useParams();
  const query = useQuery({
    queryKey: ["admin-record", kind, id],
    queryFn: () => apiRequest<DataRecord>(`/admin/${kind}/${id}`),
  });
  if (query.isPending) return <Loading />;
  if (query.error) return <ErrorNotice error={query.error} />;
  const record = query.data;
  return (
    <>
      <Link className="back-link" to={`/admin/${kind}`}>
        <ArrowLeft size={16} />
        Queue
      </Link>
      <PageHeading
        title={`${label(kind === "cases" ? "private case" : kind === "verifications" ? "verification review" : "registration review")}`}
        description={`Record ${id?.slice(0, 8)}`}
        action={<Status value={String(record.status || "pending")} />}
      />
      <div className="form-layout">
        <section className="surface">
          <h2>Purpose-limited record</h2>
          <DefinitionList
            rows={Object.entries(record)
              .filter(
                ([key, value]) =>
                  ![
                    "id",
                    "version",
                    "body",
                    "decisions",
                    "evidence_ref",
                    "document_id",
                  ].includes(key) &&
                  value !== null &&
                  typeof value !== "object",
              )
              .map(([key, value]) => [label(key), String(value)])}
          />
          {record.body !== undefined && (
            <>
              <h2>Member’s context</h2>
              <p className="prose">{String(record.body)}</p>
            </>
          )}
          {kind === "verifications" &&
            typeof record.document_id === "string" && (
              <div>
                <h2>Private test evidence</h2>
                <ApiForm
                  submitLabel="Scan synthetic evidence"
                  onSubmit={() =>
                    post(`/admin/documents/${record.document_id}/scan`, {})
                  }
                  successMessage="Test scan processed. This does not establish real document authenticity."
                >
                  <Notice>
                    Sandbox scan only. Review still requires purpose grants and
                    recent authentication.
                  </Notice>
                </ApiForm>
                <ApiForm
                  submitLabel="Request evidence download"
                  onSubmit={async () => {
                    const grant = await apiRequest<{ url: string }>(
                      `/documents/${record.document_id}/download?purpose=verification_review`,
                    );
                    const target = new URL(grant.url, location.origin);
                    if (target.origin === location.origin)
                      window.location.assign(target.href);
                  }}
                >
                  <Notice>
                    Access is logged and the permitted link expires after 60
                    seconds.
                  </Notice>
                </ApiForm>
              </div>
            )}
          {kind === "cases" && (
            <ApiForm
              submitLabel="Assign case to me"
              onSubmit={() => post(`/admin/cases/${id}/assign`, {})}
              successMessage="Case assignment recorded."
            >
              {null}
            </ApiForm>
          )}
          <Notice>
            Document access is granted separately and audited. Do not copy
            evidence into public notes or external evaluation services.
          </Notice>
        </section>
        <aside className="surface">
          <h2>Record a decision</h2>
          <ApiForm
            submitLabel="Submit reasoned decision"
            onSubmit={(data) =>
              post(
                `/admin/${kind}/${id}/${kind === "cases" ? "decision" : "review"}`,
                {
                  expected_version: record.version,
                  [kind === "cases" ? "decision" : "outcome"]: text(
                    data,
                    "outcome",
                  ),
                  reason: text(data, "reason"),
                  evidence_ref: text(data, "evidence_ref"),
                },
              )
            }
            successMessage="Decision recorded with its reason and version."
          >
            <SelectField
              name="outcome"
              label="Outcome"
              options={(kind === "cases"
                ? [
                    "needs_information",
                    "resolved",
                    "dismissed",
                    "substantiated",
                  ]
                : kind === "registrations"
                  ? [
                      "needs_information",
                      "evidence_reviewed",
                      "rejected",
                      "suspended",
                      "revoked",
                    ]
                  : ["needs_information", "approved", "rejected"]
              ).map((value) => ({ value, label: label(value) }))}
            />
            {kind === "registrations" && (
              <Field
                name="evidence_ref"
                label="Reviewed evidence reference"
                required
              />
            )}
            <TextField
              name="reason"
              label="Reason for this decision"
              required
              help="Be specific and factual. A complaint alone is not a finding of fraud."
            />
          </ApiForm>
        </aside>
      </div>
    </>
  );
}
export function AdminRecords({ kind, title }: { kind: string; title: string }) {
  const query = useQuery({
    queryKey: ["admin", kind],
    queryFn: () => apiRequest<DataRecord | DataRecord[]>(`/admin/${kind}`),
  });
  const data = query.data;
  const records = Array.isArray(data)
    ? data
    : items<DataRecord>(data, kind === "reconciliation" ? "operations" : kind);
  const summary =
    data && !Array.isArray(data)
      ? Object.entries(data).filter(
          ([, value]) => value !== null && typeof value !== "object",
        )
      : [];
  return (
    <>
      <PageHeading
        title={title}
        action={
          kind === "templates" ? (
            <ActionLink to="/admin/policies" variant="outline">
              Review policy records
            </ActionLink>
          ) : undefined
        }
        description="A purpose-scoped view derived from the authoritative history."
      />
      {query.isPending ? (
        <Loading />
      ) : query.error ? (
        <ErrorNotice error={query.error} retry={() => query.refetch()} />
      ) : (
        <>
          <section className="surface">
            {summary.length > 0 && (
              <DefinitionList
                rows={summary.map(([key, value]) => [
                  label(key),
                  String(value),
                ])}
              />
            )}
            <RecordRows
              records={records}
              empty="No records available for this view"
            />
          </section>
          <Notice>
            Expected, confirmed, reversed and uncertain amounts remain separate.
            No action here silently changes the financial ledger or implies a
            template has been legally reviewed.
          </Notice>
        </>
      )}
    </>
  );
}
export function ModerationPage() {
  const query = useQuery({
    queryKey: ["moderation"],
    queryFn: () =>
      apiRequest<{
        reviews: DataRecord[];
        contributions: DataRecord[];
        reports: DataRecord[];
      }>("/admin/moderation"),
  });
  return (
    <>
      <PageHeading
        title="Keep the community respectful."
        description="Review content with a reasoned decision. Financial allegations belong in private support."
      />
      {query.isPending ? (
        <Loading />
      ) : query.error ? (
        <ErrorNotice error={query.error} />
      ) : (
        ["reviews", "contributions", "reports"].map((kind) => (
          <section className="surface" key={kind}>
            <h2>{label(kind)}</h2>
            {(query.data[kind as keyof typeof query.data] || []).map(
              (record) => (
                <div className="moderation-record" key={String(record.id)}>
                  <h3>
                    {String(record.title || record.author_display_name || kind)}
                  </h3>
                  <p>{String(record.body || record.reason || "")}</p>
                  <Status value={String(record.status || "pending")} />
                  {kind !== "reports" && (
                    <ApiForm
                      submitLabel="Record moderation decision"
                      onSubmit={(data) =>
                        post(`/admin/moderation/${record.id}`, {
                          content_type:
                            kind === "reviews" ? "review" : "contribution",
                          expected_version: record.version,
                          decision: text(data, "decision"),
                          reason: text(data, "reason"),
                        })
                      }
                      successMessage="Moderation decision recorded."
                    >
                      <SelectField
                        name="decision"
                        label="Decision"
                        options={["approved", "held", "rejected"].map(
                          (value) => ({ value, label: label(value) }),
                        )}
                      />
                      <TextField name="reason" label="Reason" required />
                    </ApiForm>
                  )}
                </div>
              ),
            )}
            {!query.data[kind as keyof typeof query.data]?.length && (
              <p className="muted">No records awaiting action.</p>
            )}
          </section>
        ))
      )}
    </>
  );
}
