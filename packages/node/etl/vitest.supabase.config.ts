import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import { getAppVitestAliases } from "../../../tests/vitestAliases";

const repoRootDir: string = resolve(
  fileURLToPath(new URL(".", import.meta.url)),
  "../../..",
);

/**
 * The integration suite for the Supabase-backed stores. It needs the local,
 * switched Supabase stack, so the default `vitest.config.ts` excludes it.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.supabase.test.ts"],
    setupFiles: ["./vitest.supabase.setup.ts"],
    fileParallelism: false,
  },
  resolve: {
    alias: getAppVitestAliases({
      repoRootDir,
      include: ["shared", "node"],
    }),
  },
});
