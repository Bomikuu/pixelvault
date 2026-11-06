import { it, expect, vi } from "vitest";
import { render, act } from "@testing-library/react";
import { GoogleMapSurface } from "./GoogleMapSurface";
import { loadGoogleMaps, mountGoogleMap } from "./googleMaps";
import type { Room } from "./types";
vi.mock("./googleMaps", () => ({
  loadGoogleMaps: vi.fn(),
  mountGoogleMap: vi.fn(),
}));
it("does not mount a late map after the world unmounts", async () => {
  vi.stubEnv("VITE_GOOGLE_MAPS_API_KEY", "synthetic-map-key");
  let finish: (value: unknown) => void = () => {};
  vi.mocked(loadGoogleMaps).mockReturnValue(
    new Promise((resolve) => {
      finish = resolve as (v: unknown) => void;
    }),
  );
  const room = {
    slug: "manila-01",
    area: { latitude: 14.5995, longitude: 120.9842 },
  } as Room;
  const view = render(
    <GoogleMapSurface
      room={room}
      onProjection={vi.fn()}
      onDestination={vi.fn()}
      onReady={vi.fn()}
      attempt={0}
    />,
  );
  view.unmount();
  await act(async () => finish({}));
  expect(mountGoogleMap).not.toHaveBeenCalled();
  vi.unstubAllEnvs();
});
