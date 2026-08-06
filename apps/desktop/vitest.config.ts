import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      $: fileURLToPath(new URL("../../shared", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: [
      "main/**/*.test.ts",
      "preload/**/*.test.ts",
      "sync/**/*.test.ts",
      "scripts/**/*.test.ts",
    ],
    // Integration tests use `bun:sqlite`, native subprocess spawns, and
    // other Bun-only primitives, so they run under `bun test` (see
    // `test:integration` script). They live next to the unit tests with
    // an `.integration.test.ts` suffix; vitest must skip them or it
    // errors trying to resolve `bun:*` imports.
    exclude: ["**/*.integration.test.ts", "**/node_modules/**"],
    globals: false,
  },
});
