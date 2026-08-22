import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import { getAppVitestAliases } from "../../tests/vitestAliases";

const repoRootDir: string = resolve(
  fileURLToPath(new URL(".", import.meta.url)),
  "../..",
);

export default defineConfig({
  resolve: {
    alias: {
      ...getAppVitestAliases({
        repoRootDir,
        include: ["shared"],
        moreAliases: {
          "@pipeline-server": "apps/pipeline-server/src",
          "@pipelines": "apps/pipeline-server/pipelines",
        },
      }),
    },
  },
  test: {
    environment: "node",
  },
});
