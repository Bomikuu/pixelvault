import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { ApplyPage } from "../ExplorePages";
import { renderApp, offer, jsonResponse } from "../../test/helpers";
afterEach(() => vi.unstubAllGlobals());
it("omits the no-invitation sentinel and alternate calculator terms from the actual application", async () => {
  const fetch = vi
    .fn()
    .mockImplementation((url: string, init?: RequestInit) =>
      Promise.resolve(
        jsonResponse(
          url.endsWith("/connections/co-borrowers")
            ? { invitations: [] }
            : init?.method === "POST"
              ? { id: "application-1" }
              : offer,
        ),
      ),
    );
  vi.stubGlobal("fetch", fetch);
  renderApp(<ApplyPage />, {
    route:
      "/applications/new?offer=offer-1&amount=200000&frequency=weekly&installment_count=6",
  });
  const amount = await screen.findByRole("spinbutton", {
    name: /Requested principal/,
  });
  expect(amount).toHaveValue(2000);
  await userEvent.type(
    screen.getByRole("textbox", { name: "What will this help you do?" }),
    "For a work project.",
  );
  await userEvent.type(
    screen.getByRole("textbox", {
      name: "Repayment plan and relevant context",
    }),
    "The original monthly dates fit my income.",
  );
  const acknowledgement = screen.getByRole("checkbox");
  await userEvent.click(acknowledgement);
  await userEvent.click(
    screen.getByRole("button", { name: /Send private application/ }),
  );
  await waitFor(() =>
    expect(fetch.mock.calls.some(([, init]) => init?.method === "POST")).toBe(
      true,
    ),
  );
  const request = fetch.mock.calls.find(([, init]) => init?.method === "POST")!;
  const body = JSON.parse(request[1].body);
  expect(body.principal).toBe(200000);
  expect(body).not.toHaveProperty("co_borrower_invitation_id");
  expect(body).not.toHaveProperty("frequency");
  expect(body).not.toHaveProperty("installment_count");
});
