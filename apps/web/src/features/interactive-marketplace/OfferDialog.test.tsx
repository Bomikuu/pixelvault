import { it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderApp, offer } from "../../test/helpers";
import { apiRequest, post } from "../../app/api";
import { OfferDialog } from "./OfferDialog";
vi.mock("../../app/api", () => ({ apiRequest: vi.fn(), post: vi.fn() }));
vi.mock("../../app/session", () => ({
  useSession: () => ({ session: { member: { id: "viewer" } } }),
}));
vi.mock("../engagement/OfferCalculator", () => ({
  OfferCalculator: () => (
    <section aria-label="Calculator fixture">Read-only calculator</section>
  ),
}));
beforeEach(() => vi.clearAllMocks());
it("inspects an offer without submitting an application or payment", async () => {
  vi.mocked(apiRequest).mockResolvedValue({
    ...offer,
    expires_at: new Date(Date.now() + 86400000).toISOString(),
  });
  renderApp(<OfferDialog offerId="offer-1" onClose={vi.fn()} />);
  await screen.findByText("Read-only calculator");
  expect(apiRequest).toHaveBeenCalledWith(
    "/offers/offer-1",
    expect.objectContaining({ signal: expect.any(AbortSignal) }),
  );
  expect(post).not.toHaveBeenCalled();
});
it("disables application after the refreshed offer is closed", async () => {
  vi.mocked(apiRequest).mockResolvedValue({
    ...offer,
    status: "withdrawn",
    expires_at: new Date(Date.now() + 86400000).toISOString(),
  });
  renderApp(<OfferDialog offerId="offer-1" onClose={vi.fn()} />);
  await screen.findByText(/no longer available to apply/);
  expect(
    screen.getByRole("button", { name: "Review application" }),
  ).toBeDisabled();
  expect(post).not.toHaveBeenCalled();
});
