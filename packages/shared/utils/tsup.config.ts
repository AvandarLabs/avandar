import { defineConfig } from "tsup";

export default defineConfig({
  // One entry per declared `exports` subpath.
  entry: {
    index: "src/index.ts",
    encoding: "src/encoding/index.ts",
    sql: "src/sql/index.ts",
    zod: "src/zod/index.ts",
  },
  tsconfig: "tsconfig.build.json",
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  // Shared code between entries goes into a common chunk instead of being
  // duplicated into each one.
  splitting: true,
  treeshake: true,
  target: "es2022",
  outDir: "dist",
});
