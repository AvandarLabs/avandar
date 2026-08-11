import { defineConfig } from "tsup";

export default defineConfig({
  // One entry per declared `exports` subpath.
  entry: {
    index: "src/index.ts",
  },
  tsconfig: "tsconfig.build.json",
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  target: "es2022",
  outDir: "dist",
});
