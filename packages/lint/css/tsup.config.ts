import { defineConfig } from "tsup";

export default defineConfig({
  entry: { stylelint: "src/stylelint/index.js" },
  tsconfig: "tsconfig.build.json",
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  target: "node24",
  outDir: "dist",
});
