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
    globals: false,
  },
});
