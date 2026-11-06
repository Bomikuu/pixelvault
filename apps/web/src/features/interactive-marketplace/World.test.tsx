import { it, expect, vi, afterEach } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { renderApp } from "../../test/helpers";
import { World } from "./World";
import type { Room } from "./types";
vi.mock("./GoogleMapSurface", () => ({ GoogleMapSurface: () => null }));
afterEach(() => vi.unstubAllGlobals());
it("releases held movement once on pointer cancellation", () => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  const move = vi.fn(),
    stop = vi.fn();
  const room = {
    slug: "manila-01",
    area: { latitude: 14.5995, longitude: 120.9842 },
  } as Room;
  renderApp(
    <World
      room={room}
      snapshot={null}
      enabled
      onMove={move}
      onStop={stop}
      onSelect={vi.fn()}
      onOffer={vi.fn()}
    />,
  );
  const button = screen.getByRole("button", { name: "Walk right" });
  Object.defineProperty(button, "setPointerCapture", { value: vi.fn() });
  fireEvent.pointerDown(button, { pointerId: 1 });
  fireEvent.pointerCancel(button, { pointerId: 1 });
  expect(move).toHaveBeenCalledTimes(1);
  expect(stop).toHaveBeenCalledTimes(1);
  expect(screen.getByText("Plaza view · Map unavailable")).toBeVisible();
});
