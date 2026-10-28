import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { IllustratedInfoDialog, MemberAvatar } from "../components";
import { Leaderboard, ReputationSettings } from "./ReputationPages";
import { jsonResponse, renderApp, session } from "../test/helpers";

const refresh = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock("../app/session", () => ({ useSession: () => ({ session, refresh }) }));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});
const reputation = {
  points: 100,
  level: "Prepared",
  frame: "blue",
  flair: null,
  show_points: true,
};
const workspace = {
  reputation,
  frames: [
    { key: "plain", name: "Plain", required_points: 0, unlocked: true },
    { key: "blue", name: "Blue", required_points: 100, unlocked: true },
    { key: "gold", name: "Gold", required_points: 500, unlocked: false },
  ],
  settings: {
    avatar_frame: "blue",
    avatar_flair_id: null,
    show_reputation: true,
    leaderboard_opt_in: false,
  },
  rules: {
    literacy_points: 100,
    contribution_points: 50,
    contribution_cap: 20,
  },
  progress: { next_level: "Contributor", points_to_next: 150 },
  breakdown: {
    literacy_points: 100,
    contribution_points: 0,
    approved_contributions: 0,
  },
};

it("opens an illustrated explanation from the keyboard, traps the dialog and restores focus on Escape", async () => {
  renderApp(
    <IllustratedInfoDialog
      title="Private checks"
      description="Only authorized reviewers can inspect your synthetic evidence."
      scene="welcome-community"
      triggerLabel="Explain verification"
    />,
  );
  const trigger = screen.getByRole("button", { name: "Explain verification" });
  trigger.focus();
  await userEvent.keyboard("{Enter}");
  const dialog = screen.getByRole("dialog", { name: "Private checks" });
  expect(dialog).toHaveAttribute("aria-describedby");
  expect(
    dialog.querySelector('img[src="/illustrations/welcome-community.png"]'),
  ).toHaveAttribute("alt", "");
  expect(
    within(dialog).getByRole("button", { name: "Got it" }),
  ).toBeInTheDocument();
  await userEvent.keyboard("{Tab}{Tab}{Tab}");
  expect(dialog.contains(document.activeElement)).toBe(true);
  await userEvent.keyboard("{Escape}");
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
  );
  expect(trigger).toHaveFocus();
});

it("locks unavailable frames and persists only server-authorized cosmetic keys and explicit privacy booleans", async () => {
  const fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) =>
    Promise.resolve(
      jsonResponse(
        init?.method === "PATCH"
          ? {}
          : url.endsWith("/community/reputation")
            ? workspace
            : {
                awards: [
                  {
                    id: "earned",
                    key: "bright_start",
                    name: "Bright Start",
                    eligible: true,
                    private: false,
                  },
                  {
                    id: "private",
                    key: "fresh_start",
                    name: "Fresh Start",
                    eligible: true,
                    private: true,
                  },
                  {
                    id: "unearned",
                    key: "clockwork",
                    name: "Clockwork",
                    eligible: false,
                    private: false,
                  },
                ],
              },
      ),
    ),
  );
  vi.stubGlobal("fetch", fetch);
  renderApp(<ReputationSettings />);
  expect(await screen.findByText("100 community XP")).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: /Choose Gold frame/ }),
  ).toBeDisabled();
  await userEvent.click(
    screen.getByRole("button", { name: "Choose Plain frame" }),
  );
  await userEvent.click(
    screen.getByRole("checkbox", {
      name: "Show my community XP on public profiles",
    }),
  );
  await userEvent.click(
    screen.getByRole("checkbox", {
      name: "Include me in the optional community board",
    }),
  );
  screen.getByRole("combobox", { name: "Wear an earned achievement" }).focus();
  await userEvent.keyboard("{ArrowDown}");
  expect(
    screen.queryByRole("option", { name: "Fresh Start" }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("option", { name: "Clockwork" }),
  ).not.toBeInTheDocument();
  screen.getByRole("option", { name: "Bright Start" }).focus();
  await userEvent.keyboard("{Enter}");
  await userEvent.click(
    screen.getByRole("button", { name: /Save avatar extras & privacy/ }),
  );
  expect(
    await screen.findByText(
      "Your avatar extras and community preferences were saved.",
    ),
  ).toBeInTheDocument();
  const patch = fetch.mock.calls.find(([, init]) => init?.method === "PATCH");
  expect(JSON.parse(patch![1].body)).toEqual({
    avatar_frame: "plain",
    avatar_flair_id: "earned",
    show_reputation: false,
    leaderboard_opt_in: true,
  });
  expect(refresh).toHaveBeenCalled();
});

it("keeps rejected cosmetic changes editable without claiming they were saved", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockImplementation((url: string, init?: RequestInit) =>
        Promise.resolve(
          init?.method === "PATCH"
            ? jsonResponse({ detail: "This frame is locked." }, 403)
            : jsonResponse(
                url.endsWith("/community/reputation")
                  ? workspace
                  : { awards: [] },
              ),
        ),
      ),
  );
  renderApp(<ReputationSettings />);
  await screen.findByText("100 community XP");
  await userEvent.click(
    screen.getByRole("button", { name: /Save avatar extras & privacy/ }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "This frame is locked.",
  );
  expect(
    screen.queryByText(
      "Your avatar extras and community preferences were saved.",
    ),
  ).not.toBeInTheDocument();
});

it("shows actual opt-in rankings and no invented names when the board is empty", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      jsonResponse({
        entries: [],
        next_cursor: null,
        rules: workspace.rules,
        notice: "Optional learning recognition only.",
      }),
    ),
  );
  renderApp(<Leaderboard />);
  expect(
    await screen.findByText("There’s room for a first contributor."),
  ).toBeInTheDocument();
  expect(screen.queryByLabelText(/Rank /)).not.toBeInTheDocument();
});

it("renders server ranks and experience without exposing hidden experience on avatars", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      jsonResponse({
        entries: [
          {
            rank: 2,
            handle: "neighbor",
            display_name: "A Real Test Neighbor",
            avatar_key: "maker",
            reputation: { ...reputation, points: 250, level: "Contributor" },
          },
        ],
        next_cursor: null,
        rules: workspace.rules,
        notice: "Only opted-in members appear.",
      }),
    ),
  );
  const { rerender } = renderApp(<Leaderboard />);
  expect(
    await screen.findByRole("link", { name: "A Real Test Neighbor" }),
  ).toHaveAttribute("href", "/members/neighbor");
  expect(screen.getByLabelText("Rank 2")).toBeInTheDocument();
  expect(
    screen.getByLabelText("250 community experience points"),
  ).toBeInTheDocument();
  rerender(
    <MemberAvatar
      name="Private member"
      reputation={{ ...reputation, points: 0, show_points: false }}
    />,
  );
  expect(
    screen.queryByLabelText(/community experience points/),
  ).not.toBeInTheDocument();
});

it("restarts from the first page after the ranking snapshot changes instead of appending stale ranks", async () => {
  let firstPages = 0;
  const fetch = vi.fn().mockImplementation((url: string) => {
    if (url.includes("cursor="))
      return Promise.resolve(
        jsonResponse(
          { detail: "The board changed.", code: "leaderboard_changed" },
          409,
        ),
      );
    firstPages += 1;
    return Promise.resolve(
      jsonResponse({
        entries: [
          {
            rank: 1,
            handle: firstPages === 1 ? "older" : "current",
            display_name:
              firstPages === 1 ? "Earlier ranking" : "Current ranking",
            reputation,
          },
        ],
        next_cursor: firstPages === 1 ? "old-snapshot" : null,
        rules: workspace.rules,
        notice: "Optional recognition.",
      }),
    );
  });
  vi.stubGlobal("fetch", fetch);
  renderApp(<Leaderboard />);
  await screen.findByRole("link", { name: "Earlier ranking" });
  await userEvent.click(
    screen.getByRole("button", { name: /Load more members/ }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "The community board changed.",
  );
  await userEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(
    await screen.findByRole("link", { name: "Current ranking" }),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("link", { name: "Earlier ranking" }),
  ).not.toBeInTheDocument();
  expect(
    fetch.mock.calls.filter(([url]) => url.includes("cursor=")).length,
  ).toBe(1);
});
