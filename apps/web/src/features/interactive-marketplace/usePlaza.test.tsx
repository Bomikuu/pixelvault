import { it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { usePlaza } from "./usePlaza";
import type { ReactNode } from "react";
vi.mock("./api", () => ({
  fetchRooms: vi.fn().mockResolvedValue({ rooms: [] }),
  fetchSnapshot: vi.fn(),
  joinRoom: vi.fn(),
  sendCommand: vi.fn(),
  reportBubble: vi.fn(),
}));
it("renders a guest with a null record without reading private data", () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const { result, unmount } = renderHook(() => usePlaza(), { wrapper });
  expect(result.current.snapshot).toBeNull();
  expect(result.current.status).toBe("choosing");
  unmount();
});
