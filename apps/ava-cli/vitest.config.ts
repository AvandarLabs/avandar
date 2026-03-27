import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import { getAppVitestAliases } from "../../tests/vitestAliases";

const configDir: string = fileURLToPath(new URL(".", import.meta.url));
const rootDir: string = resolve(configDir, "../..");

export default defineConfig({
  test: {
    environment: "node",
  },
  resolve: {
    alias: getAppVitestAliases(rootDir, {
      include: "only-shared",
      selfAlias: "@ava-cli",
      selfSrcDir: resolve(configDir, "src"),
    }),
  },
});
