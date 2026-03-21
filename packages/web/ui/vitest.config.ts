import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const configDir = fileURLToPath(new URL(".", import.meta.url));
const rootDir = resolve(configDir, "../../..");

export default defineConfig({
  resolve: {
    alias: {
      "@utils": resolve(rootDir, "packages/shared/utils/src"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: [resolve(rootDir, "tests/vitest.setup.ts")],
  },
});
