import { createApiClient } from "@pixelvault/api-client";
import { Capacitor } from "@capacitor/core";
import { nativeTransport } from "../platform/native/transport";
export { ApiError, operationId, items } from "@pixelvault/api-client";
export const client = createApiClient({
  ...(Capacitor.isNativePlatform() ? { transport: nativeTransport } : {}),
  onSessionExpired: () => window.dispatchEvent(new Event("pixelvault:resume")),
});
export const api = client.apiRequest;
export const post = client.post;
export async function saveFile(path: string) {
  const { blob, filename } = await client.download(path);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
