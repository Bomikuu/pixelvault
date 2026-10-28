import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@pixelvault/ui";
import { EditProfile, AchievementsPage, BadgeDetail } from "./CommunityPages";
import { MemberAvatar } from "../components";
import { SessionProvider } from "../app/session";
import { renderApp, jsonResponse, session } from "../test/helpers";

afterEach(() => vi.unstubAllGlobals());

it("persists the chosen avatar with profile changes and refreshes the member session", async () => {
  let saved = false;
  const fetch = vi
    .fn()
    .mockImplementation((url: string, init?: RequestInit) => {
      if (url.endsWith("/auth/session"))
        return Promise.resolve(
          jsonResponse({
            ...session,
            member: {
              ...session.member,
              avatar_key: saved ? "maker" : "sprout",
            },
          }),
        );
      if (url.endsWith("/auth/profile") && init?.method === "PATCH") {
        saved = true;
        return Promise.resolve(
          jsonResponse({ ...session.member, avatar_key: "maker" }),
        );
      }
      return Promise.resolve(jsonResponse({}));
    });
  vi.stubGlobal("fetch", fetch);
  function ReadyProfile() {
    return <EditProfile />;
  }
  // The provider resolves before this gated child renders, matching the application router.
  const { useSession } = await import("../app/session");
  function Gate() {
    const member = useSession().session?.member;
    return member ? (
      <>
        <output aria-label="Saved avatar">{member.avatar_key}</output>
        <ReadyProfile />
      </>
    ) : null;
  }
  renderApp(
    <SessionProvider>
      <Gate />
    </SessionProvider>,
  );
  const character = await screen.findByRole("button", {
    name: "Choose Maker",
  });
  await userEvent.click(character);
  expect(character).toHaveAttribute("aria-pressed", "true");
  await userEvent.click(screen.getByRole("button", { name: /Save profile/ }));
  await waitFor(() =>
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/auth/profile"),
      expect.objectContaining({ method: "PATCH" }),
    ),
  );
  const patch = fetch.mock.calls.find(([, init]) => init?.method === "PATCH");
  expect(JSON.parse(patch![1].body)).toMatchObject({
    avatar_key: "maker",
    display_name: "Maya Test",
    area: "Quezon City",
    bio: "Synthetic profile",
  });
  expect(
    await screen.findByText("Your profile was updated."),
  ).toBeInTheDocument();
  expect(screen.getByLabelText("Saved avatar")).toHaveTextContent("maker");
  expect(
    fetch.mock.calls.filter(([url]) => url.endsWith("/auth/session")).length,
  ).toBeGreaterThanOrEqual(2);
});

it("keeps avatar selection available and reports a rejected update without claiming it saved", async () => {
  const fetch = vi
    .fn()
    .mockImplementation((url: string, init?: RequestInit) =>
      Promise.resolve(
        url.endsWith("/auth/session")
          ? jsonResponse(session)
          : init?.method === "PATCH"
            ? jsonResponse(
                { detail: "Profile could not be updated. Please try again." },
                400,
              )
            : jsonResponse({}),
      ),
    );
  vi.stubGlobal("fetch", fetch);
  const { useSession } = await import("../app/session");
  function Gate() {
    return useSession().session?.member ? <EditProfile /> : null;
  }
  renderApp(
    <SessionProvider>
      <Gate />
    </SessionProvider>,
  );
  const choice = await screen.findByRole("button", {
    name: "Choose Navigator",
  });
  await userEvent.click(choice);
  await userEvent.click(screen.getByRole("button", { name: /Save profile/ }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Profile could not be updated",
  );
  expect(choice).toHaveAttribute("aria-pressed", "true");
  expect(
    screen.queryByText("Your profile was updated."),
  ).not.toBeInTheDocument();
});

const catalog = [
  {
    key: "first_chapter",
    name: "First Chapter",
    criteria: "Approved onboarding and a completed literacy module.",
    private: false,
  },
  {
    key: "clockwork",
    name: "Clockwork",
    criteria:
      "Three confirmed on-time installments on an existing loan, with no unresolved reversal.",
    private: false,
  },
  {
    key: "full_circle",
    name: "Full Circle",
    criteria: "A fully settled loan with no pending collection reversal.",
    private: false,
  },
  {
    key: "open_book",
    name: "Open Book",
    criteria:
      "Three completed agreements with complete disclosures and no upheld disclosure finding.",
    private: false,
  },
  {
    key: "helping_hand",
    name: "Helping Hand",
    criteria: "Five distinct moderator-approved educational contributions.",
    private: false,
  },
  {
    key: "fresh_start",
    name: "Fresh Start",
    criteria:
      "Private recognition after completing a mutually agreed recovery arrangement.",
    private: true,
  },
  {
    key: "bright_start",
    name: "Bright Start",
    criteria: "Complete the financial learning check.",
    private: false,
  },
  {
    key: "good_neighbor",
    name: "Good Neighbor",
    criteria: "One approved educational contribution.",
    private: false,
  },
  {
    key: "shared_wisdom",
    name: "Shared Wisdom",
    criteria: "Three approved educational contributions.",
    private: false,
  },
  {
    key: "community_guide",
    name: "Community Guide",
    criteria: "Ten approved educational contributions.",
    private: false,
  },
];

it("shows every server-defined achievement, preserves private milestones and limits the public showcase", async () => {
  const awards = catalog.map((definition, index) => ({
    ...definition,
    id: `award-${index}`,
    eligible: true,
    public: index < 3,
    earned_at: "2026-10-28T00:00:00Z",
  }));
  const fetch = vi
    .fn()
    .mockImplementation(() =>
      Promise.resolve(
        jsonResponse({ awards, catalog, community_level: "Prepared" }),
      ),
    );
  vi.stubGlobal("fetch", fetch);
  renderApp(<AchievementsPage />);
  expect(
    await screen.findByRole("heading", { name: "First Chapter" }),
  ).toBeInTheDocument();
  expect(screen.getByText("10 of 10")).toBeInTheDocument();
  for (const item of catalog)
    expect(screen.getByText(item.criteria)).toBeInTheDocument();
  const choices = screen.getAllByRole("checkbox");
  expect(choices).toHaveLength(9);
  expect(
    choices.filter((choice) => choice.getAttribute("data-state") === "checked"),
  ).toHaveLength(3);
  expect(choices[3]).toBeDisabled();
  expect(
    screen.getByText("Always private. Yours to keep."),
  ).toBeInTheDocument();
  await userEvent.click(choices[0]);
  await userEvent.click(choices[3]);
  await userEvent.click(
    screen.getByRole("button", { name: /Save public showcase/ }),
  );
  await waitFor(() =>
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/community/profile"),
      expect.objectContaining({ method: "PATCH" }),
    ),
  );
  const patch = fetch.mock.calls.find(([, init]) => init?.method === "PATCH");
  expect(JSON.parse(patch![1].body)).toEqual({
    public_award_ids: ["award-1", "award-2", "award-3"],
  });
  expect(
    await screen.findByText("Your public achievement selection was saved."),
  ).toBeInTheDocument();
});

it("removes newly ineligible or private selections after a refetch so the showcase can still save", async () => {
  let responseCatalog = catalog;
  let awards = catalog.map((definition, index) => ({
    ...definition,
    id: `award-${index}`,
    eligible: true,
    public: false,
    earned_at: "2026-10-28T00:00:00Z",
  }));
  const fetch = vi.fn().mockImplementation(() =>
    Promise.resolve(
      jsonResponse({
        awards,
        catalog: responseCatalog,
        community_level: "Prepared",
      }),
    ),
  );
  vi.stubGlobal("fetch", fetch);
  function RefreshAwards() {
    const client = useQueryClient();
    return (
      <Button
        onClick={() => client.invalidateQueries({ queryKey: ["awards"] })}
      >
        Refresh eligibility
      </Button>
    );
  }
  renderApp(
    <>
      <AchievementsPage />
      <RefreshAwards />
    </>,
  );
  await screen.findByRole("heading", { name: "First Chapter" });
  const choices = screen.getAllByRole("checkbox");
  await userEvent.click(choices[0]);
  await userEvent.click(choices[1]);
  await userEvent.click(choices[2]);
  expect(screen.getByText("3 / 3 selected")).toBeInTheDocument();
  awards = awards.map((award) =>
    award.key === "clockwork" ? { ...award, eligible: false } : award,
  );
  // Catalog privacy is authoritative even if a stored award still has private=false.
  responseCatalog = catalog.map((definition) =>
    definition.key === "full_circle"
      ? { ...definition, private: true }
      : definition,
  );
  await userEvent.click(
    screen.getByRole("button", { name: "Refresh eligibility" }),
  );
  expect(await screen.findByText("1 / 3 selected")).toBeInTheDocument();
  expect(screen.getAllByRole("checkbox")).toHaveLength(7);
  await userEvent.click(
    screen.getByRole("button", { name: /Save public showcase/ }),
  );
  expect(
    await screen.findByText("Your public achievement selection was saved."),
  ).toBeInTheDocument();
  const patch = fetch.mock.calls.find(([, init]) => init?.method === "PATCH");
  expect(JSON.parse(patch![1].body)).toEqual({ public_award_ids: ["award-0"] });
});

it("shows unknown achievement keys as missing rather than substituting another badge", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ catalog })));
  renderApp(<BadgeDetail />);
  expect(
    await screen.findByRole("heading", { name: "Achievement not found" }),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("heading", { name: "First Chapter" }),
  ).not.toBeInTheDocument();
});

it("falls back to initials for unknown avatar data rather than rendering an arbitrary asset", () => {
  renderApp(<MemberAvatar name="Maya Test" avatarKey="../../untrusted.svg" />);
  expect(screen.getByText("MT")).toBeInTheDocument();
  expect(screen.queryByRole("img")).not.toBeInTheDocument();
});
