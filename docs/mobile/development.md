# Phone development without a second backend

The phone interface lives in `apps/mobile` in this repository. It shares Django, accounts, contracts, canonical controls, tokens and illustration sources; its screen composition and navigation are independent of `apps/web`.

After the existing API/workers are running:

```sh
npm ci --ignore-scripts
npm run assets:mobile
npm run dev:mobile -- --host 127.0.0.1
```

Open [phone preview](http://127.0.0.1:5185/m/explore). Port **5185** is fixed because 5178–5184 were already occupied by existing web previews. The Vite proxy uses the existing API at 8008. Override only the proxy with `API_PROXY_TARGET` when necessary; do not start another Django instance for phone styling. Normal web development keeps its own Vite process and route composition.

Stop a foreground phone Vite process with Ctrl+C. Start it again with `npm run dev:mobile`. Keep the API/worker processes running when web still needs them; stop those using the project’s existing service workflow. Don’t kill every Node process to stop one preview. `ss -ltnp` identifies listeners if a port is occupied.

Use a browser viewport for daily styling. A physical phone can use a trusted HTTPS development endpoint or explicit USB forwarding when needed; camera/mic and modern browser crypto require a secure context. No emulator, Android Studio session or native build is required for ordinary UI editing.

The browser/PWA path is `/m/`; deployment must redirect `/m` to `/m/`, serve the static mobile shell for `/m/*` application routes, and proxy `/api/*` to Django. `apps/web` retains its root routes. Public illustration delivery is recreated from `scripts/mobile-assets.json`; do not copy the whole web public directory. Preserve original assets and provenance.

PWA source uses Vite PWA’s [injectManifest strategy](https://vite-pwa-org.netlify.app/guide/inject-manifest) and [explicit update prompt](https://vite-pwa-org.netlify.app/guide/prompt-for-update.html). Only bundled shell scripts/styles, fonts, icons and selected public art are precached. API responses, messages, private photos/files, signed grants and mutations are excluded. No offline write queue exists. An installed worker/output has not been verified because application builds are deferred.

Full analytics, operational/admin work and the staff reference stay on web. Native delivery is fail-closed until [Android compatibility](android-compatibility.md) is proven. No native project, APK, signing key or store release was generated.
