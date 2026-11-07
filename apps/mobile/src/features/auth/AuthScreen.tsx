import { useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { Checkbox, Label } from "@pixelvault/ui";
import {
  Action,
  Button,
  Field,
  Form,
  Illustration,
  Note,
  Page,
} from "../../components/ui";
import { post } from "../../app/api";
import { useSession } from "../../app/session";
export function AuthScreen({ register = false }: { register?: boolean }) {
  const { session, refresh } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [demo, setDemo] = useState("");
  return (
    <Page
      title={register ? "Your next chapter starts here." : "Welcome back."}
      description={
        register
          ? "One account to borrow, lend and build community."
          : "Your people, your plans and a shared record."
      }
      back
    >
      <Illustration scene="welcome-community" className="mx-auto max-w-72" />
      {!register && session?.environment === "test" && (
        <div>
          <p className="mb-2 text-xs font-semibold text-muted-foreground">
            Try an existing synthetic account
          </p>
          <div className="flex gap-2">
            {[
              ["maya", "Borrower"],
              ["elias", "Lender"],
            ].map(([key, name]) => (
              <Button
                key={key}
                type="button"
                variant={demo === key ? "secondary" : "outline"}
                className="flex-1"
                onClick={() => setDemo(key)}
                aria-pressed={demo === key}
              >
                {name}
              </Button>
            ))}
          </div>
        </div>
      )}
      <Form
        submit={register ? "Create my account" : "Sign in"}
        onSubmit={async (data) => {
          await post(
            register ? "/auth/register" : "/auth/sign-in",
            register
              ? {
                  display_name: String(data.get("display_name") || ""),
                  email: String(data.get("email") || ""),
                  password: String(data.get("password") || ""),
                  mobile_number: String(data.get("mobile_number") || ""),
                  accepted_policy_version: data.get("policy") ? "demo-v1" : "",
                }
              : {
                  email: String(data.get("email") || ""),
                  password: String(data.get("password") || ""),
                },
          );
          await refresh();
          const from = location.state?.from;
          navigate(
            typeof from === "string" &&
              from.startsWith("/") &&
              !from.startsWith("//") &&
              !from.startsWith("/sign-in")
              ? from
              : "/",
            { replace: true },
          );
        }}
      >
        {register && (
          <Field
            label="Display name"
            name="display_name"
            autoComplete="name"
            required
          />
        )}
        <Field
          key={`email-${demo}`}
          label="Email address"
          name="email"
          type="email"
          autoComplete="email"
          defaultValue={demo ? `${demo}@pixelvault.test` : undefined}
          required
        />
        <Field
          key={`password-${demo}`}
          label="Password"
          name="password"
          type="password"
          minLength={register ? 10 : undefined}
          autoComplete={register ? "new-password" : "current-password"}
          defaultValue={demo ? "PixelVaultDemo!2026" : undefined}
          required
        />
        {register ? (
          <>
            <Field
              label="Philippine mobile number"
              name="mobile_number"
              type="tel"
              autoComplete="tel"
              placeholder="0917 000 0000"
              required
            />
            <Note>
              Contact details stay private. Complete the separate contact and
              identity checks before lending activity.
            </Note>
            <div className="flex items-start gap-3">
              <Checkbox
                name="policy"
                id="mobile-policy"
                required
                className="mt-1 size-5"
              />
              <Label
                htmlFor="mobile-policy"
                className="min-h-11 text-sm leading-relaxed"
              >
                I accept the test-mode community and privacy policy (demo-v1).
              </Label>
            </div>
          </>
        ) : (
          <Link
            to="/forgot-password"
            className="inline-flex min-h-11 items-center text-sm font-semibold text-primary underline underline-offset-4"
          >
            Forgot your password?
          </Link>
        )}
      </Form>
      <p className="text-center text-sm text-muted-foreground">
        {register ? "Already part of the community?" : "New to PixelVault?"}{" "}
        <Link
          className="font-bold text-primary underline underline-offset-4"
          to={register ? "/sign-in" : "/register"}
        >
          {register ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </Page>
  );
}
function useLinkToken() {
  const token = useRef(
    new URLSearchParams(location.hash.slice(1)).get("token") || "",
  );
  if (location.hash)
    history.replaceState(
      history.state,
      "",
      location.pathname + location.search,
    );
  return token.current;
}
export function RecoveryScreen() {
  const { recoveryId } = useParams();
  const token = useLinkToken();
  return (
    <Page
      title={recoveryId ? "Choose a new password." : "Find your way back."}
      description="Recovery uses your separately verified recovery email."
      back
    >
      <Illustration scene="finding-your-way" className="mx-auto max-w-60" />
      <Form
        submit={recoveryId ? "Reset password" : "Send recovery link"}
        success={
          recoveryId
            ? "Password updated. Sign in with your new password."
            : "If this email can recover an account, a private link will be sent."
        }
        disabled={!!recoveryId && !token}
        onSubmit={(data) =>
          post(
            recoveryId ? `/auth/recovery/${recoveryId}` : "/auth/recovery",
            recoveryId
              ? {
                  token,
                  password: String(data.get("password") || ""),
                  password_confirm: String(data.get("password_confirm") || ""),
                }
              : { email: String(data.get("email") || "") },
          )
        }
      >
        {recoveryId ? (
          <>
            <Field
              label="New password"
              name="password"
              type="password"
              minLength={10}
              autoComplete="new-password"
              required
            />
            <Field
              label="Confirm new password"
              name="password_confirm"
              type="password"
              minLength={10}
              autoComplete="new-password"
              required
            />
            {!token && (
              <Note danger>
                Open the complete recovery link from your email, or request a
                new one.
              </Note>
            )}
          </>
        ) : (
          <Field
            label="Recovery email"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
        )}
      </Form>
      <Action to="/sign-in" variant="outline" className="w-full">
        Back to sign in
      </Action>
    </Page>
  );
}
export function VerifyEmailScreen() {
  const { memberId = "" } = useParams();
  const token = useLinkToken();
  return (
    <Page
      title="Confirm your recovery email."
      description="This verifies email ownership for account recovery. Identity and lending eligibility are separate."
      back
    >
      <Form
        submit="Confirm email ownership"
        disabled={!token}
        success="Recovery email verified."
        onSubmit={() =>
          post(`/auth/recovery-email/${memberId}/verify`, { token })
        }
      >
        <Note>
          {token
            ? "Continue only if you requested this verification."
            : "Open the complete verification link from your email."}
        </Note>
      </Form>
    </Page>
  );
}
