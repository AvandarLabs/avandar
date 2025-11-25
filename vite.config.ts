import eslintPlugin from "@nabla/vite-plugin-eslint";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import { defineConfig } from "vitest/config";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    TanStackRouterVite({
      target: "react",
      autoCodeSplitting: true,
      quoteStyle: "double",
      semicolons: true,
      routesDirectory: "src/routes",
      generatedRouteTree: "src/routeTree.gen.ts",
    }),
    react(),
    eslintPlugin(),

    // node polyfills are necessary to run `knex` in browser
    nodePolyfills(),
  ],
  resolve: {
    alias: {
      "@": "/src",
      $: "/shared",
      "~": "/",
    },
  },
  publicDir: "public",
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./tests/vitest.setup.ts",
  },
});
