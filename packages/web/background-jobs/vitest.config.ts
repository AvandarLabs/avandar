import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const repoRootDir: string = resolve(
  fileURLToPath(new URL(".", import.meta.url)),
  "../../..",
);

export default defineConfig({
  resolve: {
    alias: {
      "@background-jobs": resolve(
        repoRootDir,
        "packages/web/background-jobs/src",
      ),
    },
  },
  test: {
    environment: "jsdom",
  },
});
