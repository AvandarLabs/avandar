import { defineConfig } from "tsup";

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
  external: ["prettier", "readline/promises"],
});
