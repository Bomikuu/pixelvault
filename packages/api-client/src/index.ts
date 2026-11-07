export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public fields: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "ApiError";
  }
}
export type Transport = (url: string, init: RequestInit) => Promise<Response>;
export const operationId = () => crypto.randomUUID();

export function createApiClient({
  baseUrl = "/api/v1",
  transport = fetch,
  onSessionExpired,
}: {
  baseUrl?: string;
  transport?: Transport;
  onSessionExpired?: () => void;
} = {}) {
  let csrf = "";
  let generation = 0;
  function urlFor(path: string) {
    if (!path.startsWith("/") || path.startsWith("//"))
      throw new Error("Use a PixelVault API path.");
    if (path.startsWith("/api/"))
      return /^https:\/\//.test(baseUrl) ? new URL(path, baseUrl).href : path;
    return `${baseUrl.replace(/\/$/, "")}${path}`;
  }
  async function responseFor(
    path: string,
    init: RequestInit = {},
    binary = false,
  ) {
    const current = generation;
    const method = (init.method || "GET").toUpperCase();
    const headers = new Headers(init.headers);
    if (
      init.body &&
      !(init.body instanceof FormData) &&
      !headers.has("Content-Type")
    )
      headers.set("Content-Type", "application/json");
    if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
      const cookie =
        typeof document === "undefined"
          ? ""
          : document.cookie.match(/(?:^|; )csrftoken=([^;]+)/)?.[1];
      headers.set("X-CSRFToken", csrf || decodeURIComponent(cookie || ""));
    }
    if (!headers.has("Accept"))
      headers.set("Accept", binary ? "*/*" : "application/json");
    let response: Response;
    try {
      response = await transport(urlFor(path), {
        ...init,
        credentials: "same-origin",
        headers,
      });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (error instanceof DOMException && error.name === "AbortError")
        throw error;
      throw new ApiError(
        0,
        "We could not reach PixelVault. Check your connection and try again.",
      );
    }
    if (current !== generation)
      throw new ApiError(
        0,
        "Your session changed. Refresh this page to continue.",
      );
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const detail = body.detail ?? body.error ?? body.message;
      if (
        (response.status === 401 && !path.includes("/auth/sign-in")) ||
        (response.status === 403 &&
          typeof detail === "string" &&
          /authentication credentials were not provided|not authenticated/i.test(
            detail,
          ))
      )
        onSessionExpired?.();
      throw new ApiError(
        response.status,
        typeof detail === "string"
          ? detail
          : response.status >= 500
            ? "PixelVault is temporarily unavailable. Refresh your current record before retrying a change."
            : response.status === 403
              ? "This action is not permitted for this account."
              : response.status === 404
                ? "This record is unavailable or you do not have access."
                : "Please check the information and try again.",
        body,
      );
    }
    return response;
  }
  return {
    async apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
      const current = generation;
      const response = await responseFor(path, init);
      const result =
        response.status === 204
          ? (undefined as T)
          : ((await response.json().catch(() => ({}))) as T);
      if (current !== generation)
        throw new ApiError(
          0,
          "Your session changed. Refresh this page to continue.",
        );
      return result;
    },
    async post<T>(path: string, data: unknown): Promise<T> {
      const current = generation;
      const response = await responseFor(path, {
        method: "POST",
        body: JSON.stringify(data),
      });
      const result = (await response.json().catch(() => ({}))) as T;
      if (current !== generation)
        throw new ApiError(
          0,
          "Your session changed. Refresh this page to continue.",
        );
      return result;
    },
    async download(path: string, init: RequestInit = {}) {
      const current = generation;
      const response = await responseFor(path, init, true);
      const blob = await response.blob();
      if (current !== generation)
        throw new ApiError(
          0,
          "Your session changed. Refresh this page to continue.",
        );
      const disposition = response.headers.get("Content-Disposition") || "";
      const encoded = /filename\*=UTF-8''([^;]+)/i.exec(disposition)?.[1];
      let filename =
        /filename="?([^";]+)"?/.exec(disposition)?.[1] || "pixelvault-document";
      if (encoded) {
        try {
          filename = decodeURIComponent(encoded);
        } catch {}
      }
      filename = filename.replace(/[\\/\x00-\x1f]/g, "-");
      return { blob, filename };
    },
    setCsrfToken(token: string) {
      csrf = token;
    },
    clearSession() {
      csrf = "";
      generation++;
    },
  };
}
export function items<T>(data: unknown, key?: string): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object") {
    const value = data as Record<string, unknown>;
    for (const name of [key, "results", "items"].filter(Boolean) as string[])
      if (Array.isArray(value[name])) return value[name] as T[];
  }
  return [];
}
