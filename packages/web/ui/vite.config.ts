import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const pkgDir = fileURLToPath(new URL(".", import.meta.url));

/**
 * JavaScript and CSS only. Declarations come from `tsup` (see
 * `tsup.config.ts`); this config deliberately runs no dts plugin.
 *
 * Vite owns the JS/CSS half because esbuild, and therefore tsup, mishandles
 * CSS modules: it emitted every `.module.css` selector globally while handing
 * the JS an empty class-name object, so components rendered unstyled and the
 * two files that both define `.root` collided. Vite scopes them correctly and
 * extracts a single stylesheet, published as `@avandar/ui/styles.css`.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Only the package's own self-alias. `@avandar/*` must NOT be aliased:
      // they are separate published packages and are externalised below, so
      // aliasing them to source would inline their code into this bundle.
      "@ui": resolve(pkgDir, "src"),
    },
  },
  build: {
    lib: {
      entry: {
        index: resolve(pkgDir, "src/index.ts"),
        hooks: resolve(pkgDir, "src/hooks/index.ts"),
      },
      formats: ["es"],
    },
    sourcemap: true,
    // one stylesheet, imported by consumers as `@avandar/ui/styles.css`
    cssCodeSplit: false,
    rollupOptions: {
      // Everything the consumer supplies stays external.
      external: (id) => {
        return (
          /^(react|react-dom)(\/|$)/.test(id) ||
          /^@mantine\//.test(id) ||
          /^@tabler\//.test(id) ||
          /^@tanstack\//.test(id) ||
          /^@avandar\//.test(id) ||
          id === "clsx" ||
          id === "ts-pattern" ||
          id === "type-fest"
        );
      },
      output: { assetFileNames: "[name][extname]" },
    },
  },
});
