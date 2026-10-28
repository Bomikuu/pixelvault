import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { Shell } from "./Shell";
import { Dashboard } from "../features/WorkspacePages";
import { RequireMember } from "./RequireMember";
import { renderApp, session, jsonResponse } from "../test/helpers";
const state = vi.hoisted(() => ({ suspended: true, isStaff: false }));
vi.mock("./session", () => ({
  useSession: () => ({
    session: {
      ...session,
      member: {
        ...session.member,
        suspended: state.suspended,
        is_staff: state.isStaff,
      },
    },
    loading: false,
    error: null,
    signOut: vi.fn(),
  }),
}));
afterEach(() => vi.unstubAllGlobals());
it("keeps repayment documents and complaint navigation for suspended members", () => {
  renderApp(<Shell />);
  expect(screen.getByText(/New borrowing is restricted/)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Payments" })).toHaveAttribute(
    "href",
    "/payments",
  );
  expect(screen.getByRole("link", { name: "Documents" })).toHaveAttribute(
    "href",
    "/documents",
  );
  expect(screen.getByRole("link", { name: "Contact support" })).toHaveAttribute(
    "href",
    "/cases/new",
  );
});
it("does not render an admin workspace for a member", () => {
  renderApp(
    <RequireMember staff>
      <p>Secret operations</p>
    </RequireMember>,
  );
  expect(screen.getByText("This workspace is restricted")).toBeInTheDocument();
  expect(screen.queryByText("Secret operations")).not.toBeInTheDocument();
});
it("switches borrowing/lending context without inventing available credit", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse([])));
  renderApp(<Dashboard />, { route: "/dashboard" });
  expect(
    await screen.findByText("No borrowed loans to show."),
  ).toBeInTheDocument();
  await userEvent.click(screen.getByRole("tab", { name: "I’m lending" }));
  expect(
    await screen.findByText("No funded loans to show."),
  ).toBeInTheDocument();
  expect(screen.queryByText(/available credit/i)).not.toBeInTheDocument();
});
