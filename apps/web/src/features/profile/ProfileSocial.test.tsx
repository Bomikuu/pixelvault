import { useState } from "react";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import type { Profile } from "@pixelvault/contracts";
import { MemberAvatar, PersonName } from "../../components";
import { EditProfile, InboxPage } from "../CommunityPages";
import { LoanRow } from "../WorkspacePages";
import { jsonResponse, renderApp, session } from "../../test/helpers";
import { ProfileNavigation } from "./ProfileNavigation";
import { ProfilePhotoPicker } from "./ProfilePhotoPicker";
import {
  PrivateProfileSetup,
  ProfileXpProgress,
  RecommendationSummary,
} from "./ProfileProgress";

const state = vi.hoisted(() => ({
  profile: {} as Record<string, unknown>,
  refresh: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../../app/session", () => ({
  useSession: () => ({
    session: {
      ...session,
      member: { ...session.member, avatar_key: "maker", ...state.profile },
    },
    refresh: state.refresh,
  }),
}));
afterEach(() => {
  vi.unstubAllGlobals();
  state.profile = {};
  vi.clearAllMocks();
});
const photo = "/api/v1/community/photos/a4240116-a682-4123-aa56-e95870b19a17";
const profile: Profile = {
  id: "maya",
  handle: "maya",
  display_name: "Maya",
  avatar_key: "maker",
  photo_url: photo,
  area: "Quezon City",
  bio: "Fictional profile",
  community_level: "Prepared",
  badges: [],
  reviews: [],
  reputation: {
    points: 150,
    level: "Prepared",
    frame: "blue",
    flair: null,
    show_points: true,
  },
  xp_progress: {
    current_level: "Prepared",
    current_level_points: 100,
    next_level: "Contributor",
    next_level_points: 250,
    points_in_level: 50,
    points_to_next: 100,
    progress_percent: 33,
  },
};

it("keeps profile navigation active and supports keyboard focus without inventing tab-panel semantics", async () => {
  renderApp(<ProfileNavigation />, { route: "/profile/edit" });
  const navigation = screen.getByRole("navigation", {
    name: "Profile settings",
  });
  const links = within(navigation).getAllByRole("link");
  expect(
    within(navigation).getByRole("link", { name: "Edit profile" }),
  ).toHaveAttribute("aria-current", "page");
  expect(
    within(navigation).getByRole("link", { name: "Private contacts" }),
  ).toHaveAttribute("href", "/profile/contacts");
  expect(
    within(navigation).getByRole("link", { name: "Co-borrowers" }),
  ).toHaveAttribute("href", "/profile/co-borrowers");
  links[0].focus();
  await userEvent.keyboard("{ArrowRight}");
  expect(links[1]).toHaveFocus();
  await userEvent.keyboard("{End}");
  expect(links.at(-1)).toHaveFocus();
  await userEvent.keyboard("{Home}");
  expect(links[0]).toHaveFocus();
});

it("shows a validated profile image and falls back to the selected vector after a load failure", () => {
  renderApp(
    <MemberAvatar name="Maya" avatarKey="maker" photoUrl={photo} size={120} />,
  );
  const image = screen.getByRole("img", { name: "Maya’s profile photo" });
  expect(image).toHaveAttribute("src", photo);
  fireEvent.error(image);
  expect(
    screen.queryByRole("img", { name: "Maya’s profile photo" }),
  ).not.toBeInTheDocument();
  expect(
    screen.getByRole("img", { name: "Maya’s chosen avatar" }),
  ).toBeInTheDocument();
});

it("rejects arbitrary image URLs and private document URLs in identity data", () => {
  const { rerender } = renderApp(
    <MemberAvatar
      name="Maya"
      avatarKey="maker"
      photoUrl="https://untrusted.example/photo.jpg"
    />,
  );
  expect(screen.queryByAltText("Maya’s profile photo")).not.toBeInTheDocument();
  rerender(
    <MemberAvatar
      name="Maya"
      avatarKey="maker"
      photoUrl="/api/v1/documents/private-file/content"
    />,
  );
  expect(screen.queryByAltText("Maya’s profile photo")).not.toBeInTheDocument();
});

it("uses the same uploaded picture in shared person identities", () => {
  renderApp(
    <PersonName
      person={{
        id: "maya",
        handle: "maya",
        display_name: "Maya",
        avatar_key: "maker",
        photo_url: photo,
      }}
      subtitle="Borrower"
    />,
  );
  expect(screen.getByAltText("Maya’s profile photo")).toHaveAttribute(
    "src",
    photo,
  );
  expect(screen.getByRole("link", { name: "Maya" })).toHaveAttribute(
    "href",
    "/members/maya",
  );
});

it("keeps an uploaded photo selected when editing profile text and switches only after choosing an avatar", async () => {
  state.profile = {
    photo_mode: "photo",
    has_photo: true,
    photo_url: photo,
    stored_photo_url: photo,
  };
  const fetch = vi
    .fn()
    .mockImplementation(() => Promise.resolve(jsonResponse({})));
  vi.stubGlobal("fetch", fetch);
  renderApp(<EditProfile />);
  await userEvent.click(screen.getByRole("button", { name: "Save profile" }));
  await screen.findByText("Your profile was updated.");
  const patches = () =>
    fetch.mock.calls.filter(([, options]) => options?.method === "PATCH");
  expect(JSON.parse(patches()[0][1].body).photo_mode).toBe("photo");
  await userEvent.click(screen.getByRole("button", { name: "Choose Reader" }));
  await userEvent.click(screen.getByRole("button", { name: "Save profile" }));
  await waitFor(() => expect(patches()).toHaveLength(2));
  expect(JSON.parse(patches()[1][1].body)).toMatchObject({
    photo_mode: "avatar",
    avatar_key: "reader",
  });
});

it("uses uploaded pictures in private loan and inbox identity rows", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        jsonResponse({
          threads: [
            {
              id: "thread",
              other_display_name: "Elias",
              other_avatar_key: "maker",
              other_photo_url: photo,
              latest_at: "2026-10-28T00:00:00Z",
            },
          ],
        }),
      ),
  );
  renderApp(
    <>
      <LoanRow
        loan={{
          id: "loan",
          status: "active",
          principal_balance: 100,
          accrued_interest: 0,
          projected_interest: 0,
          total_due: 100,
          next_due_date: null,
          settlement_status: "unknown",
          disbursement_status: "confirmed",
          schedule: [],
          terms: {
            principal: 100,
            annual_rate_bps: 100,
            frequency: "monthly",
            installment_count: 1,
            effective_date: "2026-10-28",
          },
          agreement_id: "agreement",
          lender: { id: "elias", display_name: "Elias", photo_url: photo },
          borrower: {
            id: session.member.id,
            display_name: session.member.display_name,
          },
          test_mode: true,
        }}
      />
      <InboxPage />
    </>,
  );
  await screen.findByText(/Application conversation/);
  expect(screen.getAllByAltText("Elias’s profile photo")).toHaveLength(2);
});

function PhotoPicker() {
  const [mode, setMode] = useState<"avatar" | "photo">("avatar");
  return <ProfilePhotoPicker mode={mode} onModeChange={setMode} />;
}

function browserFileFormData() {
  // jsdom's native form serializer does not read user-event's FileList shim.
  // Keep the actual selected File when exercising the multipart request.
  const NativeFormData = FormData;
  vi.stubGlobal(
    "FormData",
    class extends NativeFormData {
      constructor(form?: HTMLFormElement) {
        super(form);
        form
          ?.querySelectorAll<HTMLInputElement>('input[type="file"]')
          .forEach((input) => {
            if (input.files?.[0]) this.set(input.name, input.files[0]);
          });
      }
    },
  );
}

it("uploads the actual photo using multipart data and waits for server confirmation", async () => {
  browserFileFormData();
  const fetch = vi.fn().mockImplementation(() => {
    state.profile = {
      has_photo: true,
      photo_mode: "photo",
      photo_url: photo,
      stored_photo_url: photo,
    };
    return Promise.resolve(
      jsonResponse({ ...session.member, ...state.profile }),
    );
  });
  vi.stubGlobal("fetch", fetch);
  renderApp(<PhotoPicker />);
  const file = new File([new Uint8Array([255, 216, 255])], "portrait.jpg", {
    type: "image/jpeg",
  });
  await userEvent.upload(screen.getByLabelText(/Upload a photo/), file);
  const input = screen.getByLabelText(/Upload a photo/) as HTMLInputElement;
  expect(input.files?.[0]).toBe(file);
  fireEvent.submit(input.closest("form")!);
  expect(
    await screen.findByText("Your profile photo was saved."),
  ).toBeInTheDocument();
  const [url, request] = fetch.mock.calls[0];
  expect(url).toBe("/api/v1/auth/profile/photo");
  expect(request.method).toBe("POST");
  expect(request.body).toBeInstanceOf(FormData);
  expect(request.body.get("photo").name).toBe("portrait.jpg");
  expect(request.headers.get("Content-Type")).toBeNull();
  expect(state.refresh).toHaveBeenCalled();
  expect(
    screen.getByRole("button", { name: "Uploaded photo" }),
  ).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByAltText("Maya Test’s profile photo")).toHaveAttribute(
    "src",
    photo,
  );
});

it("preserves a rejected upload as an error and never claims that it saved", async () => {
  browserFileFormData();
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        jsonResponse(
          { detail: "Choose an image at least 128 × 128 pixels." },
          400,
        ),
      ),
  );
  renderApp(<PhotoPicker />);
  await userEvent.upload(
    screen.getByLabelText(/Upload a photo/),
    new File(["not-a-large-image"], "small.png", { type: "image/png" }),
  );
  fireEvent.submit(screen.getByLabelText(/Upload a photo/).closest("form")!);
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "at least 128 × 128",
  );
  expect(
    screen.queryByText("Your profile photo was saved."),
  ).not.toBeInTheDocument();
  expect(state.refresh).not.toHaveBeenCalled();
});

it("removes an owned stored photo through its dedicated endpoint", async () => {
  state.profile = {
    has_photo: true,
    photo_mode: "photo",
    photo_url: photo,
    stored_photo_url: photo,
  };
  const fetch = vi.fn().mockImplementation(() => {
    state.profile = {
      has_photo: false,
      photo_mode: "avatar",
      photo_url: null,
      stored_photo_url: null,
    };
    return Promise.resolve(
      jsonResponse({ ...session.member, ...state.profile }),
    );
  });
  vi.stubGlobal("fetch", fetch);
  renderApp(<PhotoPicker />);
  await userEvent.click(
    screen.getByRole("button", { name: "Remove uploaded photo" }),
  );
  expect(
    await screen.findByText(/Your uploaded photo was removed/),
  ).toBeInTheDocument();
  expect(fetch).toHaveBeenCalledWith(
    "/api/v1/auth/profile/photo",
    expect.objectContaining({ method: "DELETE" }),
  );
});

it("uses server XP progress and hides all numeric progress when the member keeps it private", () => {
  const { unmount } = renderApp(<ProfileXpProgress profile={profile} />);
  expect(
    screen.getByRole("progressbar", { name: "Progress toward Contributor" }),
  ).toHaveValue(33);
  expect(screen.getByText("100 XP to Contributor")).toBeInTheDocument();
  unmount();
  renderApp(
    <ProfileXpProgress
      profile={{
        ...profile,
        reputation: { ...profile.reputation!, points: 0, show_points: false },
        xp_progress: {
          ...profile.xp_progress!,
          progress_percent: null,
          points_to_next: null,
        },
      }}
    />,
  );
  expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  expect(screen.getByText("XP progress is private.")).toBeInTheDocument();
  expect(screen.queryByText(/100 XP to Contributor/)).not.toBeInTheDocument();
});

it("shows the own-only setup checklist separately from XP and uses actual moderated recommendation counts", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      jsonResponse({
        setup_completeness: {
          completed: 2,
          total: 4,
          percent: 50,
          steps: [
            {
              key: "contacts",
              label: "Add private contact details",
              complete: false,
              href: "/profile/contacts",
            },
          ],
        },
      }),
    ),
  );
  renderApp(
    <>
      <PrivateProfileSetup />
      <RecommendationSummary summary={{ up: 3, down: 1, total: 4 }} />
    </>,
  );
  expect(await screen.findByText("2 of 4 complete")).toBeInTheDocument();
  expect(
    screen.getByRole("progressbar", { name: "Profile setup completion" }),
  ).toHaveValue(50);
  expect(
    screen.getByRole("link", { name: "Add private contact details" }),
  ).toHaveAttribute("href", "/profile/contacts");
  expect(
    screen.getByText(/Setup progress is separate from community XP/),
  ).toBeInTheDocument();
  const summary = screen.getByLabelText(
    "Published transaction review recommendations",
  );
  expect(summary).toHaveTextContent("3 recommend");
  expect(summary).toHaveTextContent("1 do not recommend");
  expect(summary).toHaveTextContent("published, moderated transaction reviews");
});
