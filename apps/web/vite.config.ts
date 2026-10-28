import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
import { publicMapboxToken } from "./mapbox-config";
export default defineConfig(({ mode }) => {
  const envDir = fileURLToPath(new URL("../../", import.meta.url));
  publicMapboxToken(loadEnv(mode, envDir, "VITE_").VITE_MAPBOX_ACCESS_TOKEN);
  return {
    root: fileURLToPath(new URL(".", import.meta.url)),
    envDir,
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
        "@pixelvault/ui": fileURLToPath(
          new URL("../../packages/ui/src/index.ts", import.meta.url),
        ),
        "@pixelvault/contracts": fileURLToPath(
          new URL("../../packages/contracts/src/api.ts", import.meta.url),
        ),
        "@ui": fileURLToPath(new URL("../../packages/ui/src", import.meta.url)),
      },
    },
    server: {
      port: 5178,
      proxy: {
        "/api": {
          target: process.env.API_PROXY_TARGET || "http://127.0.0.1:8008",
          changeOrigin: true,
        },
      },
    },
  };
});
