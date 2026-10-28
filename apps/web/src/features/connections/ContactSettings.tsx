import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Mail, Phone, ShieldCheck } from "lucide-react";
import { apiRequest } from "../../app/api";
import { useSession } from "../../app/session";
import {
  ApiForm,
  ErrorNotice,
  Field,
  Loading,
  Notice,
  PageHeading,
} from "../../components";
import { ProfileNavigation } from "../profile/ProfileNavigation";
import type { ContactDetails } from "./types";
import "./connections.css";

export function ContactSettings() {
  const { refresh } = useSession();
  const query = useQuery({
    queryKey: ["private-contacts"],
    queryFn: () => apiRequest<ContactDetails>("/auth/contacts"),
  });
  return (
    <>
      <PageHeading
        title="Your private contact details."
        description="Keep your account email and Philippine mobile number up to date."
      />
      <ProfileNavigation />
      {query.isPending ? (
        <Loading text="Loading your private contacts…" />
      ) : query.error ? (
        <ErrorNotice error={query.error} retry={() => void query.refetch()} />
      ) : (
        <div className="form-layout contact-workspace">
          <section className="surface">
            <h2>
              <Mail size={19} aria-hidden="true" /> Register your email and
              number
            </h2>
            <ApiForm
              submitLabel="Save private contacts"
              successMessage="Contact details saved. New details need fresh contact evidence."
              onSuccess={() => void refresh()}
              onSubmit={(data) =>
                apiRequest("/auth/contacts", {
                  method: "PATCH",
                  body: JSON.stringify({
                    email: String(data.get("email") || "").trim(),
                    mobile_number: String(
                      data.get("mobile_number") || "",
                    ).trim(),
                  }),
                })
              }
            >
              <Field
                name="email"
                label="Email address"
                type="email"
                required
                autoComplete="email"
                defaultValue={query.data.email}
                help="Used to sign in. Never shown on your public profile."
              />
              <Field
                name="mobile_number"
                label="Philippine mobile number"
                type="tel"
                required
                autoComplete="tel"
                defaultValue={query.data.mobile_number}
                placeholder="0917 000 0000"
                help="Use 09… or +639… format. This number stays private."
              />
              <Notice>
                Changing either detail requires a fresh contact check. Your
                identity and contact evidence must be current before accepting a
                co-borrower invitation.
              </Notice>
            </ApiForm>
          </section>
          <aside className="contact-evidence">
            <ShieldCheck size={24} aria-hidden="true" />
            <h2>Evidence has a separate status.</h2>
            <p>
              {query.data.verification.current
                ? "Current contact evidence is approved."
                : "Current contact evidence needs review."}
            </p>
            <p>
              <Phone size={16} aria-hidden="true" /> {query.data.notice}
            </p>
            {!query.data.delivery_available && (
              <p className="small-text">
                Email and SMS delivery are not connected. Saving a number or
                email does not verify ownership.
              </p>
            )}
            <Link to="/verification">Open verification center</Link>
          </aside>
        </div>
      )}
    </>
  );
}
