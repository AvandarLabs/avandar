import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import { getAppVitestAliases } from "../../../tests/vitestAliases.ts";

const configDir: string = fileURLToPath(new URL(".", import.meta.url));
const rootDir: string = resolve(configDir, "../../..");

export default defineConfig({
  resolve: {
    alias: getAppVitestAliases(rootDir, {
      include: "only-shared",
      selfAlias: "@utils",
      selfSrcDir: resolve(configDir, "src"),
    }),
  },
  test: {
    environment: "node",
  },
});
