import { readFileSync } from "node:fs";
import { defineConfig } from "tsup";

// Baked into the bundle so a running `ava` can compare itself against the
// version in apps/ava-cli/package.json and refuse to run when it is stale.
// See src/utils/assertCLIIsUpToDate.
const { version } = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf8"),
) as { version: string };

export default defineConfig({
  entry: ["src/main.ts"],
  tsconfig: "tsconfig.build.json",
  format: ["cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  target: "node18",
  outDir: "dist",
  banner: {
    js: "#!/usr/bin/env node",
  },
  define: {
    __AVA_CLI_VERSION__: JSON.stringify(version),
  },
  // tsup treats every entry in `dependencies` as external, which is wrong for
  // our workspace packages: their `exports` point at `src/*.ts`, since nothing
  // builds them locally. Left external, the bundle emitted
  // `require("@avandar/utils")`, Node loaded that TypeScript source, and every
  // `ava` command died on its internal `@utils/*` aliases. They have to be
  // bundled. `@avandar/acclimate` is a real published package with a real dist,
  // so it stays external.
  noExternal: ["@avandar/utils", "@avandar/models", "@avandar/clients"],
  external: ["prettier", "readline/promises"],
});
