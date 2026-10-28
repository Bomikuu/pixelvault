import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  CheckCircle2,
  FileCheck2,
  LockKeyhole,
  ShieldCheck,
  Upload,
} from "lucide-react";
import type { DataRecord, Verification } from "@pixelvault/contracts";
import { apiRequest, post } from "../app/api";
import {
  ActionLink,
  ApiForm,
  DefinitionList,
  Empty,
  ErrorNotice,
  Field,
  Loading,
  Notice,
  PageHeading,
  SelectField,
  Status,
  TextField,
  IllustratedInfoDialog,
} from "../components";
import { date, label, text } from "../lib/format";
export function VerificationPage() {
  const query = useQuery({
    queryKey: ["verification"],
    queryFn: () =>
      apiRequest<{
        cases: Verification[];
        required_checks: string[];
        environment: string;
      }>("/verification"),
  });
  const [documentId, setDocumentId] = useState("");
  return (
    <>
      <PageHeading
        title="Build a verified foundation."
        description="Identity, income and lender registration are separate checks. Uploading a document is not approval."
        action={
          <IllustratedInfoDialog
            title="Private checks. Clear boundaries."
            description="Evidence is reviewed only by permitted staff. An uploaded document is not approval, and identity checks do not establish legal lending authority. Test adapters use synthetic evidence only."
            scene="welcome-community"
            triggerLabel="How verification works"
          />
        }
      />
      <div className="verification-layout">
        <section>
          <div className="surface">
            <h2>Your verification record</h2>
            {query.isPending ? (
              <Loading />
            ) : query.error ? (
              <ErrorNotice error={query.error} />
            ) : (
              <div className="verification-checks">
                {query.data.required_checks.map((kind) => {
                  const cases = query.data.cases.filter((c) => c.kind === kind);
                  const check = cases[0];
                  return (
                    <div className="verification-check" key={kind}>
                      <span className="verification-check-icon">
                        <ShieldCheck size={21} />
                      </span>
                      <div>
                        <strong>{label(kind)}</strong>
                        <p>
                          {check?.reason ||
                            "Submit evidence for an authorized review."}
                        </p>
                        {!!check?.expires_at && (
                          <small>
                            Valid until {date(String(check.expires_at))}
                          </small>
                        )}
                      </div>
                      <Status value={check?.status || "not_submitted"} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <section className="surface">
            <h2>Submit a review request</h2>
            <Notice tone="warning">
              Synthetic evidence only. The test adapter does not perform real
              identity or liveness verification.
            </Notice>
            <ApiForm
              submitLabel="Submit for review"
              onSubmit={(data) =>
                post("/verification", {
                  kind: text(data, "kind"),
                  document_id: text(data, "document_id") || undefined,
                  notes: text(data, "notes"),
                })
              }
              successMessage="Your evidence is awaiting review. This is not verification approval."
            >
              <SelectField
                name="kind"
                label="Evidence category"
                options={[
                  { value: "identity", label: "Identity and liveness" },
                  { value: "income", label: "Income and affordability" },
                  { value: "contact", label: "Contact ownership" },
                  {
                    value: "funding_account",
                    label: "Funding-account ownership",
                  },
                ]}
              />
              <Field
                key={documentId}
                name="document_id"
                label="Private document reference"
                defaultValue={documentId}
                help="Use the reference from the upload below. Contact review may not need a document."
              />
              <TextField
                name="notes"
                label="Relevant context"
                help="Mention employment type or evidence context, without repeating sensitive ID or account numbers."
              />
            </ApiForm>
          </section>
        </section>
        <aside>
          <section className="surface">
            <span className="section-symbol">
              <Upload size={23} />
            </span>
            <h2>Private evidence upload</h2>
            <p>
              PDF, JPEG or PNG up to 10 MiB. Files enter quarantine and are not
              downloadable until scanning permits access.
            </p>
            <ApiForm
              submitLabel="Upload test evidence"
              onSubmit={async (data) => {
                const payload = new FormData();
                payload.append("file", data.get("file")!);
                payload.append("purpose", text(data, "purpose"));
                return apiRequest<DataRecord>("/documents/upload", {
                  method: "POST",
                  body: payload,
                });
              }}
              onSuccess={(result) =>
                setDocumentId(String((result as DataRecord).id))
              }
              successMessage="Upload received in quarantine. A reviewer still needs to assess your evidence."
            >
              <SelectField
                name="purpose"
                label="Document purpose"
                options={[
                  { value: "identity", label: "Identity evidence" },
                  { value: "income", label: "Income evidence" },
                  {
                    value: "funding_account",
                    label: "Funding-account evidence",
                  },
                  { value: "registration", label: "Registration evidence" },
                ]}
              />
              <Field
                name="file"
                label="Synthetic file"
                type="file"
                accept="application/pdf,image/jpeg,image/png"
                required
              />
            </ApiForm>
            {documentId && (
              <DefinitionList
                rows={[
                  [
                    "Document reference",
                    <span className="break-text">{documentId}</span>,
                  ],
                ]}
              />
            )}
          </section>
          <div className="quiet-note">
            <LockKeyhole size={21} />
            <p>
              Documents never appear on public profiles. Access is
              purpose-limited, expires quickly and is audited.
            </p>
          </div>
          <ActionLink to="/lender-registration" variant="outline">
            Lender registration
            <ArrowRight size={15} />
          </ActionLink>
        </aside>
      </div>
    </>
  );
}
export function RegistrationPage() {
  const query = useQuery({
    queryKey: ["registration"],
    queryFn: () => apiRequest<DataRecord>("/lender-registration"),
  });
  return (
    <>
      <PageHeading
        title="Lending eligibility has its own record."
        description="Being identity-verified does not establish authorization to conduct a lending business."
      />
      <div className="form-layout">
        <section className="surface">
          <h2>Registration evidence</h2>
          {query.isPending ? (
            <Loading />
          ) : query.error ? (
            <ErrorNotice error={query.error} />
          ) : (
            <DefinitionList
              rows={[
                [
                  "Review status",
                  <Status
                    value={String(query.data.status || "not_submitted")}
                  />,
                ],
                [
                  "Authority or registration basis",
                  String(query.data.authority || "Not provided"),
                ],
                [
                  "Reviewer reason",
                  String(query.data.reason || "No decision recorded"),
                ],
              ]}
            />
          )}
          <ApiForm
            submitLabel="Submit registration evidence"
            onSubmit={(data) =>
              post("/lender-registration", {
                authority: text(data, "authority"),
                evidence_ref: text(data, "evidence_ref"),
                notes: text(data, "notes"),
              })
            }
            successMessage="Registration evidence is awaiting review. This does not confer legal authorization."
          >
            <Field
              name="authority"
              label="Authority or registration basis"
              required
              placeholder="Describe the evidence being submitted"
            />
            <Field
              name="evidence_ref"
              label="Private evidence reference"
              required
              help="Upload evidence in the verification center first."
            />
            <TextField name="notes" label="Additional context" />
          </ApiForm>
        </section>
        <aside className="form-aside">
          <FileCheck2 size={27} />
          <h2>Specific evidence. Honest status.</h2>
          <p>
            Future formal lender registration is supported independently from
            identity checks. An app review cannot issue a government license.
          </p>
          <Notice tone="warning">
            Live origination stays disabled while regulatory classification,
            lender eligibility and approved provider arrangements remain
            unresolved.
          </Notice>
          <Link to="/verification">
            Go to verification center
            <ArrowRight size={15} />
          </Link>
        </aside>
      </div>
    </>
  );
}
