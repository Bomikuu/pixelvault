import { StrictMode } from "react";
import { act, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { XpCount } from "./XpCount";

afterEach(() => vi.unstubAllGlobals());

function frames(reduced = false) {
  const callbacks = new Map<number, FrameRequestCallback>();
  let id = 0;
  const request = vi.fn((callback: FrameRequestCallback) => {
    callbacks.set(++id, callback);
    return id;
  });
  const cancel = vi.fn((frame: number) => callbacks.delete(frame));
  vi.stubGlobal("requestAnimationFrame", request);
  vi.stubGlobal("cancelAnimationFrame", cancel);
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: reduced,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
  return {
    request,
    cancel,
    advance(time: number) {
      act(() => {
        const current = [...callbacks.values()];
        callbacks.clear();
        current.forEach((callback) => callback(time));
      });
    },
  };
}

it("counts XP upward once under StrictMode while exposing the exact final accessible value", () => {
  const motion = frames();
  const { rerender, unmount } = render(
    <StrictMode>
      <XpCount value={1100} />
    </StrictMode>,
  );
  const value = screen.getByLabelText("1,100 community XP");
  expect(value).toHaveTextContent("0 XP");
  motion.advance(0);
  motion.advance(280);
  expect(value).toHaveTextContent("962 XP");
  motion.advance(560);
  expect(value).toHaveTextContent("1,100 XP");
  const requests = motion.request.mock.calls.length;
  rerender(
    <StrictMode>
      <XpCount value={1050} />
    </StrictMode>,
  );
  expect(screen.getByLabelText("1,050 community XP")).toHaveTextContent(
    "1,050 XP",
  );
  expect(motion.request).toHaveBeenCalledTimes(requests);
  unmount();
  expect(motion.cancel).toHaveBeenCalled();
});

it("renders the final score immediately for reduced motion without requesting animation frames", () => {
  const motion = frames(true);
  render(<XpCount value={250} />);
  expect(screen.getByLabelText("250 community XP")).toHaveTextContent("250 XP");
  expect(motion.request).not.toHaveBeenCalled();
});

it("cancels an unfinished count when the member leaves the page", () => {
  const motion = frames();
  const { unmount } = render(<XpCount value={100} />);
  unmount();
  expect(motion.cancel).toHaveBeenCalled();
  motion.advance(560);
  expect(motion.request).toHaveBeenCalledTimes(1);
});
