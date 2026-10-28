import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { TooltipProvider } from "@pixelvault/ui";
export const member = {
  id: "member-1",
  email: "maya@pixelvault.test",
  display_name: "Maya Test",
  area: "Quezon City",
  bio: "Synthetic profile",
  suspended: false,
  literacy_completed: false,
  staff_role: "",
  is_staff: false,
};
export const session = {
  member,
  environment: "test" as const,
  csrf_token: "test-csrf",
};
export const offer = {
  id: "offer-1",
  lender: { id: "lender-1", display_name: "Elias Test", area: "Quezon City" },
  title: "A clear next step",
  area: "Quezon City",
  declared_amount: 1000000,
  available_amount: 800000,
  annual_rate_bps: 1200,
  frequency: "monthly",
  installment_count: 3,
  min_amount: 100000,
  max_amount: 500000,
  status: "published",
  version: 1,
  terms: {
    principal: 300000,
    annual_rate_bps: 1200,
    frequency: "monthly",
    installment_count: 3,
    effective_date: "2026-10-28",
  },
  disclosure: {
    principal: 300000,
    total_interest: 6000,
    total_repayment: 306000,
    schedule: [
      {
        due_date: "2026-11-28",
        principal: 100000,
        interest: 3000,
        total: 103000,
      },
    ],
  },
};
export function renderApp(children: ReactNode, { route = "/" } = {}) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <TooltipProvider>
        <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
      </TooltipProvider>
    </QueryClientProvider>,
  );
}
export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function discoveryEnvelope(offers: (typeof offer)[]) {
  return {
    offers: offers.map((o) => ({
      id: o.id,
      title: o.title,
      lender: { handle: o.lender.id, display_name: o.lender.display_name },
      area: { name: o.area },
      declared_available_amount: String(o.available_amount),
      min_amount: String(o.min_amount),
      max_amount: String(o.max_amount),
      terms: o.terms,
      cost_example: o.disclosure,
    })),
    next_cursor: null,
    cost_sort_available: false,
  };
}
