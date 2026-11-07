import { ApiError, type Transport } from "@pixelvault/api-client";
// The release gate deliberately fails closed until a physical-device session,
// CSRF, multipart and authorized-file probe establishes the chosen transport.
// This is not a native cookie implementation and must not silently fall back.
export const nativeTransport: Transport = async () => {
  throw new ApiError(
    503,
    "Native authenticated transport is pending device validation. Use the browser/PWA interface.",
  );
};
