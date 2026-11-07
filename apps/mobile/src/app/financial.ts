import { ApiError, operationId, post } from "./api";
/** Only an operation UUID is retained: never a payload, credential or offline write queue. */
const memory = new Map<string, string>();
export async function financialPost<T>(
  path: string,
  scope: string,
  payload: Record<string, unknown>,
): Promise<T> {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify([scope, payload])),
  );
  const key = `pixelvault.operation.${Array.from(new Uint8Array(bytes), (n) => n.toString(16).padStart(2, "0")).join("")}`;
  let operation: string;
  try {
    operation = sessionStorage.getItem(key) || operationId();
    sessionStorage.setItem(key, operation);
  } catch {
    operation = memory.get(key) || operationId();
    memory.set(key, operation);
  }
  try {
    const result = await post<T>(path, { ...payload, operation_id: operation });
    try {
      sessionStorage.removeItem(key);
    } catch {}
    memory.delete(key);
    return result;
  } catch (error) {
    if (
      error instanceof ApiError &&
      error.status >= 400 &&
      error.status < 500
    ) {
      memory.delete(key);
      try {
        sessionStorage.removeItem(key);
      } catch {}
    }
    throw error;
  }
}
