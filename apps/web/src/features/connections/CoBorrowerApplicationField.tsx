import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { apiRequest } from "../../app/api";
import { ErrorNotice, SelectField } from "../../components";
import type { InvitationCollection } from "./types";

export function CoBorrowerApplicationField() {
  const query = useQuery({
    queryKey: ["co-borrower-invitations"],
    queryFn: () =>
      apiRequest<InvitationCollection>("/connections/co-borrowers"),
  });
  const ready = (query.data?.invitations || []).filter(
    (row) => row.direction === "outgoing" && row.ready_for_application,
  );
  return (
    <section
      className="co-borrower-application"
      aria-label="Optional co-borrower invitation"
    >
      {query.error && (
        <ErrorNotice error={query.error} retry={() => void query.refetch()} />
      )}
      <SelectField
        name="co_borrower_invitation_id"
        label="Proposed co-borrower (optional)"
        defaultValue="none"
        options={[
          {
            value: "none",
            label: query.isPending
              ? "Loading invitations…"
              : "Continue without an invitation",
          },
          ...ready.map((row) => ({
            value: row.id,
            label: row.member?.display_name || row.display_name,
          })),
        ]}
      />
      <p className="small-text">
        Only an accepted invitation with current checks can be linked. This
        shares their name and consent status with the lender; it creates no
        repayment liability or loan access.
      </p>
      <Link to="/profile/co-borrowers">
        Manage private co-borrower invitations
      </Link>
    </section>
  );
}
