import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const fromRoot = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      // Same as the "@/*" path in tsconfig.json.
      { find: /^@\//, replacement: fromRoot("./") },
      { find: /^server-only$/, replacement: fromRoot("./test/stubs/server-only.ts") },
    ],
  },
  test: {
    // Unit tests for pure logic only: no network, database or environment variables.
    include: ["{app,core,modules,shared}/**/*.test.ts"],
    environment: "node",
  },
});
