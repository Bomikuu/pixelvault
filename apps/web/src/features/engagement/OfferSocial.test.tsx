import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { OfferSocial } from "./OfferSocial";
import { SessionProvider, useSession } from "../../app/session";
import { renderApp, jsonResponse, session } from "../../test/helpers";
const badge = { id: "earned-1", key: "bright_start", name: "Bright Start" };
function Gate() {
  return useSession().session?.member ? (
    <OfferSocial offerId="offer-1" />
  ) : null;
}
afterEach(() => vi.unstubAllGlobals());
it("persists like state and offers only server-returned eligible achievement choices", async () => {
  let liked = false;
  const fetch = vi
    .fn()
    .mockImplementation((url: string, init?: RequestInit) => {
      if (url.endsWith("/auth/session"))
        return Promise.resolve(jsonResponse(session));
      if (url.endsWith("/like") && init?.method === "PUT")
        liked = JSON.parse(init.body as string).liked;
      return Promise.resolve(
        jsonResponse({
          offer_id: "offer-1",
          likes: { count: liked ? 1 : 0, liked },
          reactions: [],
          my_reaction: null,
          reaction_choices: [badge],
          comments: [],
          comments_next_cursor: null,
        }),
      );
    });
  vi.stubGlobal("fetch", fetch);
  renderApp(
    <SessionProvider>
      <Gate />
    </SessionProvider>,
  );
  await userEvent.click(
    await screen.findByRole("button", { name: "Like offer (0 likes)" }),
  );
  expect(
    await screen.findByRole("button", { name: "Unlike offer (1 like)" }),
  ).toHaveAttribute("aria-pressed", "true");
  const reactionTrigger = screen.getByRole("button", {
    name: "React with an achievement",
  });
  reactionTrigger.focus();
  await userEvent.keyboard("{Enter}");
  const popup = await screen.findByRole("dialog", {
    name: "Your shareable achievements",
  });
  expect(popup).toHaveAttribute("data-slot", "popover-content");
  expect(popup.closest(".offer-conversation")).toBeNull();
  await userEvent.keyboard("{Escape}");
  await waitFor(() =>
    expect(
      screen.queryByRole("dialog", { name: "Your shareable achievements" }),
    ).not.toBeInTheDocument(),
  );
  expect(reactionTrigger).toHaveFocus();
  await userEvent.keyboard("{Enter}");
  const choices = screen.getByRole("button", { name: /Bright Start/ });
  expect(screen.queryByText("Fresh Start")).not.toBeInTheDocument();
  choices.focus();
  await userEvent.keyboard("{Enter}");
  await waitFor(() =>
    expect(
      fetch.mock.calls.some(
        ([url, init]) =>
          url.endsWith("/reaction") &&
          JSON.parse(init.body).award_id === "earned-1",
      ),
    ).toBe(true),
  );
  expect(screen.getByText(/do not add XP/)).toBeInTheDocument();
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "React with an achievement" }),
    ).toHaveFocus(),
  );
});
it("submits comments for moderation without pretending they are immediately public", async () => {
  const fetch = vi.fn().mockImplementation((url: string) =>
    Promise.resolve(
      jsonResponse(
        url.endsWith("/auth/session")
          ? session
          : {
              offer_id: "offer-1",
              likes: { count: 0, liked: false },
              reactions: [],
              my_reaction: null,
              reaction_choices: [],
              comments: [],
              comments_next_cursor: null,
            },
      ),
    ),
  );
  vi.stubGlobal("fetch", fetch);
  renderApp(
    <SessionProvider>
      <Gate />
    </SessionProvider>,
  );
  await userEvent.type(
    await screen.findByRole("textbox", { name: "Your question or comment" }),
    "Which date is the first payment due?",
  );
  await userEvent.click(
    screen.getByRole("button", { name: /Submit comment for moderation/ }),
  );
  expect(
    await screen.findByText(
      "Your comment is awaiting moderation. Only you can see it until approval.",
    ),
  ).toBeInTheDocument();
  const comment = fetch.mock.calls.find(
    ([url, init]) => url.endsWith("/comments") && init?.method === "POST",
  );
  expect(JSON.parse(comment![1].body)).toMatchObject({
    body: "Which date is the first payment due?",
    operation_id: expect.any(String),
  });
});
