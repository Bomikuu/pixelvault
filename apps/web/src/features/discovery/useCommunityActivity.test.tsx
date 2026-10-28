import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { Button } from "@pixelvault/ui";
import { useCommunityActivity } from "./useCommunityActivity";
import { renderApp, jsonResponse } from "../../test/helpers";
class Stream {
  static instances: Stream[] = [];
  listeners: Record<string, (event: MessageEvent) => void> = {};
  onerror: (() => void) | null = null;
  close = vi.fn();
  constructor(
    public url: string,
    public options?: EventSourceInit,
  ) {
    Stream.instances.push(this);
  }
  addEventListener(name: string, listener: (event: MessageEvent) => void) {
    this.listeners[name] = listener;
  }
  emit(name: string, revision: string) {
    this.listeners[name]?.(
      new MessageEvent(name, { data: JSON.stringify({ revision }) }),
    );
  }
}
function Feed() {
  const activity = useCommunityActivity();
  return (
    <>
      <span>{activity.status}</span>
      <p>{activity.snapshot?.posts.map((post) => post.title).join(",")}</p>
      {activity.hasUpdates && (
        <Button onClick={() => void activity.applyUpdates()}>
          Show updated postings
        </Button>
      )}
    </>
  );
}
afterEach(() => {
  vi.unstubAllGlobals();
  Stream.instances = [];
});
it("holds the visible feed stable until updates are applied and closes the stream on unmount", async () => {
  let revision = "revision-1";
  const fetch = vi.fn().mockImplementation(() =>
    Promise.resolve(
      jsonResponse({
        revision,
        posts: [
          {
            id: revision,
            title: revision === "revision-1" ? "First posting" : "New posting",
          },
        ],
      }),
    ),
  );
  vi.stubGlobal("fetch", fetch);
  vi.stubGlobal("EventSource", Stream);
  const { unmount } = renderApp(<Feed />);
  expect(await screen.findByText("First posting")).toBeInTheDocument();
  expect(Stream.instances[0].url).toBe("/api/v1/community/activity/stream");
  act(() => Stream.instances[0].emit("ready", revision));
  expect(screen.getByText("live")).toBeInTheDocument();
  revision = "revision-2";
  act(() => Stream.instances[0].emit("offers.changed", revision));
  await screen.findByRole("button", { name: "Show updated postings" });
  expect(screen.getByText("First posting")).toBeInTheDocument();
  expect(screen.queryByText("New posting")).not.toBeInTheDocument();
  await userEvent.click(
    screen.getByRole("button", { name: "Show updated postings" }),
  );
  expect(await screen.findByText("New posting")).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Show updated postings" }),
  ).not.toBeInTheDocument();
  const source = Stream.instances[0];
  unmount();
  expect(source.close).toHaveBeenCalledOnce();
});
it("pauses hidden tabs, reconnects visibly and labels an unavailable stream as bounded polling", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockImplementation(() =>
        Promise.resolve(jsonResponse({ revision: "r1", posts: [] })),
      ),
  );
  vi.stubGlobal("EventSource", Stream);
  let hidden = false;
  vi.spyOn(document, "hidden", "get").mockImplementation(() => hidden);
  renderApp(<Feed />);
  await waitFor(() => expect(Stream.instances).toHaveLength(1));
  hidden = true;
  act(() => document.dispatchEvent(new Event("visibilitychange")));
  expect(Stream.instances[0].close).toHaveBeenCalledOnce();
  expect(screen.getByText("paused")).toBeInTheDocument();
  hidden = false;
  act(() => document.dispatchEvent(new Event("visibilitychange")));
  expect(Stream.instances).toHaveLength(2);
  act(() => Stream.instances[1].onerror?.());
  expect(Stream.instances[1].close).toHaveBeenCalledOnce();
  expect(screen.getByText("fallback")).toBeInTheDocument();
  vi.restoreAllMocks();
});

it("reconnects after the server's bounded stream ends and cancels reconnect work on unmount", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockImplementation(() =>
        Promise.resolve(
          jsonResponse({
            revision: "r1",
            posts: [{ title: "Current posting" }],
          }),
        ),
      ),
  );
  vi.stubGlobal("EventSource", Stream);
  const { unmount } = renderApp(<Feed />);
  await screen.findByText("Current posting");
  act(() => Stream.instances[0].emit("ready", "r1"));
  vi.useFakeTimers();
  try {
    act(() => Stream.instances[0].onerror?.());
    expect(Stream.instances[0].close).toHaveBeenCalledOnce();
    expect(screen.getByText("fallback")).toBeInTheDocument();
    await act(async () => {
      vi.advanceTimersByTime(3000);
    });
    expect(Stream.instances).toHaveLength(2);
    act(() => Stream.instances[1].emit("ready", "r1"));
    expect(screen.getByText("live")).toBeInTheDocument();
    act(() => Stream.instances[1].onerror?.());
    unmount();
    await act(async () => {
      vi.advanceTimersByTime(30_000);
    });
    expect(Stream.instances).toHaveLength(2);
  } finally {
    vi.useRealTimers();
  }
});
