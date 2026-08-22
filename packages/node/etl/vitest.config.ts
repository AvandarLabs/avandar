import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import { getAppVitestAliases } from "../../../tests/vitestAliases";

const repoRootDir: string = resolve(
  fileURLToPath(new URL(".", import.meta.url)),
  "../../..",
);

export default defineConfig({
  test: {
    environment: "node",
  },
  resolve: {
    alias: getAppVitestAliases({
      repoRootDir,
      include: ["shared", "node"],
    }),
  },
});
