// App Links must additionally be verified by the eventual Android deployment.
// A return link can navigate and trigger a server refresh; it never confirms a payment.
export function safeAppPath(value: string) {
  try {
    const url = new URL(value);
    const origin = String(import.meta.env.VITE_MOBILE_PUBLIC_ORIGIN || "");
    if (
      url.protocol !== "https:" ||
      !origin ||
      url.origin !== new URL(origin).origin ||
      url.username ||
      url.password
    )
      return null;
    const path = url.pathname.replace(/^\/m(?=\/)/, "");
    if (
      !/^\/(?:explore|profile|activity|inbox(?:\/[0-9a-f-]+)?|meetings\/[0-9a-f-]+(?:\/room)?|loans\/[0-9a-f-]+|offers\/[0-9a-f-]+|reset-password\/[0-9a-f-]+|verify-email\/[0-9a-f-]+)$/.test(
        path,
      )
    )
      return null;
    const query = new URLSearchParams();
    if (url.searchParams.get("mode") === "record") query.set("mode", "record");
    return `${path}${query.size ? `?${query}` : ""}${/^\/(reset-password|verify-email)\//.test(path) ? url.hash : ""}`;
  } catch {
    return null;
  }
}
