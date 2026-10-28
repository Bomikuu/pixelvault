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
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
function mockDiscovery(offers: (typeof offer)[]) {
  vi.stubEnv("VITE_MAPBOX_ACCESS_TOKEN", "");
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockImplementation((url: string) =>
        Promise.resolve(
          jsonResponse(
            url.endsWith("/community/activity")
              ? { posts: [], revision: "test-revision" }
              : discoveryEnvelope(offers),
          ),
        ),
      ),
  );
}
function Location() {
  const location = useLocation();
  return <output aria-label="Filter URL">{location.search}</output>;
}
it("filters complete comparable rows and preserves shared filters in URL", async () => {
  mockDiscovery([
    offer,
    {
      ...offer,
      id: "offer-2",
      title: "Other offer",
      lender: { id: "two", display_name: "Lina Test", area: "Pasig" },
      area: "Pasig",
    },
  ]);
  renderApp(
    <>
      <ExplorePage />
      <Location />
    </>,
    { route: "/explore?view=list" },
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
  mockDiscovery([offer]);
  renderApp(<ExplorePage />, { route: "/explore?view=map" });
  expect(
    await screen.findByRole("heading", { name: "Map setup is still needed." }),
  ).toBeInTheDocument();
  expect(
    screen.getByText(/Mapbox public token has not been configured/),
  ).toBeInTheDocument();
  expect(
    await screen.findByRole("link", { name: /A clear next step/ }),
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

it("keeps pagination reachable when the currently loaded page has no matching offers", async () => {
  vi.stubEnv("VITE_MAPBOX_ACCESS_TOKEN", "");
  const fetch = vi
    .fn()
    .mockImplementation((url: string) =>
      Promise.resolve(
        jsonResponse(
          url.endsWith("/community/activity")
            ? { posts: [], revision: "r1" }
            : url.includes("cursor=30")
              ? discoveryEnvelope([
                  {
                    ...offer,
                    id: "later-offer",
                    title: "A later matching offer",
                  },
                ])
              : { ...discoveryEnvelope([offer]), next_cursor: "30" },
        ),
      ),
    );
  vi.stubGlobal("fetch", fetch);
  renderApp(<ExplorePage />, { route: "/explore?view=list&q=later" });
  expect(
    await screen.findByRole("heading", { name: "No offers match this view." }),
  ).toBeInTheDocument();
  expect(
    screen.getByText(/More posts are available to search/),
  ).toBeInTheDocument();
  await userEvent.click(
    screen.getByRole("button", { name: "Load more offers" }),
  );
  expect(
    await screen.findByRole("link", { name: /A later matching offer/ }),
  ).toBeInTheDocument();
  expect(fetch.mock.calls.some(([url]) => url.includes("cursor=30"))).toBe(
    true,
  );
});
