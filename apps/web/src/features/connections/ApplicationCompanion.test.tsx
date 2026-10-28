import { screen, within } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import { ApplicationDetail } from "../WorkspacePages";
import { jsonResponse, renderApp, session } from "../../test/helpers";

vi.mock("../../app/session", () => ({ useSession: () => ({ session }) }));
afterEach(() => vi.unstubAllGlobals());
const application = {
  id: "application-1",
  principal: 200000,
  purpose: "A private work project",
  status: "submitted",
  borrower: {
    id: session.member.id,
    display_name: session.member.display_name,
  },
  lender: { id: "lender", display_name: "Elias" },
  summary: "A realistic repayment plan.",
  created_at: "2026-10-28T00:00:00Z",
};
function detail() {
  return (
    <Routes>
      <Route path="/applications/:id" element={<ApplicationDetail />} />
    </Routes>
  );
}

it("shows only the provided companion identity and consent status with an explicit non-liability boundary", async () => {
  const photo = "/api/v1/community/photos/a4240116-a682-4123-aa56-e95870b19a17";
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        jsonResponse({
          ...application,
          co_borrower: {
            member: {
              handle: "nico",
              display_name: "Nico",
              avatar_key: "maker",
              photo_url: photo,
            },
            status: "consented",
            joint_liability: false,
          },
        }),
      ),
  );
  renderApp(detail(), { route: "/applications/application-1" });
  const companion = await screen.findByRole("region", {
    name: "Proposed co-borrower",
  });
  expect(
    within(companion).getByAltText("Nico’s profile photo"),
  ).toHaveAttribute("src", photo);
  expect(companion).toHaveTextContent(
    "Consent and required checks are current.",
  );
  expect(companion).toHaveTextContent(
    "creates no repayment liability or access to loans and documents",
  );
  expect(companion).not.toHaveTextContent(/mobile|facebook|email/i);
});

it("does not invent a companion when the application has no linked invitation", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(jsonResponse({ ...application, co_borrower: null })),
  );
  renderApp(detail(), { route: "/applications/application-1" });
  await screen.findByRole("heading", { name: "A private request." });
  expect(
    screen.queryByRole("region", { name: "Proposed co-borrower" }),
  ).not.toBeInTheDocument();
});
