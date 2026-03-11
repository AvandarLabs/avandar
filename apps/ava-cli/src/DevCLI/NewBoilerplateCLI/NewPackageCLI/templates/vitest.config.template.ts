import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const configDir: string = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
  },
  resolve: {
    alias: {
      "@utils": resolve(configDir, "../utils/src"),
      "@modules": resolve(configDir, "../modules/src"),
    },
  },
});
