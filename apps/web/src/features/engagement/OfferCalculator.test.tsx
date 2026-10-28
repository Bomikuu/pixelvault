import { act, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { Button } from "@pixelvault/ui";
import { Routes, Route } from "react-router-dom";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { OfferCalculator } from "./OfferCalculator";
import { OfferDetail } from "../ExplorePages";
import { SessionProvider, useSession } from "../../app/session";
import { renderApp, jsonResponse, offer, session } from "../../test/helpers";
const result = (principal: number) => ({
  terms: { ...offer.terms, principal },
  disclosure: {
    ...offer.disclosure,
    principal,
    net_proceeds: principal,
    total_interest: principal / 100,
    total_repayment: principal + principal / 100,
    effective_annual_percentage: "12.10",
  },
  simulation_only: false,
  application_uses_original_terms: true,
  original_terms: { frequency: "monthly", installment_count: 3 },
  limits: {
    min_amount: 100000,
    max_amount: 500000,
    max_installments: 24,
    frequencies: ["weekly", "monthly", "maturity"],
  },
});
afterEach(() => vi.unstubAllGlobals());
it("aborts older calculator requests and never lets late results overwrite a newer amount", async () => {
  const pending: {
    resolve: (response: Response) => void;
    signal: AbortSignal;
    url: string;
  }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(
      (url: string, init: RequestInit) =>
        new Promise<Response>((resolve) =>
          pending.push({ resolve, signal: init.signal as AbortSignal, url }),
        ),
    ),
  );
  renderApp(<OfferCalculator offer={offer} />);
  await waitFor(() => expect(pending).toHaveLength(1));
  const amount = screen.getByRole("spinbutton", {
    name: "Amount to explore (₱)",
  });
  await userEvent.clear(amount);
  await userEvent.type(amount, "2000");
  expect(pending[0].signal.aborted).toBe(true);
  await waitFor(() => expect(pending).toHaveLength(2));
  expect(
    new URL(pending[1].url, "http://localhost").searchParams.get("principal"),
  ).toBe("200000");
  await act(async () => pending[1].resolve(jsonResponse(result(200000))));
  expect(await screen.findByText("₱2,020.00")).toBeInTheDocument();
  await act(async () => pending[0].resolve(jsonResponse(result(300000))));
  expect(screen.getByText("₱2,020.00")).toBeInTheDocument();
  expect(screen.queryByText("₱3,030.00")).not.toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: "Use this amount in a private request" }),
  ).toHaveAttribute("href", "/applications/new?offer=offer-1&amount=200000");
});
it("labels alternate terms as simulation only and carries only principal into an application", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(() =>
      Promise.resolve(
        jsonResponse({
          ...result(300000),
          simulation_only: true,
          terms: {
            ...offer.terms,
            principal: 300000,
            installment_count: 6,
            frequency: "weekly",
          },
        }),
      ),
    ),
  );
  renderApp(<OfferCalculator offer={offer} />);
  expect(await screen.findByText(/comparison only/)).toHaveTextContent(
    "3 monthly payments",
  );
  expect(
    screen.getByRole("link", {
      name: "Use this amount with the original offer terms",
    }),
  ).toHaveAttribute("href", "/applications/new?offer=offer-1&amount=300000");
  expect(
    screen.queryByRole("link", { name: /frequency=/ }),
  ).not.toBeInTheDocument();
});

it("clears and recalculates when the same offer receives a new rate and terms version", async () => {
  let changed = false;
  const fetch = vi.fn().mockImplementation(() =>
    Promise.resolve(
      jsonResponse({
        ...result(300000),
        disclosure: {
          ...result(300000).disclosure,
          total_repayment: changed ? 306000 : 303000,
        },
      }),
    ),
  );
  vi.stubGlobal("fetch", fetch);
  function RefreshableOffer() {
    const [current, setCurrent] = useState(offer);
    return (
      <>
        <Button
          onClick={() => {
            changed = true;
            setCurrent({
              ...offer,
              version: 2,
              annual_rate_bps: 2400,
              terms: {
                ...offer.terms,
                annual_rate_bps: 2400,
                effective_date: "2026-11-01",
              },
            });
          }}
        >
          Refresh offer terms
        </Button>
        <OfferCalculator offer={current} />
      </>
    );
  }
  renderApp(<RefreshableOffer />);
  expect(await screen.findByText("₱3,030.00")).toBeInTheDocument();
  await userEvent.click(
    screen.getByRole("button", { name: "Refresh offer terms" }),
  );
  expect(screen.queryByText("₱3,030.00")).not.toBeInTheDocument();
  expect(await screen.findByText("₱3,060.00")).toBeInTheDocument();
  expect(fetch).toHaveBeenCalledTimes(2);
});

it("places the calculator before every application action and original cost schedule", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockImplementation((url: string) =>
        Promise.resolve(
          jsonResponse(
            url.endsWith("/auth/session")
              ? session
              : url.includes("/calculator?")
                ? result(300000)
                : url.includes("/engagement/")
                  ? {
                      offer_id: offer.id,
                      likes: { count: 0, liked: false },
                      reactions: [],
                      my_reaction: null,
                      reaction_choices: [],
                      comments: [],
                      comments_next_cursor: null,
                    }
                  : offer,
          ),
        ),
      ),
  );
  function Gate() {
    return useSession().session?.member ? (
      <Routes>
        <Route path="/offers/:id" element={<OfferDetail />} />
      </Routes>
    ) : null;
  }
  renderApp(
    <SessionProvider>
      <Gate />
    </SessionProvider>,
    { route: "/offers/offer-1" },
  );
  const calculator = await screen.findByRole("region", {
    name: "Find a plan you can understand.",
  });
  const request = screen.getByRole("link", { name: "Request to borrow" });
  const fullCost = screen.getByRole("heading", { name: "Full cost example" });
  const schedule = screen.getByRole("heading", { name: "Repayment schedule" });
  expect(
    calculator.compareDocumentPosition(request) &
      Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
  expect(
    calculator.compareDocumentPosition(fullCost) &
      Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
  expect(
    calculator.compareDocumentPosition(schedule) &
      Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
  expect(calculator.parentElement?.closest(".surface")).toBeNull();
  expect(
    screen
      .getByRole("region", { name: "Offer lender and capacity" })
      .compareDocumentPosition(calculator) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
});
