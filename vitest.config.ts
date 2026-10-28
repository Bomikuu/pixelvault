import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./apps/web/src", import.meta.url)),
      "@pixelvault/ui": fileURLToPath(
        new URL("./packages/ui/src/index.ts", import.meta.url),
      ),
      "@pixelvault/contracts": fileURLToPath(
        new URL("./packages/contracts/src/api.ts", import.meta.url),
      ),
      "@ui": fileURLToPath(new URL("./packages/ui/src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./apps/web/src/test-setup.ts"],
    include: ["apps/web/src/**/*.test.{ts,tsx}", "packages/**/*.test.{ts,tsx}"],
  },
});
