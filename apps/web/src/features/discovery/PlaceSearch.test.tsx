import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { PlaceSearch } from "./PlaceSearch";
import { jsonResponse } from "../../test/helpers";
afterEach(() => vi.unstubAllGlobals());
it("uses debounced Philippines-only v6 place search, excludes address results and selects a map center", async () => {
  const onSelect = vi.fn();
  const fetch = vi.fn().mockImplementation(() =>
    Promise.resolve(
      jsonResponse({
        features: [
          {
            id: "city",
            geometry: { coordinates: [121.0437, 14.676] },
            properties: {
              feature_type: "place",
              name: "Quezon City",
              place_formatted: "Metro Manila, Philippines",
            },
          },
          {
            id: "private",
            geometry: { coordinates: [121.0437, 14.676] },
            properties: { feature_type: "address", name: "Private address" },
          },
        ],
      }),
    ),
  );
  vi.stubGlobal("fetch", fetch);
  render(<PlaceSearch token="pk.synthetic-test" onSelect={onSelect} />);
  await userEvent.type(screen.getByRole("textbox"), "Quezon");
  expect(fetch).not.toHaveBeenCalled();
  const choice = await screen.findByRole("button", {
    name: "Show Quezon City on map",
  });
  const url = new URL(fetch.mock.calls[0][0]);
  expect(url.pathname).toBe("/search/geocode/v6/forward");
  expect(Object.fromEntries(url.searchParams)).toMatchObject({
    country: "ph",
    types: "place,locality,neighborhood",
    q: "Quezon",
    autocomplete: "true",
  });
  expect(fetch.mock.calls[0][1]).toMatchObject({ credentials: "omit" });
  expect(screen.queryByText("Private address")).not.toBeInTheDocument();
  await userEvent.click(choice);
  expect(onSelect).toHaveBeenCalledWith(
    expect.objectContaining({
      name: "Quezon City",
      center: [121.0437, 14.676],
    }),
  );
});
it("aborts an outdated query and on unmount so late results cannot replace the latest search", async () => {
  const fetch = vi.fn().mockImplementation(() => new Promise(() => {}));
  vi.stubGlobal("fetch", fetch);
  const { unmount } = render(
    <PlaceSearch token="pk.synthetic-test" onSelect={() => {}} />,
  );
  const input = screen.getByRole("textbox");
  await userEvent.type(input, "Manila");
  await waitFor(() => expect(fetch).toHaveBeenCalledOnce());
  const firstSignal = fetch.mock.calls[0][1].signal;
  await userEvent.clear(input);
  await userEvent.type(input, "Pasig");
  expect(firstSignal.aborted).toBe(true);
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
  const secondSignal = fetch.mock.calls[1][1].signal;
  unmount();
  expect(secondSignal.aborted).toBe(true);
});
it("does not forward street numbers or personal-looking input to the provider", async () => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  render(<PlaceSearch token="pk.synthetic-test" onSelect={() => {}} />);
  await userEvent.type(screen.getByRole("textbox"), "123 Private Street");
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "without street numbers or personal details",
  );
  expect(fetch).not.toHaveBeenCalled();
});
