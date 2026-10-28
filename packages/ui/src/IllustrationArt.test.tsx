import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AVATAR_OPTIONS, AvatarArt } from "./AvatarArt";
import { BADGE_ART_DEFINITIONS, BADGE_ART_KEYS, BadgeArt } from "./BadgeArt";

describe("illustrated achievement and avatar accessibility", () => {
  it("keeps multiple illustrations' texture and portrait clipping references isolated", () => {
    const { container } = render(
      <>
        <BadgeArt name="First Chapter" badgeKey="first_chapter" />
        <BadgeArt
          name="First Chapter, locked"
          badgeKey="first_chapter"
          locked
        />
        <AvatarArt avatarKey="reader" label="Your Reader avatar" />
        <AvatarArt avatarKey="reader" label="Another Reader avatar" />
      </>,
    );
    const ids = [...container.querySelectorAll("[id]")].map(
      (element) => element.id,
    );
    expect(new Set(ids).size).toBe(ids.length);
    for (const element of container.querySelectorAll(
      "[fill^='url('], [clip-path^='url(']",
    )) {
      const reference = (
        element.getAttribute("fill") ?? element.getAttribute("clip-path")
      )?.match(/^url\(#(.+)\)$/)?.[1];
      expect(reference).toBeTruthy();
      expect(ids).toContain(reference);
    }
    expect(
      screen.getByRole("img", { name: "First Chapter, locked" }),
    ).toHaveClass("is-locked");
    expect(
      screen.getByRole("img", { name: "Your Reader avatar" }),
    ).toHaveAttribute("data-avatar-key", "reader");
  });

  it("renders every catalog choice with a stable key and a descriptive accessible name", () => {
    render(
      <>
        {AVATAR_OPTIONS.map((avatar) => (
          <AvatarArt key={avatar.key} avatarKey={avatar.key} />
        ))}
      </>,
    );
    expect(new Set(AVATAR_OPTIONS.map((avatar) => avatar.key)).size).toBe(8);
    for (const avatar of AVATAR_OPTIONS) {
      expect(
        screen.getByRole("img", { name: `${avatar.name} avatar` }),
      ).toHaveAttribute("data-avatar-key", avatar.key);
      expect(avatar.description.length).toBeGreaterThan(15);
    }
  });

  it("exposes all ten named achievements as distinct accessible illustrations", () => {
    render(
      <>
        {BADGE_ART_DEFINITIONS.map(({ key, name }) => (
          <BadgeArt key={key} badgeKey={key} name={name} />
        ))}
      </>,
    );
    expect(BADGE_ART_DEFINITIONS).toHaveLength(10);
    expect(BADGE_ART_DEFINITIONS.map(({ key }) => key)).toEqual(BADGE_ART_KEYS);
    for (const definition of BADGE_ART_DEFINITIONS) {
      expect(
        screen.getByRole("img", { name: definition.name }),
      ).toHaveAttribute("data-badge-key", definition.key);
    }
    const scenes = screen
      .getAllByRole("img")
      .map((art) =>
        [...art.querySelectorAll("path")]
          .map((path) => path.getAttribute("d"))
          .join(" "),
      );
    expect(new Set(scenes).size).toBe(10);
  });

  it("provides safe art for obsolete or untrusted preference values", () => {
    render(
      <>
        <AvatarArt avatarKey="__proto__" />
        <BadgeArt name="Existing milestone" badgeKey="obsolete" index={-1} />
      </>,
    );
    expect(screen.getByRole("img", { name: "Sprout avatar" })).toHaveAttribute(
      "data-avatar-key",
      "sprout",
    );
    expect(
      screen.getByRole("img", { name: "Existing milestone" }),
    ).toHaveAttribute("data-badge-key", BADGE_ART_KEYS.at(-1));
  });
});
