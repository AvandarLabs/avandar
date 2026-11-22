import { defineConfig } from "tsup";
import { copyFileSync } from "node:fs";

export default defineConfig({
  entry: {
    catalog: "src/catalog/index.ts",
    coverage: "src/cli/coverage.ts",
    main: "src/cli/main.ts",
    metadata: "src/shared/ruleMetadata.ts",
  },
  tsconfig: "tsconfig.build.json",
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  target: "node24",
  outDir: "dist",
  onSuccess: async () => {
    ["rules.yaml", "rules.schema.json"].forEach((filename) => {
      return copyFileSync(`../${filename}`, `dist/${filename}`);
    });
  },
});
