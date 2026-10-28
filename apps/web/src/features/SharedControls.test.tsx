import { readFileSync } from "node:fs";
import { render, screen } from "@testing-library/react";
import { ArrowRight } from "lucide-react";
import { afterEach, expect, it } from "vitest";
import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@pixelvault/ui";

const tokens = Object.fromEntries(
  [
    ...readFileSync("packages/ui/src/styles/tokens.css", "utf8").matchAll(
      /(--[a-z0-9-]+):\s*([^;]+);/g,
    ),
  ].map((match) => [match[1], match[2]]),
);
const css = readFileSync("packages/ui/src/styles/controls.css", "utf8").replace(
  /var\((--[a-z0-9-]+)\)/g,
  (_, token) => tokens[token] || "initial",
);
afterEach(() =>
  document
    .querySelectorAll("style[data-controls-test]")
    .forEach((style) => style.remove()),
);

it("keeps primary action links readable and padded when an unlayered anchor reset follows the canonical styles", () => {
  const style = document.createElement("style");
  style.dataset.controlsTest = "true";
  const reset = readFileSync("apps/web/src/styles.css", "utf8").match(
    /a:not\(\[data-slot="button"\]\)\s*\{[^}]+\}/,
  )?.[0];
  expect(reset).toBeTruthy();
  style.textContent = `${css}\n${reset} body { color: #0f172a; }`;
  document.head.append(style);
  render(
    <Button asChild>
      <a href="/explore">
        Explore offers <ArrowRight />
      </a>
    </Button>,
  );
  const link = screen.getByRole("link", { name: "Explore offers" });
  const computed = getComputedStyle(link);
  expect(computed.color).toBe("rgb(255, 255, 255)");
  expect(computed.backgroundColor).toBe("rgb(8, 102, 255)");
  expect(computed.paddingLeft).toBe("16px");
  expect(computed.gap).toBe("8px");
  expect(computed.display).toBe("inline-flex");
});

it("gives outline and ghost controls explicit readable foregrounds and preserves disabled semantics", () => {
  const style = document.createElement("style");
  style.dataset.controlsTest = "true";
  style.textContent = css;
  document.head.append(style);
  render(
    <>
      <Button variant="outline">Show details</Button>
      <Button variant="ghost" disabled>
        Unavailable
      </Button>
    </>,
  );
  expect(
    getComputedStyle(screen.getByRole("button", { name: "Show details" }))
      .color,
  ).toBe("rgb(15, 23, 42)");
  const disabled = screen.getByRole("button", { name: "Unavailable" });
  expect(disabled).toBeDisabled();
  expect(getComputedStyle(disabled).color).toBe("rgb(15, 23, 42)");
});

it("centers dialogs once while keeping viewport-safe scrolling available", () => {
  const style = document.createElement("style");
  style.dataset.controlsTest = "true";
  style.textContent = css;
  document.head.append(style);
  render(
    <Dialog open>
      <DialogContent>
        <DialogTitle>Centered explanation</DialogTitle>
        <DialogDescription>
          Information that must stay within the viewport.
        </DialogDescription>
      </DialogContent>
    </Dialog>,
  );
  const dialog = screen.getByRole("dialog", { name: "Centered explanation" });
  // The foundation owns individual translate. A second centering transform
  // or utility translate would move the dialog twice.
  expect(
    [...dialog.classList].some((name) => /^translate-[xy]-/.test(name)),
  ).toBe(false);
  expect(getComputedStyle(dialog).transform).toBe("none");
  expect(getComputedStyle(dialog).translate).toBe("-50% -50%");
  expect(getComputedStyle(dialog).overflowY).toBe("auto");
  expect(getComputedStyle(dialog).maxHeight).toBe("calc(100dvh - 48px)");
});

it("lets community/dashboard labels shrink and wrap inside the compact navigation", () => {
  const appCss = readFileSync("apps/web/src/styles.css", "utf8");
  const switchCss = appCss.match(/\.area-switch\s*\{[^}]+\}/)?.[0];
  const linkCss = appCss.match(/\.area-switch > a\s*\{[^}]+\}/)?.[0];
  const style = document.createElement("style");
  style.dataset.controlsTest = "true";
  style.textContent = `${switchCss}\n${linkCss}`;
  document.head.append(style);
  render(
    <nav
      className="area-switch"
      aria-label="Compact area switch"
      style={{ width: 184 }}
    >
      <a href="/explore">Community</a>
      <a href="/dashboard">My dashboard</a>
    </nav>,
  );
  for (const link of screen
    .getByRole("navigation", { name: "Compact area switch" })
    .querySelectorAll("a")) {
    expect(getComputedStyle(link).minWidth).toBe("0");
    expect(getComputedStyle(link).whiteSpace).toBe("normal");
    expect(getComputedStyle(link).flexBasis).toBe("0px");
  }
});

it("wraps profile section actions onto readable rows on narrow screens", () => {
  const appCss = readFileSync("apps/web/src/styles.css", "utf8");
  const rule = appCss.match(
    /\.profile-layout \.section-heading\s*\{[^}]+\}/,
  )?.[0];
  expect(rule).toBeTruthy();
  const style = document.createElement("style");
  style.dataset.controlsTest = "true";
  // Apply the narrow-screen rule directly: jsdom does not perform responsive
  // viewport layout. The browser pass verifies its actual 320px geometry.
  style.textContent = `.section-heading { display: flex; }\n${rule}`;
  document.head.append(style);
  const { container } = render(
    <div className="profile-layout">
      <div className="section-heading">
        <h2>Achievement showcase</h2>
        <Button variant="outline">About achievements</Button>
        <a href="/profile/badges">Manage showcase</a>
      </div>
    </div>,
  );
  expect(
    getComputedStyle(container.querySelector(".section-heading")!).flexWrap,
  ).toBe("wrap");
});
