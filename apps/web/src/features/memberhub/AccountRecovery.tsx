import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, MailCheck, ShieldCheck } from "lucide-react";
import { BrandMark, Button } from "@pixelvault/ui";
import {
  ApiForm,
  ContextIllustration,
  ErrorNotice,
  Field,
  Loading,
  Notice,
} from "../../components";
import { apiRequest, post } from "../../app/api";
import { useSession } from "../../app/session";
import { legacyThemeClasses } from "../../app/ThemeToggle";
import { hubPanel } from "./shared";
export function RecoveryEmailSettings() {
  const { session } = useSession();
  const query = useQuery({
    queryKey: ["recovery-email", session?.member?.id],
    queryFn: () =>
      apiRequest<{
        verified: boolean;
        email: string;
        delivery_available: boolean;
        delivery_mode: string;
      }>("/auth/recovery-email"),
  });
  return (
    <section className={`${hubPanel} mt-5 space-y-4`}>
      <h2 className="flex items-center gap-2 text-base font-extrabold">
        <ShieldCheck className="size-5 text-primary" />
        Secure account recovery
      </h2>
      {query.isPending ? (
        <Loading />
      ) : query.error ? (
        <ErrorNotice error={query.error} retry={() => void query.refetch()} />
      ) : (
        <>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {query.data?.verified
              ? "Your current email has been verified for password recovery."
              : "Verify that you own your current email before using it to recover your account. Contact-review evidence does not prove email ownership."}
          </p>
          {!query.data?.verified && (
            <ApiForm
              submitLabel="Send email verification"
              onSubmit={() => post("/auth/recovery-email", {})}
              successMessage="Verification email prepared. Open its link to confirm ownership."
            >
              <p className="text-sm">{query.data?.email}</p>
            </ApiForm>
          )}
          {query.data?.delivery_mode === "local_capture" && (
            <Notice>
              Test email is captured locally on the development server. It is
              not delivered to an external inbox.
            </Notice>
          )}
          {!query.data?.delivery_available && (
            <Notice tone="warning">
              Email delivery is not configured. Recovery cannot deliver links
              until the operator connects it.
            </Notice>
          )}
        </>
      )}
    </section>
  );
}
export function AccountRecovery({
  mode = "request",
}: {
  mode?: "request" | "reset" | "verify";
}) {
  const { id } = useParams();
  const [token] = useState(
    () => new URLSearchParams(location.hash.slice(1)).get("token") || "",
  );
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (location.hash)
      history.replaceState(
        history.state,
        "",
        location.pathname + location.search,
      );
  }, []);
  const title =
    mode === "verify"
      ? "Confirm your recovery email."
      : mode === "reset"
        ? "Choose a new password."
        : "A private way back in.";
  return (
    <div
      className={`min-h-dvh bg-background p-4 text-foreground sm:p-8 ${legacyThemeClasses}`}
    >
      <div className="mx-auto max-w-5xl">
        <Link to="/explore" className="inline-flex min-h-11 items-center">
          <BrandMark className="dark:[&_.brand-word]:text-foreground!" />
        </Link>
        <div className="mt-6 grid items-center gap-8 md:mt-12 md:grid-cols-2">
          <ContextIllustration
            scene="welcome-community"
            eager
            className="mx-auto hidden! max-w-md md:block!"
          />
          <section className={`${hubPanel} space-y-5 p-5! sm:p-8!`}>
            <Link
              to="/sign-in"
              className="inline-flex min-h-11 items-center gap-2 text-sm text-primary!"
            >
              <ArrowLeft size={16} />
              Back to sign in
            </Link>
            <h1 className="text-2xl! font-extrabold! leading-tight!">
              {title}
            </h1>
            {done ? (
              <>
                <Notice tone="success">
                  {mode === "verify"
                    ? "Your current email is verified for account recovery."
                    : mode === "reset"
                      ? "Your password has changed. Sign in again on your devices."
                      : "If this address has a verified recovery email, a reset link will be delivered. Check your inbox or contact private support."}
                </Notice>
                <Button asChild>
                  <Link
                    to={mode === "verify" ? "/profile/contacts" : "/sign-in"}
                  >
                    {mode === "verify"
                      ? "Private contacts"
                      : "Return to sign in"}
                  </Link>
                </Button>
              </>
            ) : mode !== "request" && !token ? (
              <Notice tone="warning">
                This page needs the complete link from your email. Reopen that
                link, or request a fresh one. Links expire after 30 minutes.
              </Notice>
            ) : (
              <ApiForm
                submitLabel={
                  mode === "verify"
                    ? "Verify my email"
                    : mode === "reset"
                      ? "Change my password"
                      : "Send recovery link"
                }
                onSuccess={() => setDone(true)}
                onSubmit={(data) =>
                  mode === "request"
                    ? post("/auth/recovery", {
                        email: String(data.get("email") || "").trim(),
                      })
                    : mode === "verify"
                      ? post(`/auth/recovery-email/${id}/verify`, { token })
                      : post(`/auth/recovery/${id}`, {
                          token,
                          password: String(data.get("password") || ""),
                          password_confirm: String(
                            data.get("password_confirm") || "",
                          ),
                        })
                }
              >
                {mode === "request" ? (
                  <>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      Enter your account email. Only a previously verified
                      recovery address can receive a reset link.
                    </p>
                    <Field
                      name="email"
                      label="Email address"
                      type="email"
                      autoComplete="email"
                      required
                    />
                  </>
                ) : mode === "reset" ? (
                  <>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      Use a unique password with at least 10 characters.
                      Changing it signs out existing sessions.
                    </p>
                    <Field
                      name="password"
                      label="New password"
                      type="password"
                      autoComplete="new-password"
                      required
                    />
                    <Field
                      name="password_confirm"
                      label="Confirm new password"
                      type="password"
                      autoComplete="new-password"
                      required
                    />
                  </>
                ) : (
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Confirm that you requested this link and control this email
                    address. This verifies account recovery only.
                  </p>
                )}
              </ApiForm>
            )}
            <p className="flex items-start gap-2 border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">
              <MailCheck className="mt-0.5 size-4 shrink-0" />
              Recovery never accepts an agreement, changes a loan or moves
              money.{" "}
              <Link to="/help" className="text-primary!">
                Private support
              </Link>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
