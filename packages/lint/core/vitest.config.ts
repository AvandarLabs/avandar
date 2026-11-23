import { defineConfig } from "vitest/config";

/** Runs package tests in the Node environment. */
export default defineConfig({
  test: {
    environment: "node",
    globalSetup: ["./src/__tests__/publicPackages.setup.ts"],
  },
});
