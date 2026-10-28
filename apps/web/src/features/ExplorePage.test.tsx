import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { useLocation } from "react-router-dom";
import { ExplorePage, Schedule } from "./ExplorePages";
import {
  renderApp,
  offer,
  jsonResponse,
  discoveryEnvelope,
} from "../test/helpers";
afterEach(() => vi.unstubAllGlobals());
function Location() {
  const location = useLocation();
  return <output aria-label="Filter URL">{location.search}</output>;
}
it("filters complete comparable rows and preserves shared filters in URL", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      jsonResponse(
        discoveryEnvelope([
          offer,
          {
            ...offer,
            id: "offer-2",
            title: "Other offer",
            lender: { id: "two", display_name: "Lina Test", area: "Pasig" },
            area: "Pasig",
          },
        ]),
      ),
    ),
  );
  renderApp(
    <>
      <ExplorePage />
      <Location />
    </>,
  );
  expect(await screen.findByText("2 offers to explore")).toBeInTheDocument();
  await userEvent.type(
    screen.getByRole("textbox", { name: "Search lending offers" }),
    "Elias",
  );
  expect(screen.getByText("1 offer to explore")).toBeInTheDocument();
  expect(screen.getByLabelText("Filter URL")).toHaveTextContent("q=Elias");
  expect(screen.getByText("₱8,000.00")).toBeInTheDocument();
});
it("keeps the complete offer list when geographic tiles are unavailable", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(jsonResponse(discoveryEnvelope([offer]))),
  );
  renderApp(<ExplorePage />, { route: "/explore?view=map" });
  expect(await screen.findByText("Area overview")).toBeInTheDocument();
  expect(
    screen.getByText(/geographic tile provider has not been configured/),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: /A clear next step/ }),
  ).toBeInTheDocument();
  expect(
    screen.queryByText(/home address:|exact coordinates/i),
  ).not.toBeInTheDocument();
});
it("renders schedule columns with semantic shared table controls", () => {
  renderApp(<Schedule rows={offer.disclosure.schedule} />);
  expect(
    screen.getByRole("columnheader", { name: "Due date" }),
  ).toBeInTheDocument();
  expect(screen.getByRole("cell", { name: "₱1,030.00" })).toBeInTheDocument();
});
