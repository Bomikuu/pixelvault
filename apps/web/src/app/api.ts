let csrfToken = "";
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public fields: Record<string, unknown> = {},
  ) {
    super(message);
  }
}
export const setCsrfToken = (token: string) => {
  csrfToken = token;
};
export const operationId = () => crypto.randomUUID();
export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  const method = (init.method ?? "GET").toUpperCase();
  if (init.body && !(init.body instanceof FormData))
    headers.set("Content-Type", "application/json");
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    const cookie = document.cookie.match(/(?:^|; )csrftoken=([^;]+)/)?.[1];
    headers.set("X-CSRFToken", csrfToken || decodeURIComponent(cookie || ""));
  }
  headers.set("Accept", "application/json");
  let response: Response;
  try {
    response = await fetch(path.startsWith("/api/") ? path : `/api/v1${path}`, {
      ...init,
      credentials: "same-origin",
      headers,
    });
  } catch {
    throw new ApiError(
      0,
      "We could not reach PixelVault. Check your connection and try again.",
    );
  }
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = json.detail ?? json.error ?? json.message;
    throw new ApiError(
      response.status,
      typeof detail === "string"
        ? detail
        : response.status === 403
          ? "This action is not permitted for this account."
          : response.status === 404
            ? "This record is unavailable or you do not have access."
            : "Please check the information and try again.",
      json,
    );
  }
  return json as T;
}
export function post<T>(path: string, data: unknown) {
  return apiRequest<T>(path, { method: "POST", body: JSON.stringify(data) });
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
