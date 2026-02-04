import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const configDir: string = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      $: resolve(configDir, "../../shared"),
    },
  },
  test: {
    environment: "node",
  },
});
