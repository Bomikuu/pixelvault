/** Called before Vite transforms any browser source or exposes its environment. */
export function publicMapboxToken(value: unknown): string {
  if (value === undefined || value === null || value === "") return "";
  if (typeof value !== "string" || !value.startsWith("pk.")) {
    throw new Error(
      "Mapbox requires a public pk. browser token. Configuration was not exposed.",
    );
  }
  return value;
}
