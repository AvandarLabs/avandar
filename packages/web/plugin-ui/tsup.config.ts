import { defineConfig } from "tsup";

export default defineConfig({
  // One entry per declared `exports` subpath.
  entry: { index: "src/index.ts", charts: "src/charts.ts" },
  tsconfig: "tsconfig.build.json",
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  target: "es2022",
  outDir: "dist",
  external: ["react", "@mantine/core", "recharts"],
});
