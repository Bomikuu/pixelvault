import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import { AuthPage } from "./AuthPages";
import { HowItWorksPage } from "./HowItWorksPage";
import { ErrorPage } from "../app/ErrorPage";
import { routes } from "../app/router";
import { jsonResponse, renderApp } from "../test/helpers";

vi.mock("../app/session", () => ({
  useSession: () => ({
    session: { member: null, environment: "test" },
    loading: false,
    error: null,
    refresh: vi.fn().mockResolvedValue(undefined),
    signOut: vi.fn().mockResolvedValue(undefined),
  }),
}));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it.each([false, true])(
  "places the welcome illustration on the auth screen, including registration=%s",
  (register) => {
    const { container } = renderApp(<AuthPage register={register} />);
    const artwork = container.querySelector(
      'img[src="/illustrations/welcome-community.png"]',
    );
    expect(artwork).toHaveAttribute("alt", "");
    expect(artwork).toHaveAttribute("loading", "eager");
    expect(screen.getByLabelText(/Email address/)).toBeRequired();
    expect(screen.getByLabelText(/Password/)).toBeRequired();
    expect(
      screen.getByRole("link", { name: "See how individual lending works" }),
    ).toHaveAttribute("href", "/how-it-works");
    if (register) expect(screen.getByRole("checkbox")).toBeRequired();
  },
);

it("preserves the test-account sign-in form and CSRF-bearing API request", async () => {
  const fetch = vi.fn().mockResolvedValue(jsonResponse({}));
  vi.stubGlobal("fetch", fetch);
  document.cookie = "csrftoken=illustrated-auth-csrf; path=/";
  renderApp(<AuthPage />);
  await userEvent.click(screen.getByRole("button", { name: "Lender" }));
  await userEvent.click(screen.getByRole("button", { name: /Sign in/ }));
  expect(fetch).toHaveBeenCalledWith(
    "/api/v1/auth/sign-in",
    expect.objectContaining({ method: "POST", credentials: "same-origin" }),
  );
  const request = fetch.mock.calls[0][1];
  expect(JSON.parse(request.body)).toEqual({
    email: "elias@pixelvault.test",
    password: "PixelVaultDemo!2026",
  });
  expect(request.headers.get("X-CSRFToken")).toBeTruthy();
  document.cookie = "csrftoken=; path=/; max-age=0";
});

it("explains the seven-step journey in order with readable financial and privacy boundaries", () => {
  const { container } = renderApp(<HowItWorksPage />);
  const steps = within(screen.getByRole("list")).getAllByRole("listitem");
  expect(steps).toHaveLength(7);
  expect(
    steps.map((step) => within(step).getByRole("heading").textContent),
  ).toEqual([
    "Verify privately.",
    "Compare individual offers.",
    "Understand the full plan.",
    "Apply. The lender chooses.",
    "Accept the same agreement.",
    "Wait for confirmed funding.",
    "Repay privately. Keep your record.",
  ]);
  expect(
    container.querySelector('img[src="/illustrations/lending-journey.png"]'),
  ).toHaveAttribute("alt", "");
  expect(screen.getByText(/No real funds move/)).toBeInTheDocument();
  expect(
    screen.getByText(/takes no platform commission on repayments/),
  ).toHaveTextContent(/one-time platform commission owed by the lender/);
  expect(
    screen.getByText(/takes no platform commission on repayments/),
  ).toHaveTextContent(/Fee payment is recorded separately/);
  expect(
    screen.getByText(/unknown settlement remains unknown/),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: /Read the privacy boundaries/ }),
  ).toHaveAttribute("href", "/help#privacy");
});

function renderRoute(path: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <RouterProvider
        router={createMemoryRouter(routes, { initialEntries: [path] })}
      />
    </QueryClientProvider>,
  );
}

it("makes the infographic public and discoverable in community navigation", async () => {
  renderRoute("/how-it-works");
  expect(
    await screen.findByRole("heading", {
      name: "How PixelVault works.",
    }),
  ).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "How it works" })).toHaveAttribute(
    "href",
    "/how-it-works",
  );
});

it("uses the illustrated not-found page for an unmatched address without inventing a financial outcome", async () => {
  const { container } = renderRoute("/a-page-that-does-not-exist");
  expect(
    await screen.findByRole("heading", {
      name: "Page not found.",
    }),
  ).toBeInTheDocument();
  expect(
    container.querySelector('img[src="/illustrations/finding-your-way.png"]'),
  ).toHaveAttribute("alt", "");
  expect(
    screen.getByRole("link", { name: /Back to the community/ }),
  ).toHaveAttribute("href", "/explore");
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

it("uses the real error boundary without exposing internal error details or claiming a payment result", async () => {
  const privateMessage = "internal payment-route trace: private-record-123";
  vi.spyOn(console, "error").mockImplementation(() => {});
  const router = createMemoryRouter([
    {
      path: "/",
      loader: () => {
        throw new Error(privateMessage);
      },
      element: <p>Should not render</p>,
      errorElement: <ErrorPage />,
    },
  ]);
  const { container } = render(<RouterProvider router={router} />);
  expect(
    await screen.findByRole("heading", { name: "Something went wrong." }),
  ).toBeInTheDocument();
  expect(screen.getByRole("alert")).toHaveTextContent(
    "We couldn’t display this page.",
  );
  expect(
    screen.getByText(/does not confirm whether it succeeded/),
  ).toBeInTheDocument();
  expect(screen.queryByText(privateMessage)).not.toBeInTheDocument();
  expect(
    container.querySelector('img[src="/illustrations/finding-your-way.png"]'),
  ).toBeInTheDocument();
});
