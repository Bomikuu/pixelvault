import { isRouteErrorResponse, Link, useRouteError } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { BrandMark } from "@pixelvault/ui";
import { ActionLink, ContextIllustration } from "../components";

function RecoveryContent({ missing = false }: { missing?: boolean }) {
  return (
    <section className="recovery-page" aria-labelledby="recovery-heading">
      <ContextIllustration scene="finding-your-way" eager />
      <div className="recovery-copy">
        <h1 id="recovery-heading">
          {missing ? "This path doesn’t lead to a page." : "A little detour."}
        </h1>
        <p role={missing ? undefined : "alert"}>
          {missing
            ? "The link may have changed, or the address may be incomplete. There’s a way back to your community."
            : "We couldn’t display this page. Try opening it again, or continue from your dashboard."}
        </p>
        {!missing && (
          <p className="small-text recovery-payment-note">
            If you were making a payment, check your payment records before
            trying again. This screen does not confirm whether it succeeded.
          </p>
        )}
        <div className="recovery-actions">
          <ActionLink to="/explore">
            Back to the community <ArrowRight size={16} />
          </ActionLink>
          <ActionLink to="/dashboard" variant="outline">
            Open my dashboard
          </ActionLink>
        </div>
        <Link className="text-link" to="/help">
          Find help and private support <ArrowRight size={15} />
        </Link>
      </div>
    </section>
  );
}

export function NotFoundPage() {
  return <RecoveryContent missing />;
}

export function ErrorPage() {
  const error = useRouteError();
  const missing = isRouteErrorResponse(error) && error.status === 404;
  // Route errors may include internal messages or response bodies. Keep them
  // out of the recovery screen, including when the request was financial.
  return (
    <main className="main-content recovery-boundary">
      <Link to="/explore" aria-label="PixelVault home">
        <BrandMark />
      </Link>
      <RecoveryContent missing={missing} />
    </main>
  );
}
