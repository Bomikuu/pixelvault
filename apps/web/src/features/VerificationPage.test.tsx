import { screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { VerificationPage } from "./VerificationPages";
import { renderApp, jsonResponse } from "../test/helpers";
afterEach(() => vi.unstubAllGlobals());
it("labels submitted evidence as pending and never as identity checked", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      jsonResponse({
        cases: [
          { id: "case-1", kind: "identity", status: "submitted", version: 1 },
        ],
        required_checks: ["identity", "income"],
        environment: "test",
      }),
    ),
  );
  renderApp(<VerificationPage />);
  expect(await screen.findByText("Submitted")).toBeInTheDocument();
  expect(screen.queryByText("Identity checked")).not.toBeInTheDocument();
  expect(
    screen.getByText(/Uploading a document is not approval/),
  ).toBeInTheDocument();
  expect(screen.getByLabelText(/Synthetic file/)).toHaveAttribute(
    "accept",
    "application/pdf,image/jpeg,image/png",
  );
});
it("shows server access failure with a recoverable accessible error", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        jsonResponse(
          { detail: "Sign in to review your private evidence." },
          403,
        ),
      ),
  );
  renderApp(<VerificationPage />);
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Sign in to review your private evidence.",
  );
  expect(
    screen.getByRole("button", { name: /Submit for review/ }),
  ).toBeInTheDocument();
});
