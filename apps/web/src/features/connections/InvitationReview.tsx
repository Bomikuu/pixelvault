import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@pixelvault/ui";
import { apiRequest, post } from "../../app/api";
import {
  ApiForm,
  CheckField,
  ErrorNotice,
  Field,
  Loading,
  MemberAvatar,
  Notice,
  PageHeading,
} from "../../components";
import { ProfileNavigation } from "../profile/ProfileNavigation";
import type { CoBorrowerInvitation } from "./types";
import "./connections.css";

export function InvitationReview({
  invitation,
}: {
  invitation: CoBorrowerInvitation;
}) {
  const person = invitation.inviter;
  return (
    <section
      className="invitation-review"
      aria-label="Review co-borrower invitation"
    >
      <div className="invitation-person">
        <MemberAvatar
          name={person.display_name}
          avatarKey={person.avatar_key}
          photoUrl={person.photo_url}
          reputation={person.reputation}
          size={48}
        />
        <div>
          <h2>{person.display_name} invited you.</h2>
          <p>For {invitation.email}</p>
        </div>
      </div>
      <Notice>{invitation.notice}</Notice>
      {invitation.status === "pending" ? (
        <>
          <p>
            Accept using your own registered mobile number and current
            identity/contact checks. Your optional Facebook URL is shared only
            if you add it here.
          </p>
          <Link to="/profile/contacts">Update my private contacts</Link>
          {" · "}
          <Link to="/verification">Review my verification</Link>
          <ApiForm
            submitLabel="Verify and accept invitation"
            successMessage="Invitation accepted. Your contact-sharing consent is recorded."
            onSubmit={(data) =>
              post(`/connections/co-borrowers/${invitation.id}/action`, {
                decision: "accept",
                expected_version: invitation.version,
                consent: data.get("co_borrower_consent") === "on",
                facebook_url: String(data.get("facebook_url") || "").trim(),
              })
            }
          >
            <Field
              name="facebook_url"
              label="My Facebook profile URL (optional)"
              type="url"
              placeholder="https://facebook.com/profile-name"
              help="A profile link only. PixelVault does not open or import Facebook data."
            />
            <CheckField name="co_borrower_consent" required>
              I agree to share my registered email, mobile and any Facebook link
              above with {person.display_name}. I understand that linking an
              application shows my name and consent status only and creates no
              repayment obligation.
            </CheckField>
          </ApiForm>
          <ApiForm
            submitLabel="Decline invitation"
            successMessage="Invitation declined."
            onSubmit={() =>
              post(`/connections/co-borrowers/${invitation.id}/action`, {
                decision: "decline",
                expected_version: invitation.version,
              })
            }
          >
            <Input type="hidden" name="decision" value="decline" />
          </ApiForm>
        </>
      ) : (
        <p role="status">
          This invitation is {invitation.status}.{" "}
          {invitation.status === "accepted"
            ? "You can revoke your contact-sharing consent from Co-borrowers."
            : "No action is needed."}
        </p>
      )}
    </section>
  );
}

export function InvitationClaimPage() {
  const { token } = useParams();
  const query = useQuery({
    queryKey: ["co-borrower-claim", token],
    queryFn: () =>
      apiRequest<CoBorrowerInvitation>(
        `/connections/co-borrowers/invite/${encodeURIComponent(token || "")}`,
      ),
    retry: false,
  });
  return (
    <>
      <PageHeading
        title="A private co-borrower invitation."
        description="Review who invited you and choose what you consent to share."
      />
      <ProfileNavigation />
      {query.isPending ? (
        <Loading />
      ) : query.error ? (
        <ErrorNotice error={query.error} retry={() => void query.refetch()} />
      ) : (
        <InvitationReview invitation={query.data} />
      )}
      <Link to="/profile/co-borrowers">Back to my invitations</Link>
    </>
  );
}
