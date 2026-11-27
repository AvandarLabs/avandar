import { defineConfig } from "vitest/config";

/** Runs package tests in the Node environment. */
export default defineConfig({
  test: { environment: "node", passWithNoTests: true },
});
