import { it, expect, vi } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderApp } from "../../test/helpers";
import { BubbleComposer } from "./BubbleComposer";
it("retains public text after an uncertain response", async () => {
  const post = vi.fn().mockRejectedValue(new Error("Temporarily unavailable"));
  renderApp(
    <BubbleComposer
      enabled
      offers={[]}
      hasBubble={false}
      onPost={post}
      onClear={vi.fn()}
    />,
  );
  fireEvent.change(screen.getByLabelText("Your public bubble"), {
    target: { value: "<b>Hello</b>" },
  });
  fireEvent.submit(
    screen.getByRole("form", { name: "Post a public speech bubble" }),
  );
  await screen.findByText("Temporarily unavailable");
  expect(screen.getByLabelText("Your public bubble")).toHaveValue(
    "<b>Hello</b>",
  );
  expect(post).toHaveBeenCalledWith("<b>Hello</b>", null);
});
it("counts Unicode points rather than surrogate halves", () => {
  renderApp(
    <BubbleComposer
      enabled
      offers={[]}
      hasBubble={false}
      onPost={vi.fn()}
      onClear={vi.fn()}
    />,
  );
  fireEvent.change(screen.getByLabelText("Your public bubble"), {
    target: { value: "😀".repeat(120) },
  });
  expect(screen.getByText("120/120")).toBeVisible();
  expect(screen.getByRole("button", { name: "Post bubble" })).toBeEnabled();
});
