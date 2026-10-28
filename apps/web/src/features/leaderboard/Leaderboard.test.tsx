import { screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { Leaderboard } from "./Leaderboard";
import { jsonResponse, renderApp, session } from "../../test/helpers";

vi.mock("../../app/session", () => ({ useSession: () => ({ session }) }));
afterEach(() => vi.unstubAllGlobals());

it("shows ordered positions while preserving tied server XP and real participant totals", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      jsonResponse({
        entries: [1, 1, 2, 3].map((rank, index) => ({
          rank,
          handle: `member-${index}`,
          display_name: `Contributor ${index}`,
          avatar_key: "maker",
          photo_url:
            index === 3
              ? "/api/v1/community/photos/11111111-1111-4111-8111-111111111111"
              : null,
          reputation: {
            points: [250, 250, 150, 100][index],
            level: "Prepared",
            frame: "plain",
            flair: null,
            show_points: true,
          },
          activity: {
            learning_completed: index !== 2,
            approved_contributions: index < 2 ? 3 : 1,
          },
        })),
        summary: {
          participants: 40,
          learning_completed: 28,
          approved_contributions: 65,
          total_xp: 6050,
        },
        next_cursor: null,
        rules: { contribution_cap: 20 },
        notice: "Only opted-in members appear.",
      }),
    ),
  );
  renderApp(<Leaderboard />);
  const podium = await screen.findByRole("list", {
    name: "Top three contributors",
  });
  expect(within(podium).getAllByRole("listitem")).toHaveLength(3);
  expect(
    within(podium).getByLabelText("Leaderboard position 1"),
  ).toBeInTheDocument();
  expect(
    within(podium).getByLabelText("Leaderboard position 2"),
  ).toBeInTheDocument();
  expect(
    within(podium).getByLabelText("Leaderboard position 3"),
  ).toBeInTheDocument();
  expect(within(podium).getAllByLabelText("250 community XP")).toHaveLength(2);
  expect(
    screen.getByText(/Equal XP scores use a fixed server order/),
  ).toBeInTheDocument();
  expect(screen.getByLabelText("Opt-in community totals")).toHaveTextContent(
    "40",
  );
  expect(screen.getByLabelText("Opt-in community totals")).toHaveTextContent(
    "6,050",
  );
  const table = screen.getByRole("table", {
    name: "More community contributors",
  });
  expect(
    screen.getByRole("region", { name: "Community contributor comparison" }),
  ).toHaveAttribute("tabindex", "0");
  expect(
    screen.getByRole("region", { name: "Community contributor comparison" }),
  ).toHaveAccessibleDescription("Scroll sideways to compare all columns.");
  expect(
    within(table).getByLabelText("Leaderboard position 4"),
  ).toBeInTheDocument();
  expect(
    within(table).getByRole("link", { name: "Contributor 3" }),
  ).toHaveAttribute("href", "/members/member-3");
  expect(table.querySelector("img")).toHaveAttribute(
    "src",
    "/api/v1/community/photos/11111111-1111-4111-8111-111111111111",
  );
  expect(
    screen.getByRole("link", { name: /Manage my participation/ }),
  ).toHaveAttribute("href", "/profile/appearance");
  expect(
    screen.getByText("Showing 4 of 40 participating members."),
  ).toBeInTheDocument();
  expect(
    screen.queryByText(/Total borrowed|Total lent|Lv\./),
  ).not.toBeInTheDocument();
});
