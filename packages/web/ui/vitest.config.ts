import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const configDir: string = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: [resolve(configDir, "../../../tests/vitest.setup.ts")],
  },
  resolve: {
    alias: {
      $: resolve(configDir, "../../../shared"),
      "@utils": resolve(configDir, "../../shared/utils/src"),
    },
  },
});
