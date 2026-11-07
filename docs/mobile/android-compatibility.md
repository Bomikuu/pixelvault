# Android compatibility gate

Status: **not verified; authenticated native delivery is blocked**. The browser/PWA interface is the usable preview. Capacitor source configuration and pinned packages are preparation only. The native transport deliberately refuses requests rather than pretending that browser cookies, multipart files or EventSource work inside the WebView.

Prepared versions: Capacitor core/CLI/Android 8.6.0, App 8.1.2, Network 8.0.1 and Browser 8.0.5. No emulator/SDK or generated Android project is installed by this work. Configuration uses bundled `dist`, HTTPS Android scheme, no live-reload server URL, no cleartext/mixed content and no global native HTTP interception. Native mode registers no PWA worker. Native call/device-preview controls remain hidden.

The [Capacitor configuration reference](https://capacitorjs.com/docs/config) governs eventual container setup. Do not add trusted native origins, change cookie flags or weaken CSRF/CORS before an explicit transport design and measured device result.

Before enabling native authentication, record a physical device, OS and app build, then prove each of these with synthetic accounts:

- Bootstrap cookie ownership and CSRF token; sign-in rotation; authenticated fetch; process restart; expiry; sign-out; recovery/session revocation; rejected missing/invalid-CSRF mutation. Keep credentials out of logs and durable JS storage.
- Cancellable, bounded multipart photo/evidence uploads and actor-authorized binary downloads with correct filenames. No large base64 bridge as a fallback. Recheck revoked/grant-expired resources.
- Safe areas, keyboard, system Back, background/resume private-cache clearing, offline recovery and no queued financial write. Native foreground updates use REST polling until the event/cookie bridge is independently proven.
- Verified deployment App Links and exact allowed HTTPS origin. `safeAppPath` is only a client allowlist, not domain verification. Return links navigate/refetch; they never accept a contract or mark a payment settled.
- Explicit media permission, denial, late promise, background/leave cleanup and a separately reviewed foreground call path before exposing media controls. Background calls remain deferred.

Only after those checks and explicit packaging authorization should the generated Android project be added, synced and built. If session/privacy guarantees fail, retain browser/PWA delivery and design a standards-based native authentication flow. iOS, signing credentials and store publication remain separate work.
