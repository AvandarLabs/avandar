import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

/**
 * This configuration should be passed to vite-node with
 * `--config ./vite.script.config.ts` in order to run .ts scripts
 * with vite-node.
 */
export default defineConfig({
  server: {
    watch: null,
  },
  plugins: [tsConfigPaths()],
  resolve: {
    alias: {
      "@": "/src",
      $: "/shared",
      "@clients": "/packages/shared/clients/src",
      "@logger": "/packages/shared/logger/src",
      "@models": "/packages/shared/models/src",
      "@modules": "/packages/shared/modules/src",
      "@utils": "/packages/shared/utils/src",
      "@ava-etl": "/packages/node/ava-etl/src",
      "@pipeline-server": "/apps/pipeline-server/src",
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
