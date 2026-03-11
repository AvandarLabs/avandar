import { defineConfig } from "vite";

/**
 * This configuration should be passed to vite-node with
 * `--config ./vite.script.config.ts` in order to run .ts scripts
 * with vite-node.
 */
export default defineConfig({
  server: {
    watch: null,
  },
  plugins: [],
  resolve: {
    alias: {
      "@": "/src",
      $: "/shared",
      "@clients": "/packages/clients/src/index.ts",
      "@logger": "/packages/logger/src/index.ts",
      "@models": "/packages/models/src/index.ts",
      "@modules": "/packages/modules/src/index.ts",
      "@utils": "/packages/utils/src/index.ts",
    },
  },
  ssr: {
    noExternal: true,
  },
  optimizeDeps: {
    // Don't optimize Node.js built-ins (Vite optimizes by excluding them by
    // default to avoid bundling them into browser bundles. But this config is
    // only for scripts, so it's easier to never exclude them.)
    exclude: ["node:fs", "node:path", "node:url"],
  },
});
