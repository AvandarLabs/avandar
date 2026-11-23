import { copyFileSync } from "node:fs";
import { defineConfig } from "tsup";

/** Builds the publishable package entrypoints and declarations. */
export const tsup = defineConfig({
  entry: {
    catalog: "src/catalog/index.ts",
    coverage: "src/cli/coverageHelpers.ts",
    main: "src/cli/cliHelpers.ts",
    metadata: "src/shared/getRuleMetadataFromIdentity.ts",
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
