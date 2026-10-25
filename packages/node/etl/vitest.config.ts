import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";
import { getAppVitestAliases } from "../../../tests/vitestAliases";

const repoRootDir: string = resolve(
  fileURLToPath(new URL(".", import.meta.url)),
  "../../..",
);

export default defineConfig({
  test: {
    environment: "node",
    exclude: [...configDefaults.exclude, "src/**/*.supabase.test.ts"],
  },
  resolve: {
    alias: getAppVitestAliases({
      repoRootDir,
      include: ["shared", "node"],
    }),
  },
});
