import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Check, Copy, Link2, UserPlus } from "lucide-react";
import { Button, Input, Label } from "@pixelvault/ui";
import { apiRequest, post } from "../../app/api";
import {
  ActionLink,
  ApiForm,
  CheckField,
  Empty,
  ErrorNotice,
  Field,
  MemberAvatar,
  Notice,
  PageHeading,
  SelectField,
  Loading,
} from "../../components";
import { date, label } from "../../lib/format";
import { ProfileNavigation } from "../profile/ProfileNavigation";
import { InvitationReview } from "./InvitationReview";
import type { CoBorrowerInvitation, InvitationCollection } from "./types";
import "./connections.css";

function InvitationRow({ row }: { row: CoBorrowerInvitation }) {
  const [review, setReview] = useState(false),
    [copied, setCopied] = useState(false),
    [copyError, setCopyError] = useState(false);
  const person = row.direction === "incoming" ? row.inviter : row.member;
  const link = row.invitation_path
    ? `${window.location.origin}${row.invitation_path}`
    : "";
  return (
    <article className="invitation-row">
      <div className="invitation-person">
        <MemberAvatar
          name={person?.display_name || row.display_name}
          avatarKey={person?.avatar_key}
          photoUrl={person?.photo_url}
          reputation={person?.reputation}
          size={48}
        />
        <div>
          <h3>{person?.display_name || row.display_name}</h3>
          <p>
            {label(row.relationship)} · {label(row.status)}
          </p>
        </div>
        <span className="invitation-direction">
          {row.direction === "incoming" ? "Invited you" : "You invited"}
        </span>
      </div>
      <p className="small-text">
        {row.ready_for_application
          ? "Consented, with current identity and contact checks."
          : row.status === "accepted"
            ? "Accepted; checks need to be current before an application can be linked."
            : `Invitation ${row.status}${row.status === "pending" ? ` · expires ${date(row.expires_at)}` : ""}.`}
      </p>
      {row.direction === "outgoing" && (
        <dl className="invitation-contacts">
          <div>
            <dt>Email</dt>
            <dd>{row.email}</dd>
          </div>
          {row.mobile_number && (
            <div>
              <dt>Mobile</dt>
              <dd>{row.mobile_number}</dd>
            </div>
          )}
          {row.facebook_url && (
            <div>
              <dt>Facebook</dt>
              <dd>
                <a
                  href={row.facebook_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View shared profile <Link2 size={13} aria-hidden="true" />
                </a>
              </dd>
            </div>
          )}
        </dl>
      )}
      {link && (
        <div className="invitation-link">
          <Label htmlFor={`link-${row.id}`}>Private invitation link</Label>
          <div>
            <Input id={`link-${row.id}`} readOnly value={link} />
            <Button
              type="button"
              variant="outline"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(link);
                  setCopied(true);
                  setCopyError(false);
                } catch {
                  setCopyError(true);
                }
              }}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? "Copied" : "Copy link"}
            </Button>
          </div>
          <small role="status">
            {copyError
              ? "Select and copy the link above."
              : "Share this link yourself. No message was sent."}
          </small>
        </div>
      )}
      <div className="invitation-actions">
        {row.direction === "incoming" && row.status === "pending" && (
          <Button
            type="button"
            variant="outline"
            onClick={() => setReview(!review)}
            aria-expanded={review}
          >
            Review invitation
          </Button>
        )}
        {["pending", "accepted"].includes(row.status) && (
          <ApiForm
            submitLabel={
              row.direction === "incoming"
                ? "Revoke my consent"
                : row.status === "pending"
                  ? "Cancel invitation"
                  : "Remove connection"
            }
            successMessage="Invitation updated; shared mobile and Facebook details were cleared."
            onSubmit={() =>
              post(`/connections/co-borrowers/${row.id}/action`, {
                decision: "revoke",
                expected_version: row.version,
              })
            }
          >
            {null}
          </ApiForm>
        )}
      </div>
      {review && <InvitationReview invitation={row} />}
    </article>
  );
}

export function CoBorrowersPage() {
  const query = useQuery({
    queryKey: ["co-borrower-invitations"],
    queryFn: () =>
      apiRequest<InvitationCollection>("/connections/co-borrowers"),
  });
  return (
    <>
      <PageHeading
        title="Your co-borrower invitations."
        description="Invite someone privately. They verify their own details and choose whether to consent."
      />
      <ProfileNavigation />
      <div className="connections-layout">
        <section className="surface">
          <h2>Your private connections</h2>
          {query.isPending ? (
            <Loading text="Loading invitations…" />
          ) : query.error ? (
            <ErrorNotice
              error={query.error}
              retry={() => void query.refetch()}
            />
          ) : query.data.invitations.length ? (
            query.data.invitations.map((row) => (
              <InvitationRow row={row} key={row.id} />
            ))
          ) : (
            <Empty title="An invitation starts with a conversation.">
              Ask the person first, then create a private invitation below.
              Their contact details stay out of the community feed.
            </Empty>
          )}
        </section>
        <aside className="contact-evidence">
          <UserPlus size={24} aria-hidden="true" />
          <h2>They choose to participate.</h2>
          <p>
            Accepted invitations can be linked to a private application after
            current identity and contact checks. The lender sees their name and
            consent status.
          </p>
          <p>
            This does not create joint repayment liability or give the invited
            person access to your loans or documents.
          </p>
          <ActionLink to="/profile/contacts" variant="outline">
            Check my contacts
          </ActionLink>
        </aside>
      </div>
      <section className="surface invitation-create">
        <h2>Invite a proposed co-borrower</h2>
        <Notice>
          Use fictional details in this test environment. Enter someone’s
          details only after they agree to receive this invitation. No email,
          SMS or Facebook message is sent.
        </Notice>
        <ApiForm
          submitLabel="Create private invitation"
          successMessage="Invitation created. Copy the private link above and share it with the person."
          onSubmit={(data) =>
            post("/connections/co-borrowers", {
              display_name: String(data.get("display_name") || "").trim(),
              email: String(data.get("email") || "").trim(),
              mobile_number: String(data.get("mobile_number") || "").trim(),
              facebook_url: String(data.get("facebook_url") || "").trim(),
              relationship: String(data.get("relationship") || "other"),
              permission_confirmed: data.get("permission_confirmed") === "on",
              operation_id: String(data.get("operation_id")),
            })
          }
        >
          <div className="form-grid">
            <Field name="display_name" label="Their name" required />
            <Field
              name="email"
              label="Their email"
              type="email"
              required
              help="They must sign in with this email to review the invitation."
            />
            <Field
              name="mobile_number"
              label="Their Philippine mobile (optional)"
              type="tel"
              placeholder="0917 000 0000"
            />
            <Field
              name="facebook_url"
              label="Their Facebook profile (optional)"
              type="url"
              placeholder="https://facebook.com/profile-name"
            />
            <SelectField
              name="relationship"
              label="Your relationship"
              options={[
                { value: "friend", label: "Friend" },
                { value: "family", label: "Family" },
                { value: "colleague", label: "Colleague" },
                { value: "other", label: "Other" },
              ]}
            />
          </div>
          <CheckField name="permission_confirmed" required>
            This person agreed to receive a private invitation and permitted me
            to enter these contact details.
          </CheckField>
        </ApiForm>
      </section>
      <p className="small-text">
        <Link to="/help#privacy">Read the privacy boundaries</Link>. Invitations
        are not debt collection contacts.
      </p>
    </>
  );
}
