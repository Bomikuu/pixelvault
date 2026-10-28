import { screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { ApiForm, Field } from "../components";
import { renderApp } from "../test/helpers";
import { BadgeShelf } from "./CommunityPages";
it("reuses the logical financial operation after an uncertain failure", async () => {
  const operations: string[] = [];
  let attempts = 0;
  renderApp(
    <ApiForm
      onSubmit={async (data) => {
        operations.push(String(data.get("operation_id")));
        attempts++;
        if (attempts === 1)
          throw new Error(
            "Outcome uncertain. Try again with the same operation.",
          );
      }}
      submitLabel="Confirm payment"
      successMessage="Confirmed"
    >
      <Field name="amount" label="Amount" type="number" defaultValue={100} />
    </ApiForm>,
  );
  await userEvent.click(
    screen.getByRole("button", { name: "Confirm payment" }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Outcome uncertain",
  );
  await userEvent.click(
    screen.getByRole("button", { name: "Confirm payment" }),
  );
  expect(await screen.findByText("Confirmed")).toBeInTheDocument();
  expect(operations[0]).toBe(operations[1]);
  expect(operations[0]).toMatch(/^[0-9a-f-]{36}$/);
});
it("renders badge accessible names and earning dates as explicit content", () => {
  renderApp(
    <BadgeShelf
      awards={[
        {
          id: "award",
          key: "first_chapter",
          name: "First Chapter",
          earned_at: "2026-10-28",
        },
      ]}
    />,
  );
  expect(
    screen.getByRole("img", { name: "First Chapter" }),
  ).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /First Chapter/ })).toHaveAttribute(
    "href",
    "/badges/first_chapter",
  );
  expect(screen.getByText("Oct 28, 2026")).toBeInTheDocument();
});
