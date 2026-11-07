import { useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Checkbox, Label } from "@pixelvault/ui";
import type { Person } from "@pixelvault/contracts";
import {
  Action,
  Button,
  DisclosureBlock,
  Empty,
  ErrorState,
  Field,
  Form,
  Heading,
  Illustration,
  Loading,
  Note,
  Page,
  Panel,
  PersonLine,
  Picker,
  Status,
  TextField,
  asset,
  date,
} from "../../components/ui";
import { ConfirmAction } from "../../components/ConfirmAction";
import { api, operationId, post, saveFile } from "../../app/api";
import { useMemberQuery, useSession } from "../../app/session";
export function ContactScreen() {
  const { refresh } = useSession();
  const contacts = useMemberQuery<{
    email: string;
    mobile_number: string;
    notice: string;
    verification: { status: string };
  }>(["contacts"], "/auth/contacts");
  const recovery = useMemberQuery<{
    verified: boolean;
    email: string;
    delivery_available: boolean;
    delivery_mode: string;
  }>(["recovery-email"], "/auth/recovery-email");
  return (
    <Page
      title="Your private contact details"
      description="These details do not appear on your public profile."
      back
    >
      {contacts.isPending ? (
        <Loading />
      ) : contacts.error ? (
        <ErrorState error={contacts.error} retry={() => contacts.refetch()} />
      ) : (
        contacts.data && (
          <>
            <Form
              submit="Save contact details"
              success="Contacts updated. Review the separate verification states below."
              onSubmit={async (data) => {
                await api("/auth/contacts", {
                  method: "PATCH",
                  body: JSON.stringify({
                    email: String(data.get("email") || ""),
                    mobile_number: String(data.get("mobile_number") || ""),
                  }),
                });
                await contacts.refetch();
                await recovery.refetch();
                await refresh();
              }}
            >
              <Field
                label="Contact email"
                name="email"
                type="email"
                defaultValue={contacts.data.email}
                autoComplete="email"
                required
              />
              <Field
                label="Mobile number"
                name="mobile_number"
                type="tel"
                defaultValue={contacts.data.mobile_number}
                autoComplete="tel"
                required
              />
            </Form>
            <Note>{contacts.data.notice}</Note>
            <section>
              <Heading>Recovery email ownership</Heading>
              {recovery.error ? (
                <ErrorState error={recovery.error} />
              ) : (
                recovery.data && (
                  <>
                    <p className="mb-4 text-sm text-muted-foreground">
                      {recovery.data.email}:{" "}
                      {recovery.data.verified
                        ? "ownership verified for recovery"
                        : "not verified for account recovery"}
                    </p>
                    <Form
                      submit="Send an ownership verification link"
                      success="Verification requested. Follow the private email link to confirm ownership."
                      disabled={!recovery.data.delivery_available}
                      onSubmit={() => post("/auth/recovery-email", {})}
                    >
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        {recovery.data.delivery_mode === "local_capture"
                          ? "Test mode captures email locally; it does not send external messages."
                          : "The link verifies your recovery email only. It accepts no loan terms."}
                      </p>
                    </Form>
                    {!recovery.data.delivery_available && (
                      <Note>
                        Email delivery is currently unavailable. Contact private
                        support for help.
                      </Note>
                    )}
                  </>
                )
              )}
            </section>
            <Action to="/verification" variant="outline" className="w-full">
              Review your contact evidence check
            </Action>
          </>
        )
      )}
    </Page>
  );
}
type Invitation = {
  id: string;
  display_name: string;
  email: string;
  mobile_number: string;
  facebook_url: string;
  relationship: string;
  status: string;
  version: number;
  direction: "outgoing" | "incoming";
  inviter: Person;
  member: Person | null;
  ready_for_application: boolean;
  notice: string;
  invitation_path?: string;
  expires_at: string;
};
export function CoBorrowersScreen() {
  const { token } = useParams();
  const query = useMemberQuery<{ invitations: Invitation[] }>(
    ["invitations"],
    "/connections/co-borrowers",
  );
  const claim = useMemberQuery<Invitation>(
    ["invitation-claim", token],
    `/connections/co-borrowers/invite/${encodeURIComponent(token || "")}`,
    { enabled: !!token },
  );
  const [error, setError] = useState<unknown>(null),
    [copied, setCopied] = useState("");
  const key = useRef(operationId());
  const rows = token
    ? claim.data
      ? [claim.data]
      : []
    : query.data?.invitations || [];
  return (
    <Page
      title="Invite, verify, then decide."
      description="A co-borrower invitation requires their own identity checks and consent."
      back
    >
      <Note>
        An accepted invitation shares agreed contact details for an application.
        It does not create joint liability, a guarantee or access to loan
        documents.
      </Note>
      {error !== null && <ErrorState error={error} />}
      {(token ? claim : query).isPending ? (
        <Loading />
      ) : (token ? claim : query).error ? (
        <ErrorState error={(token ? claim : query).error} />
      ) : (
        rows.map((row) => (
          <Panel key={row.id}>
            <PersonLine
              person={row.member || row.inviter}
              subtitle={
                row.direction === "outgoing"
                  ? `Invitation for ${row.display_name}`
                  : "Invited you privately"
              }
            />
            <div className="mt-3 flex justify-between gap-3">
              <Status value={row.status} />
              <span className="text-xs text-muted-foreground">
                {row.ready_for_application
                  ? "Ready to reference"
                  : "Separate checks and consent required"}
              </span>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              {row.notice}
            </p>
            {row.invitation_path && (
              <Button
                className="mt-4 w-full"
                variant="outline"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(
                      new URL(asset(row.invitation_path), location.origin).href,
                    );
                    setCopied(row.id);
                  } catch (e) {
                    setError(e);
                  }
                }}
              >
                {copied === row.id
                  ? "Invitation link copied"
                  : "Copy private invitation link"}
              </Button>
            )}
            {row.direction === "incoming" && row.status === "pending" && (
              <div className="mt-4">
                <ConfirmAction
                  label="Accept contact sharing"
                  title="Read this sharing notice."
                  description={row.notice}
                  fingerprint={`${row.id}:${row.version}`}
                  reconcile={() => query.refetch()}
                  onConfirm={async () => {
                    await post(`/connections/co-borrowers/${row.id}/action`, {
                      decision: "accept",
                      consent: true,
                      expected_version: row.version,
                    });
                    await query.refetch();
                    if (token) await claim.refetch();
                  }}
                />
              </div>
            )}
            {["pending", "accepted"].includes(row.status) && (
              <Button
                variant="ghost"
                className="mt-3 w-full"
                onClick={async () => {
                  try {
                    await post(`/connections/co-borrowers/${row.id}/action`, {
                      decision:
                        row.status === "pending" && row.direction === "incoming"
                          ? "decline"
                          : "revoke",
                      expected_version: row.version,
                    });
                    await query.refetch();
                    if (token) await claim.refetch();
                  } catch (e) {
                    setError(e);
                  }
                }}
              >
                {row.direction === "outgoing"
                  ? "Cancel invitation"
                  : row.status === "pending"
                    ? "Decline invitation"
                    : "Revoke sharing"}
              </Button>
            )}
          </Panel>
        ))
      )}
      {!token && (
        <DisclosureBlock title="Invite a person" defaultOpen={!rows.length}>
          <Form
            submit="Create a private invitation"
            success="Invitation created. Share the private link only with the consenting person."
            onSubmit={async (data) => {
              await post("/connections/co-borrowers", {
                display_name: String(data.get("display_name") || ""),
                email: String(data.get("email") || ""),
                mobile_number: String(data.get("mobile_number") || ""),
                facebook_url: String(data.get("facebook_url") || ""),
                relationship: String(data.get("relationship") || ""),
                permission_confirmed: !!data.get("permission"),
                operation_id: key.current,
              });
              key.current = operationId();
              await query.refetch();
            }}
          >
            <Field
              label="Their name"
              name="display_name"
              maxLength={100}
              required
            />
            <Field label="Their email" name="email" type="email" required />
            <Field
              label="Their mobile number (optional)"
              name="mobile_number"
              type="tel"
            />
            <Field
              label="Facebook profile (optional)"
              name="facebook_url"
              type="url"
              placeholder="https://www.facebook.com/…"
            />
            <Field
              label="Your relationship"
              name="relationship"
              defaultValue="other"
              placeholder="family, friend, colleague or other"
              maxLength={100}
            />
            <div className="flex items-start gap-3">
              <Checkbox
                id="invite-permission"
                name="permission"
                required
                className="mt-1 size-5"
              />
              <Label
                htmlFor="invite-permission"
                className="min-h-11 text-sm leading-relaxed"
              >
                This person has agreed to receive this private invitation.
              </Label>
            </div>
          </Form>
        </DisclosureBlock>
      )}
    </Page>
  );
}
type Check = {
  id: string;
  kind: string;
  status: string;
  reason: string;
  version: number;
};
type Doc = {
  id: string;
  name: string;
  purpose: string;
  status: string;
  size: number;
};
export function VerificationScreen() {
  const query = useMemberQuery<{ cases: Check[]; required_checks: string[] }>(
    ["verification"],
    "/verification",
  );
  const documents = useMemberQuery<Doc[]>(["documents"], "/documents");
  const registration = useMemberQuery<{
    status: string;
    authority: string;
    evidence_ref: string;
  }>(["lender-registration"], "/lender-registration");
  const [kind, setKind] = useState("identity"),
    [document, setDocument] = useState("none"),
    [purpose, setPurpose] = useState("identity"),
    [error, setError] = useState<unknown>(null);
  return (
    <Page
      title="Your verification center"
      description="Private checks, clear statuses and separate ownership verification."
      back
    >
      <Illustration scene="lending-journey" className="mx-auto max-w-64" />
      <Note>
        Test environment: use synthetic details only. Uploading evidence does
        not verify authenticity or authorize live lending.
      </Note>
      {query.isPending ? (
        <Loading />
      ) : query.error ? (
        <ErrorState error={query.error} />
      ) : (
        <div className="divide-y divide-border">
          {(query.data?.required_checks || []).map((kind) => {
            const row = query.data?.cases.find((row) => row.kind === kind);
            return (
              <div key={kind} className="flex justify-between gap-4 py-4">
                <div>
                  <h2 className="text-sm font-bold">
                    {kind.replaceAll("_", " ")}
                  </h2>
                  {row?.reason && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {row.reason}
                    </p>
                  )}
                </div>
                <Status value={row?.status || "not_submitted"} />
              </div>
            );
          })}
        </div>
      )}
      <DisclosureBlock title="Upload private evidence">
        <Form
          submit="Upload evidence"
          success="File received for safety review. It has not been verified."
          onSubmit={async (data) => {
            data.set("purpose", purpose);
            await api("/documents/upload", { method: "POST", body: data });
            await documents.refetch();
          }}
        >
          <Picker
            label="Evidence purpose"
            value={purpose}
            onChange={setPurpose}
            options={[
              "identity",
              "income",
              "funding_account",
              "address",
              "registration",
            ].map((value) => ({ value, label: value.replaceAll("_", " ") }))}
          />
          <Field
            label="PDF, PNG or JPEG"
            name="file"
            type="file"
            accept="application/pdf,image/jpeg,image/png"
            required
          />
        </Form>
      </DisclosureBlock>
      <DisclosureBlock title="Submit a check">
        <Form
          submit="Submit for review"
          success="Check submitted. A reviewer makes the decision separately."
          onSubmit={async (data) => {
            await post("/verification", {
              kind,
              ...(document === "none" ? {} : { document_id: document }),
              notes: String(data.get("notes") || ""),
            });
            await query.refetch();
          }}
        >
          <Picker
            label="Check"
            value={kind}
            onChange={setKind}
            options={["identity", "income", "contact", "funding_account"].map(
              (value) => ({ value, label: value.replaceAll("_", " ") }),
            )}
          />
          <Picker
            label="Private evidence"
            value={document}
            onChange={setDocument}
            options={[
              { value: "none", label: "No file (contact check only)" },
              ...(documents.data || []).map((row) => ({
                value: row.id,
                label: `${row.name} (${row.status})`,
              })),
            ]}
          />
          <TextField
            label="Notes for your reviewer"
            name="notes"
            maxLength={500}
          />
        </Form>
      </DisclosureBlock>
      <DisclosureBlock title="Your private documents">
        {error !== null && <ErrorState error={error} />}
        {documents.error && <ErrorState error={documents.error} />}
        {documents.data?.map((row) => (
          <div key={row.id} className="border-b border-border py-3">
            <p className="text-sm font-semibold">{row.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {row.purpose.replaceAll("_", " ")} — {row.status}
            </p>
            <Button
              variant="outline"
              className="mt-2 w-full"
              disabled={row.status !== "clean"}
              onClick={async () => {
                try {
                  const grant = await api<{ url: string }>(
                    `/documents/${row.id}/download`,
                  );
                  await saveFile(grant.url);
                } catch (e) {
                  setError(e);
                }
              }}
            >
              Download authorized file
            </Button>
          </div>
        ))}
      </DisclosureBlock>
      <DisclosureBlock title="Individual lender registration">
        <p className="text-sm text-muted-foreground">
          Current evidence state: {registration.data?.status || "Loading…"}. A
          review does not establish legal lending authority.
        </p>
        <Form
          submit="Submit registration evidence"
          success="Registration evidence submitted for review."
          onSubmit={async (data) => {
            await post("/lender-registration", {
              authority: String(data.get("authority") || ""),
              evidence_ref: String(data.get("evidence_ref") || ""),
            });
            await registration.refetch();
          }}
        >
          <Field
            label="Relevant authority"
            name="authority"
            defaultValue={registration.data?.authority}
            required
          />
          <Field
            label="Evidence reference"
            name="evidence_ref"
            defaultValue={registration.data?.evidence_ref}
            required
          />
        </Form>
      </DisclosureBlock>
    </Page>
  );
}
export function LearnScreen() {
  const { refresh } = useSession();
  const query = useMemberQuery<{
    questions: { prompt: string; options: string[] }[];
    completed: boolean;
  }>(["literacy"], "/literacy/complete");
  const [answers, setAnswers] = useState<Record<number, string>>({});
  return (
    <Page
      title="A little knowledge goes a long way."
      description="Understand costs, dates and the limits of verification."
      back
    >
      <Illustration scene="community-workshop" className="mx-auto max-w-64" />
      {query.isPending ? (
        <Loading />
      ) : query.error ? (
        <ErrorState error={query.error} />
      ) : (
        query.data && (
          <>
            <Note>
              Compare total cost and exact payment dates before accepting. An
              identity check is not a repayment guarantee, and an offer is not
              an approved credit line.
            </Note>
            {query.data.completed ? (
              <Note>
                You completed this learning step. Your eligibility still depends
                on separate current checks.
              </Note>
            ) : (
              <Form
                submit="Complete the learning step"
                disabled={
                  Object.keys(answers).length !== query.data.questions.length
                }
                success="Learning step recorded."
                onSubmit={async () => {
                  await post("/literacy/complete", {
                    answers: query.data!.questions.map((_, index) =>
                      Number(answers[index]),
                    ),
                  });
                  await query.refetch();
                  await post("/community/awards", {});
                  await refresh();
                }}
              >
                {query.data.questions.map((question, index) => (
                  <Picker
                    key={question.prompt}
                    label={question.prompt}
                    value={answers[index] || ""}
                    onChange={(value) =>
                      setAnswers({ ...answers, [index]: value })
                    }
                    options={question.options.map((label, index) => ({
                      label,
                      value: String(index),
                    }))}
                  />
                ))}
              </Form>
            )}
          </>
        )
      )}
    </Page>
  );
}
