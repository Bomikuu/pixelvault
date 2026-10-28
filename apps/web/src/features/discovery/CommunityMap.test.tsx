import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { CommunityMap, groupAreaOffers } from "./CommunityMap";
import { offer } from "../../test/helpers";
import type { DiscoveryOffer } from "./types";
const state = vi.hoisted(() => ({
  maps: [] as any[],
  markers: [] as any[],
  supported: true,
}));
vi.mock("mapbox-gl", () => ({
  default: {
    supported: () => state.supported,
    Map: class {
      options: any;
      handlers: Record<string, (...args: any[]) => void> = {};
      remove = vi.fn();
      flyTo = vi.fn();
      resize = vi.fn();
      addControl = vi.fn();
      getSource = vi.fn();
      addSource = vi.fn();
      addLayer = vi.fn();
      fitBounds = vi.fn();
      zoomIn = vi.fn();
      zoomOut = vi.fn();
      constructor(options: any) {
        this.options = options;
        state.maps.push(this);
      }
      on(name: string, handler: (...args: any[]) => void) {
        this.handlers[name] = handler;
        return this;
      }
    },
    Marker: class {
      options: any;
      center: number[] = [];
      remove = vi.fn(() => this.options.element.remove());
      constructor(options: any) {
        this.options = options;
        state.markers.push(this);
      }
      setLngLat(center: number[]) {
        this.center = center;
        return this;
      }
      addTo(map: any) {
        map.options.container.appendChild(this.options.element);
        return this;
      }
    },
    NavigationControl: class {},
  },
}));
const cityOffer: DiscoveryOffer = {
  ...offer,
  lender: {
    ...offer.lender,
    photo_url: "/api/v1/community/photos/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  },
  coarseArea: {
    code: "quezon-city",
    name: "Quezon City",
    latitude: 14.676,
    longitude: 121.0437,
    approximate: true,
  },
};
afterEach(() => {
  state.maps = [];
  state.markers = [];
  state.supported = true;
  vi.unstubAllGlobals();
});
it("uses the real Mapbox SDK options and groups avatars only at public approximate centroids", async () => {
  const onSelect = vi.fn();
  const second = { ...cityOffer, id: "offer-2" };
  const { rerender, unmount } = render(
    <CommunityMap
      token="pk.synthetic-test"
      offers={[cityOffer, second]}
      selectedId={null}
      onSelect={onSelect}
      place={null}
    />,
  );
  await waitFor(() => expect(state.maps).toHaveLength(1));
  expect(state.maps[0].options).toMatchObject({
    accessToken: "pk.synthetic-test",
    style: "mapbox://styles/mapbox/standard",
    maxZoom: 14,
    attributionControl: true,
  });
  await act(async () => state.maps[0].handlers.load());
  expect(
    await screen.findByRole("img", { name: "Elias Test’s profile photo" }),
  ).toHaveAttribute("src", cityOffer.lender.photo_url);
  const marker = await screen.findByRole("button", {
    name: "Explore 2 offers near Quezon City",
  });
  expect(state.markers).toHaveLength(1);
  expect(state.markers[0].center).toEqual([121.0437, 14.676]);
  await userEvent.click(marker);
  expect(onSelect).toHaveBeenCalledWith("offer-1");
  rerender(
    <CommunityMap
      token="pk.synthetic-test"
      offers={[cityOffer, second]}
      selectedId="offer-2"
      onSelect={onSelect}
      place={null}
    />,
  );
  await waitFor(() =>
    expect(state.maps[0].flyTo).toHaveBeenCalledWith(
      expect.objectContaining({
        center: [121.0437, 14.676],
        zoom: 11.5,
        essential: false,
      }),
    ),
  );
  const instance = state.maps[0];
  unmount();
  expect(instance.remove).toHaveBeenCalledOnce();
});
it("does not turn missing or precise location records into invented marker positions", () => {
  expect(
    groupAreaOffers([
      { ...offer },
      {
        ...cityOffer,
        coarseArea: { ...cityOffer.coarseArea!, approximate: false },
      },
    ]),
  ).toEqual([]);
  expect(
    groupAreaOffers([
      cityOffer,
      {
        ...cityOffer,
        id: "nearby",
        coarseArea: { ...cityOffer.coarseArea!, longitude: 121.044 },
      },
    ]),
  ).toHaveLength(1);
});
it("reports missing configuration without loading the provider or rendering a schematic", () => {
  const { container } = render(
    <CommunityMap
      token=""
      offers={[cityOffer]}
      selectedId={null}
      onSelect={() => {}}
      place={null}
    />,
  );
  expect(
    screen.getByRole("heading", { name: "Map setup is still needed." }),
  ).toBeInTheDocument();
  expect(state.maps).toHaveLength(0);
  expect(container.querySelector(".map-graphic")).toBeNull();
});
it("offers an honest WebGL fallback and recoverable provider authorization error", async () => {
  state.supported = false;
  const { unmount } = render(
    <CommunityMap
      token="pk.synthetic-test"
      offers={[cityOffer]}
      selectedId={null}
      onSelect={() => {}}
      place={null}
    />,
  );
  expect(await screen.findByRole("alert")).toHaveTextContent("WebGL enabled");
  unmount();
  state.supported = true;
  const { rerender } = render(
    <CommunityMap
      token="pk.synthetic-test"
      offers={[cityOffer]}
      selectedId={null}
      onSelect={() => {}}
      place={null}
    />,
  );
  await waitFor(() => expect(state.maps).toHaveLength(1));
  await act(async () =>
    state.maps[0].handlers.error({ error: new Error("401 token invalid") }),
  );
  expect(screen.getByRole("alert")).toHaveTextContent(
    "could not authorize this site",
  );
  rerender(
    <CommunityMap
      token="pk.synthetic-test"
      offers={[cityOffer]}
      selectedId={null}
      onSelect={() => {}}
      place={null}
      command={{ type: "retry", sequence: 1 }}
    />,
  );
  await waitFor(() => expect(state.maps).toHaveLength(2));
});
