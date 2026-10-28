import { afterEach, describe, expect, it, vi } from "vitest";
import { apiRequest, ApiError, items, setCsrfToken } from "./api";
import { jsonResponse } from "../test/helpers";
afterEach(() => {
  vi.unstubAllGlobals();
  setCsrfToken("");
});
describe("same-origin session API boundary", () => {
  it("sends authoritative session CSRF token and credentials on mutation", async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse({ id: "saved" }));
    vi.stubGlobal("fetch", fetch);
    setCsrfToken("server-token");
    await apiRequest("/offers", {
      method: "POST",
      body: JSON.stringify({ title: "Test" }),
    });
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe("/api/v1/offers");
    expect(init.credentials).toBe("same-origin");
    expect(init.headers.get("X-CSRFToken")).toBe("server-token");
    expect(init.headers.get("Content-Type")).toBe("application/json");
  });
  it("does not replace multipart boundary with JSON", async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse({ id: "doc" }));
    vi.stubGlobal("fetch", fetch);
    const data = new FormData();
    data.append("file", new Blob(["fixture"]), "fixture.txt");
    await apiRequest("/documents/upload", { method: "POST", body: data });
    expect(fetch.mock.calls[0][1].headers.has("Content-Type")).toBe(false);
  });
  it("preserves safe permission errors and never fabricates success", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          jsonResponse({ detail: "This record is private." }, 403),
        ),
    );
    await expect(apiRequest("/documents/other/download")).rejects.toMatchObject(
      { status: 403, message: "This record is private." },
    );
  });
  it("provides a recoverable message after network interruption", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Network")));
    await expect(apiRequest("/loans")).rejects.toBeInstanceOf(ApiError);
  });
  it("accepts explicit list envelopes without exposing arbitrary object values", () => {
    expect(items({ documents: [{ id: "one" }] }, "documents")).toHaveLength(1);
    expect(items({ secret: ["private"] }, "documents")).toEqual([]);
  });
});
