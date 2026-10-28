import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
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
});
