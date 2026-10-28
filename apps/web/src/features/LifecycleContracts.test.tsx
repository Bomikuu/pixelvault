import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import { ApplyPage } from "./ExplorePages";
import { AgreementPage } from "./WorkspacePages";
import { AmendmentDetail } from "./AdditionalPages";
import { renderApp, jsonResponse, offer } from "../test/helpers";
afterEach(() => vi.unstubAllGlobals());
it("submits structured private applicant context in server-supported fields", async () => {
  const fetch = vi
    .fn()
    .mockImplementation((url: string, init?: RequestInit) =>
      Promise.resolve(
        jsonResponse(init?.method === "POST" ? { id: "app-1" } : offer),
      ),
    );
  vi.stubGlobal("fetch", fetch);
  renderApp(<ApplyPage />, { route: "/applications/new?offer=offer-1" });
  await screen.findByLabelText(/Requested principal/);
  await userEvent.type(screen.getByLabelText(/Requested principal/), "2000");
  await userEvent.type(
    screen.getByLabelText(/What will this help/),
    "Equipment for my freelance work",
  );
  await userEvent.type(
    screen.getByLabelText(/Repayment plan and relevant context/),
    "My monthly income covers the proposed schedule.",
  );
  await userEvent.click(screen.getByRole("checkbox"));
  await userEvent.click(
    screen.getByRole("button", { name: "Send private application" }),
  );
  await waitFor(() =>
    expect(fetch.mock.calls.some(([, init]) => init?.method === "POST")).toBe(
      true,
    ),
  );
  const [, request] = fetch.mock.calls.find(
    ([, init]) => init?.method === "POST",
  )!;
  const body = JSON.parse(request.body as string);
  expect(body.principal).toBe(200000);
  expect(body.summary).toEqual({
    employment_type: "employed",
    income_band: "under_15000",
    repayment_experience: "My monthly income covers the proposed schedule.",
  });
  expect(body).not.toHaveProperty("annual_rate_bps");
  expect(body).not.toHaveProperty("routing_id");
});
it("accepts the exact agreement hash without claiming funding after one signature", async () => {
  const agreement = {
    id: "agreement-1",
    state: "awaiting_acceptance",
    hash: "exact-document-hash",
    terms: offer.terms,
    disclosure: offer.disclosure,
    lender: offer.lender,
    borrower: { id: "borrower", display_name: "Maya Test" },
    acceptances: [],
    test_mode: true,
  };
  const fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) =>
    Promise.resolve(
      jsonResponse(
        init?.method === "POST"
          ? {
              agreement_id: "agreement-1",
              state: "awaiting_acceptance",
              loan_id: null,
            }
          : agreement,
      ),
    ),
  );
  vi.stubGlobal("fetch", fetch);
  renderApp(
    <Routes>
      <Route path="/agreements/:id" element={<AgreementPage />} />
    </Routes>,
    { route: "/agreements/agreement-1" },
  );
  await screen.findByText("Version hash: exact-document-hash");
  for (const checkbox of screen.getAllByRole("checkbox"))
    await userEvent.click(checkbox);
  await userEvent.click(
    screen.getByRole("button", { name: "Accept test agreement" }),
  );
  expect(
    await screen.findByText(
      "Your acceptance was recorded. Funding waits for all required acceptances.",
    ),
  ).toBeInTheDocument();
  const [, request] = fetch.mock.calls.find(
    ([, init]) => init?.method === "POST",
  )!;
  expect(JSON.parse(request.body as string).expected_hash).toBe(
    "exact-document-hash",
  );
  expect(
    screen.queryByRole("link", { name: "Open shared loan" }),
  ).not.toBeInTheDocument();
});
it("shows preserved accrued interest and proposal hash before amendment acceptance", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      jsonResponse({
        amendments: [
          {
            id: "proposal-1",
            loan_id: "loan-1",
            status: "awaiting_acceptance",
            proposal_hash: "new-hash",
            original_agreement_hash: "old-hash",
            acceptance_count: 1,
            reason: "Temporary reduction in income",
            disclosures: {
              principal: 200000,
              preserved_accrued_interest: 1500,
              total_interest: 2000,
              total_remaining_obligation: 203500,
              schedule: offer.disclosure.schedule,
            },
          },
        ],
      }),
    ),
  );
  renderApp(
    <Routes>
      <Route path="/cases/amendments/:id" element={<AmendmentDetail />} />
    </Routes>,
    { route: "/cases/amendments/proposal-1" },
  );
  expect(
    await screen.findByText("Preserved accrued interest"),
  ).toBeInTheDocument();
  expect(screen.getByText("₱15.00")).toBeInTheDocument();
  expect(screen.getByText("₱2,035.00")).toBeInTheDocument();
  expect(screen.getByText("Proposal hash: new-hash")).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Accept test amendment" }),
  ).toBeInTheDocument();
});
