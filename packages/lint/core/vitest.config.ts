import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globalSetup: ["./test/coverage/__tests__/publicPackages.setup.ts"],
  },
});
