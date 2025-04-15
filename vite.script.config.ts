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
    },
  },
});
