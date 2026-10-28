/** Use an exported server schema, never silently fetch a guessed production URL. */
import fs from "node:fs";
import { spawnSync } from "node:child_process";
const source = process.argv[2] || "docs/api/openapi.yaml";
if (!fs.existsSync(source)) {
  console.error(
    "Export the DRF OpenAPI schema first, then npm run generate:api -- <schema path>. Explicit browser domain types remain in packages/contracts/src/api.ts.",
  );
  process.exitCode = 1;
} else {
  const result = spawnSync(
    "npx",
    [
      "--no-install",
      "openapi-typescript",
      source,
      "--output",
      "packages/contracts/src/generated.ts",
    ],
    { stdio: "inherit" },
  );
  process.exitCode = result.status ?? 1;
}
