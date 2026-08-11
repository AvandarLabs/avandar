import { defineConfig } from "tsup";

/**
 * Declarations only. `@avandar/ui` builds its JS and CSS with Vite (see
 * `vite.config.ts`) because esbuild mishandles CSS modules, but Vite's dts
 * plugin cannot roll declarations up: its `rollupTypes` option only supports a
 * single entry, and this package has two. Unrolled declarations import each
 * other with extensionless relative specifiers, which Node's `node16`
 * resolution rejects, so consumers on that setting see broken types.
 *
 * tsup's declaration engine bundles each entry into one self-contained file
 * with no relative imports, which resolves everywhere. So each tool does the
 * half it is actually good at.
 */
export default defineConfig({
  entry: {
    index: "src/index.ts",
    hooks: "src/hooks/index.ts",
  },
  tsconfig: "tsconfig.build.json",
  format: ["esm"],
  dts: { only: true },
  clean: false,
  outDir: "dist",
});
