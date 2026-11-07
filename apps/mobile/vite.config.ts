import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import { fileURLToPath } from "node:url";
export default defineConfig(({ mode }) => {
  const root = fileURLToPath(new URL("../../", import.meta.url));
  return {
    root: fileURLToPath(new URL(".", import.meta.url)),
    envDir: root,
    base: mode === "native" ? "/" : "/m/",
    plugins: [
      {
        name: "mobile-base-redirect",
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (req.url === "/m") {
              res.statusCode = 308;
              res.setHeader("Location", "/m/");
              res.end();
              return;
            }
            next();
          });
        },
      },
      react(),
      tailwindcss(),
      ...(mode === "native"
        ? []
        : [
            VitePWA({
              strategies: "injectManifest",
              srcDir: "src",
              filename: "sw.ts",
              injectRegister: false,
              registerType: "prompt",
              scope: "/m/",
              manifest: {
                id: "/m/",
                name: "PixelVault",
                short_name: "PixelVault",
                description: "Your lending community and shared plans.",
                start_url: "/m/explore",
                scope: "/m/",
                display: "standalone",
                background_color: "#f8fbff",
                theme_color: "#0866ff",
                icons: [
                  {
                    src: "brand/pixelvault-glyph.svg",
                    sizes: "any",
                    type: "image/svg+xml",
                    purpose: "any",
                  },
                ],
              },
              injectManifest: {
                globPatterns: ["**/*.{js,css,woff2,svg,webp,html}"],
                globIgnores: ["**/*1440.webp"],
                maximumFileSizeToCacheInBytes: 3000000,
              },
              devOptions: { enabled: false },
            }),
          ]),
    ],
    resolve: {
      alias: {
        ...(mode === "native"
          ? {
              "virtual:pwa-register": fileURLToPath(
                new URL("./src/platform/native/no-pwa.ts", import.meta.url),
              ),
            }
          : {}),
        "@mobile": fileURLToPath(new URL("./src", import.meta.url)),
        "@pixelvault/ui": fileURLToPath(
          new URL("../../packages/ui/src/index.ts", import.meta.url),
        ),
        "@pixelvault/contracts": fileURLToPath(
          new URL("../../packages/contracts/src/api.ts", import.meta.url),
        ),
        "@pixelvault/api-client": fileURLToPath(
          new URL("../../packages/api-client/src/index.ts", import.meta.url),
        ),
        "@ui": fileURLToPath(new URL("../../packages/ui/src", import.meta.url)),
      },
    },
    server: {
      port: 5185,
      strictPort: true,
      host: "0.0.0.0",
      proxy: {
        "/api": {
          target: process.env.API_PROXY_TARGET || "http://127.0.0.1:8008",
          changeOrigin: true,
        },
      },
    },
  };
});
