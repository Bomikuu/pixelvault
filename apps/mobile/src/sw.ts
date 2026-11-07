/// <reference lib="webworker" />
import {
  cleanupOutdatedCaches,
  matchPrecache,
  precacheAndRoute,
} from "workbox-precaching";
declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: ({ url: string; revision: string | null } | string)[];
};
// Only build-time public assets enter this cache. API calls, documents, photos,
// authenticated HTML and mutations have no runtime cache or background queue.
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") void self.skipWaiting();
});
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (
    event.request.mode === "navigate" &&
    event.request.method === "GET" &&
    url.origin === self.location.origin &&
    url.pathname.startsWith("/m/")
  ) {
    event.respondWith(
      fetch(event.request).catch(
        async () =>
          (await matchPrecache("/m/index.html")) ||
          new Response("Reconnect to open PixelVault.", {
            status: 503,
            headers: { "Content-Type": "text/plain" },
          }),
      ),
    );
  }
});
