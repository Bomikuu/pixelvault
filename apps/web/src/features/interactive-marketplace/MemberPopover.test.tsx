import { it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderApp } from "../../test/helpers";
import { MemberPopover } from "./MemberPopover";
import type { Participant } from "./types";
it("renders HTML-shaped public bubbles as text", () => {
  const person = {
    participant_id: "synthetic",
    person: {
      handle: "test",
      display_name: "Synthetic member",
      avatar_key: "",
      photo_url: null,
    },
    bubble: {
      id: "bubble",
      text: "<b>Hello</b>",
      expires_at_ms: Date.now() + 60000,
      offer_id: null,
    },
  } as Participant;
  renderApp(
    <MemberPopover
      person={person}
      offers={[]}
      onClose={vi.fn()}
      onOffer={vi.fn()}
      onReport={vi.fn()}
      onHide={vi.fn()}
    />,
  );
  expect(screen.getByText("<b>Hello</b>")).toBeVisible();
  expect(screen.getByRole("dialog").querySelector("b")).toBeNull();
});
