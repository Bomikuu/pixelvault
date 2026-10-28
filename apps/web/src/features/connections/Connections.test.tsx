import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { ContactSettings } from "./ContactSettings";
import { CoBorrowerApplicationField } from "./CoBorrowerApplicationField";
import { CoBorrowersPage } from "./CoBorrowersPage";
import { InvitationReview } from "./InvitationReview";
import { jsonResponse, renderApp } from "../../test/helpers";
import type { CoBorrowerInvitation } from "./types";

afterEach(() => vi.unstubAllGlobals());
const row: CoBorrowerInvitation = {
  id: "invite-1",
  display_name: "Lina Test",
  email: "lina@pixelvault.test",
  mobile_number: "+639170000001",
  facebook_url: "",
  relationship: "friend",
  status: "pending",
  version: 1,
  direction: "outgoing",
  inviter: { id: "maya", display_name: "Maya Test", avatar_key: "sprout" },
  member: null,
  ready_for_application: false,
  consented_at: null,
  expires_at: "2026-11-04T12:00:00Z",
  notice: "Share contacts with the inviter only; no repayment liability.",
  invitation_path: "/co-borrowers/invite/signed-token",
};

it("updates private registered contacts without sending public profile or verification claims", async () => {
  const contacts = {
    email: "maya@pixelvault.test",
    mobile_number: "+639170000000",
    email_verified: false,
    mobile_verified: false,
    verification: {
      status: "needs_information",
      current: false,
      provenance: "self_reported",
      expires_at: null,
    },
    delivery_available: false,
    notice: "Contact evidence is separate from saved details.",
  };
  const fetch = vi
    .fn()
    .mockImplementation((_: string, init?: RequestInit) =>
      Promise.resolve(jsonResponse(init?.method === "PATCH" ? {} : contacts)),
    );
  vi.stubGlobal("fetch", fetch);
  renderApp(<ContactSettings />, { route: "/profile/contacts" });
  const mobile = await screen.findByRole("textbox", {
    name: "Philippine mobile number",
  });
  await userEvent.clear(mobile);
  await userEvent.type(mobile, "0917 000 0002");
  await userEvent.click(
    screen.getByRole("button", { name: "Save private contacts" }),
  );
  expect(
    await screen.findByText(
      "Contact details saved. New details need fresh contact evidence.",
    ),
  ).toBeInTheDocument();
  const update = fetch.mock.calls.find(([, init]) => init?.method === "PATCH");
  expect(update?.[0]).toBe("/api/v1/auth/contacts");
  expect(JSON.parse(update![1].body)).toEqual({
    email: contacts.email,
    mobile_number: "0917 000 0002",
  });
  expect(
    screen.getByText(/Saving a number or email does not verify ownership/),
  ).toBeInTheDocument();
});

it("offers only accepted, current outgoing invitations to link to an application", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      jsonResponse({
        invitations: [
          row,
          {
            ...row,
            id: "accepted",
            status: "accepted",
            display_name: "Accepted person",
            ready_for_application: true,
          },
          {
            ...row,
            id: "incoming",
            direction: "incoming",
            display_name: "Someone invited me",
            ready_for_application: true,
          },
          {
            ...row,
            id: "stale",
            status: "accepted",
            display_name: "Needs fresh check",
            ready_for_application: false,
          },
        ],
      }),
    ),
  );
  renderApp(<CoBorrowerApplicationField />);
  const select = screen.getByRole("combobox", {
    name: "Proposed co-borrower (optional)",
  });
  await waitFor(() =>
    expect(screen.queryByText("Loading invitations…")).not.toBeInTheDocument(),
  );
  select.focus();
  await userEvent.keyboard("{ArrowDown}");
  expect(
    screen.getByRole("option", { name: "Accepted person" }),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("option", { name: "Lina Test" }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("option", { name: "Someone invited me" }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("option", { name: "Needs fresh check" }),
  ).not.toBeInTheDocument();
});

it("creates an invitation only with explicit permission and displays a private link without sending a message", async () => {
  let created = false;
  const fetch = vi.fn().mockImplementation((_: string, init?: RequestInit) => {
    if (init?.method === "POST") {
      created = true;
      return Promise.resolve(jsonResponse(row, 201));
    }
    return Promise.resolve(jsonResponse({ invitations: created ? [row] : [] }));
  });
  vi.stubGlobal("fetch", fetch);
  renderApp(<CoBorrowersPage />, { route: "/profile/co-borrowers" });
  await screen.findByText("An invitation starts with a conversation.");
  await userEvent.type(
    screen.getByRole("textbox", { name: "Their name" }),
    "Lina Test",
  );
  await userEvent.type(
    screen.getByRole("textbox", { name: "Their email" }),
    row.email,
  );
  await userEvent.click(
    screen.getByRole("button", { name: "Create private invitation" }),
  );
  expect(fetch.mock.calls.some(([, init]) => init?.method === "POST")).toBe(
    false,
  );
  await userEvent.click(
    screen.getByRole("checkbox", { name: /This person agreed to receive/ }),
  );
  await userEvent.click(
    screen.getByRole("button", { name: "Create private invitation" }),
  );
  expect(
    await screen.findByText("Share this link yourself. No message was sent."),
  ).toBeInTheDocument();
  expect(
    (
      screen.getByRole("textbox", {
        name: "Private invitation link",
      }) as HTMLInputElement
    ).value,
  ).toContain("/co-borrowers/invite/signed-token");
  const payload = JSON.parse(
    fetch.mock.calls.find(([, init]) => init?.method === "POST")![1].body,
  );
  expect(payload).toMatchObject({
    email: row.email,
    display_name: "Lina Test",
    permission_confirmed: true,
  });
  expect(payload.operation_id).toMatch(/^[\da-f-]{36}$/i);
});

it("records the recipient's own sharing consent and surfaces a verification failure without success", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValue(
      jsonResponse(
        { message: "Complete current identity and contact checks." },
        409,
      ),
    );
  vi.stubGlobal("fetch", fetch);
  renderApp(
    <InvitationReview invitation={{ ...row, direction: "incoming" }} />,
  );
  await userEvent.type(
    screen.getByRole("textbox", { name: "My Facebook profile URL (optional)" }),
    "https://facebook.com/my.fictional.profile",
  );
  await userEvent.click(
    screen.getByRole("checkbox", { name: /I agree to share my registered/ }),
  );
  await userEvent.click(
    screen.getByRole("button", { name: "Verify and accept invitation" }),
  );
  expect(
    await screen.findByText("Complete current identity and contact checks."),
  ).toBeInTheDocument();
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({
    decision: "accept",
    expected_version: 1,
    consent: true,
    facebook_url: "https://facebook.com/my.fictional.profile",
  });
  expect(
    screen.queryByText(
      "Invitation accepted. Your contact-sharing consent is recorded.",
    ),
  ).not.toBeInTheDocument();
});
