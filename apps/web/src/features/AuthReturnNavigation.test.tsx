import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes, useLocation } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import { AuthPage } from "./AuthPages";
import { RequireMember } from "../app/RequireMember";
import { jsonResponse, renderApp, session } from "../test/helpers";

const auth = vi.hoisted(() => ({ signedIn: false }));
vi.mock("../app/session", () => ({
  useSession: () => ({
    session: { ...session, member: auth.signedIn ? session.member : null },
    loading: false,
    error: null,
    refresh: async () => {
      auth.signedIn = true;
    },
  }),
}));
afterEach(() => {
  vi.unstubAllGlobals();
  auth.signedIn = false;
});
function Destination() {
  const location = useLocation();
  return (
    <output aria-label="Returned destination">
      {location.pathname}
      {location.search}
      {location.hash}
    </output>
  );
}
function Flow() {
  return (
    <Routes>
      <Route path="/sign-in" element={<AuthPage />} />
      <Route path="/register" element={<AuthPage register />} />
      <Route
        path="/applications/new"
        element={
          <RequireMember>
            <Destination />
          </RequireMember>
        }
      />
      <Route
        path="/co-borrowers/invite/:token"
        element={
          <RequireMember>
            <Destination />
          </RequireMember>
        }
      />
      <Route path="/dashboard" element={<Destination />} />
    </Routes>
  );
}

it("returns a signed-in guest to the selected offer amount and anchor", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({})));
  renderApp(<Flow />, {
    route: "/applications/new?offer=offer-1&amount=200000#schedule",
  });
  await userEvent.click(
    await screen.findByRole("button", { name: "Borrower" }),
  );
  await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
  expect(
    await screen.findByLabelText("Returned destination"),
  ).toHaveTextContent("/applications/new?offer=offer-1&amount=200000#schedule");
});

it("keeps the private invitation return target when switching to registration and submits the required mobile", async () => {
  const fetch = vi.fn().mockResolvedValue(jsonResponse({}));
  vi.stubGlobal("fetch", fetch);
  renderApp(<Flow />, {
    route: "/co-borrowers/invite/signed-invitation-token",
  });
  await userEvent.click(
    await screen.findByRole("link", { name: "Create an account" }),
  );
  const mobile = screen.getByRole("textbox", {
    name: "Philippine mobile number",
  });
  expect(mobile).toBeRequired();
  await userEvent.type(
    screen.getByRole("textbox", { name: "Display name" }),
    "New Member",
  );
  await userEvent.type(
    screen.getByRole("textbox", { name: "Email address" }),
    "new@pixelvault.test",
  );
  await userEvent.type(
    screen.getByLabelText(/^Password/),
    "FictionalPassword!2026",
  );
  await userEvent.type(mobile, "09171234567");
  await userEvent.click(screen.getByRole("checkbox"));
  await userEvent.click(
    screen.getByRole("button", { name: "Create my account" }),
  );
  expect(
    await screen.findByLabelText("Returned destination"),
  ).toHaveTextContent("/co-borrowers/invite/signed-invitation-token");
  const registration = fetch.mock.calls.find(([url]) =>
    url.endsWith("/auth/register"),
  );
  await waitFor(() => expect(registration).toBeTruthy());
  expect(JSON.parse(registration![1].body)).toEqual({
    display_name: "New Member",
    email: "new@pixelvault.test",
    password: "FictionalPassword!2026",
    mobile_number: "09171234567",
    accepted_policy_version: "demo-v1",
  });
});
