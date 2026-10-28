import { expect, it } from "vitest";
import { publicMapboxToken } from "../../mapbox-config";

it("allows missing configuration and public browser tokens", () => {
  expect(publicMapboxToken(undefined)).toBe("");
  expect(publicMapboxToken("")).toBe("");
  expect(publicMapboxToken("pk.synthetic-browser-token")).toBe(
    "pk.synthetic-browser-token",
  );
});

it.each([
  "sk.synthetic-private-key",
  "placeholder",
  "  sk.synthetic-private-key",
  false,
])(
  "rejects nonpublic credentials before browser transformation without echoing them",
  (value) => {
    let error: Error | undefined;
    try {
      publicMapboxToken(value);
    } catch (caught) {
      error = caught as Error;
    }
    expect(error).toBeInstanceOf(Error);
    expect(error!.message).toContain("public pk.");
    expect(error!.message).not.toContain(String(value));
  },
);
