import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { PaymentForm } from "./WorkspacePages";
import { renderApp, jsonResponse } from "../test/helpers";
import type { Loan } from "@pixelvault/contracts";
const loan = {
  id: "loan-1",
  status: "active",
  principal_balance: 300000,
  accrued_interest: 1000,
  projected_interest: 4000,
  total_due: 301000,
  next_installment_due: 101000,
  next_due_date: "2026-11-28",
  settlement_status: "unknown",
  disbursement_status: "confirmed",
  schedule: [],
  terms: {
    principal: 300000,
    annual_rate_bps: 1200,
    frequency: "monthly",
    installment_count: 3,
    effective_date: "2026-10-28",
  },
  agreement_id: "agreement-1",
  borrower: { id: "one", display_name: "Maya Test" },
  lender: { id: "two", display_name: "Elias Test" },
  test_mode: true,
} satisfies Loan;
afterEach(() => vi.unstubAllGlobals());
it("uses the authoritative preview and sends no client-controlled price for a scheduled payment", async () => {
  const fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) =>
    Promise.resolve(
      jsonResponse(
        init?.method === "POST"
          ? {
              payment_id: "pay-1",
              status: "pending",
              checkout_url: "https://checkout.example.test/session",
            }
          : {
              amount: 101000,
              principal_balance: 300000,
              accrued_interest: 1000,
              payoff_amount: 301000,
              allocation_note: "Apply to due interest before principal.",
            },
      ),
    ),
  );
  vi.stubGlobal("fetch", fetch);
  renderApp(<PaymentForm loan={loan} />);
  expect(await screen.findByText("₱1,010.00")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("checkbox"));
  await userEvent.click(
    screen.getByRole("button", { name: "Create payment checkout" }),
  );
  expect(await screen.findByText(/Checkout created/)).toBeInTheDocument();
  const mutation = fetch.mock.calls.find(([, init]) => init?.method === "POST");
  expect(mutation?.[0]).toBe("/api/v1/loans/loan-1/checkout");
  const payload = JSON.parse(mutation![1].body as string);
  expect(payload.mode).toBe("installment");
  expect(payload).not.toHaveProperty("amount");
  expect(payload).not.toHaveProperty("routing_id");
  expect(screen.queryByText("Payment confirmed")).not.toBeInTheDocument();
});
it("keeps checkout unavailable if an authoritative preview fails", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        jsonResponse(
          { detail: "Balance changed. Review the current schedule." },
          409,
        ),
      ),
  );
  renderApp(<PaymentForm loan={loan} />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Balance changed");
  expect(
    screen.queryByRole("button", { name: "Create payment checkout" }),
  ).not.toBeInTheDocument();
});
