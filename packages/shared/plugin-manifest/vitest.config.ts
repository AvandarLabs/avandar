import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import { getAppVitestAliases } from "../../../tests/vitestAliases.ts";

const repoRootDir: string = resolve(
  fileURLToPath(new URL(".", import.meta.url)),
  "../../..",
);

export default defineConfig({
  resolve: {
    alias: getAppVitestAliases({
      repoRootDir,
      include: ["shared"],
    }),
  },
  test: {
    environment: "node",
  },
});
