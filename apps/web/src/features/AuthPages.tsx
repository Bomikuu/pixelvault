import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { BrandMark, Button } from "@pixelvault/ui";
import {
  ApiForm,
  CheckField,
  ContextIllustration,
  Field,
  Notice,
} from "../components";
import { post } from "../app/api";
import { useSession } from "../app/session";
import { text } from "../lib/format";
export function AuthPage({ register = false }: { register?: boolean }) {
  const { refresh, session } = useSession(),
    navigate = useNavigate();
  const [demo, setDemo] = useState("");
  return (
    <div className="auth-page">
      <div className="auth-story">
        <Link to="/explore">
          <BrandMark />
        </Link>
        <div className="auth-story-copy">
          <h1>
            A community.
            <br />A clear agreement.
            <br />
            <em>A better tomorrow.</em>
          </h1>
          <p>
            Individual lending built around understandable terms, private
            conversations and a shared record.
          </p>
        </div>
        <ContextIllustration scene="welcome-community" eager />
        <span>
          <ShieldCheck size={18} />
          Your information belongs in your hands.
        </span>
      </div>
      <div className="auth-content">
        <Link className="back-link" to="/explore">
          <ArrowLeft size={16} />
          Back to community
        </Link>
        <div className="auth-form">
          <h1>
            {register ? "Your next chapter starts here." : "Welcome back."}
          </h1>
          <p>
            {register
              ? "Create one account to borrow, lend and participate."
              : "Sign in to your private PixelVault workspace."}
          </p>
          <Notice>
            Test environment. Use synthetic details only. No live lending or
            money movement.
          </Notice>
          {!register && session?.environment === "test" && (
            <div className="demo-accounts">
              <strong>Explore with a synthetic account</strong>
              <div>
                {[
                  ["maya", "Borrower"],
                  ["elias", "Lender"],
                  ["admin", "Staff"],
                ].map(([key, name]) => (
                  <Button
                    key={key}
                    type="button"
                    variant={demo === key ? "secondary" : "outline"}
                    onClick={() => setDemo(key)}
                  >
                    {name}
                  </Button>
                ))}
              </div>
              <small>Fills test credentials. Choose Sign in to continue.</small>
            </div>
          )}
          <ApiForm
            onSubmit={async (data) => {
              await post(
                register ? "/auth/register" : "/auth/sign-in",
                register
                  ? {
                      email: text(data, "email"),
                      password: String(data.get("password") || ""),
                      display_name: text(data, "display_name"),
                      accepted_policy_version: data.get("policy")
                        ? "demo-v1"
                        : "",
                    }
                  : {
                      email: text(data, "email"),
                      password: String(data.get("password") || ""),
                    },
              );
              await refresh();
              navigate("/dashboard");
            }}
            submitLabel={register ? "Create my account" : "Sign in"}
          >
            {register && (
              <Field
                name="display_name"
                label="Display name"
                required
                autoComplete="name"
              />
            )}
            <Field
              key={`email-${demo}`}
              defaultValue={demo ? `${demo}@pixelvault.test` : undefined}
              name="email"
              label="Email address"
              type="email"
              required
              autoComplete="email"
            />
            <Field
              key={`password-${demo}`}
              defaultValue={demo ? "PixelVaultDemo!2026" : undefined}
              name="password"
              label="Password"
              type="password"
              required
              autoComplete={register ? "new-password" : "current-password"}
              help={
                register
                  ? "Use at least 10 characters and a unique password."
                  : undefined
              }
            />
            {register && (
              <CheckField name="policy" required>
                I accept the{" "}
                <Link to="/help#terms">test participation terms</Link> and{" "}
                <Link to="/help#privacy">privacy notice</Link>.
              </CheckField>
            )}
          </ApiForm>
          <p className="auth-switch">
            {register ? "Already have an account?" : "New to the community?"}{" "}
            <Link to={register ? "/sign-in" : "/register"}>
              {register ? "Sign in" : "Create an account"}
            </Link>
          </p>
          <Link className="auth-guide-link" to="/how-it-works">
            See how individual lending works
          </Link>
        </div>
      </div>
    </div>
  );
}
