import eslintPlugin from "@nabla/vite-plugin-eslint";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import { defineConfig } from "vitest/config";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  return {
    plugins:
      mode === "test" ?
        [react()]
      : [
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
        "@avandar/clients": "/packages/clients/src/index.ts",
        "@avandar/logger": "/packages/logger/src/index.ts",
        "@avandar/models": "/packages/models/src/index.ts",
        "@avandar/modules": "/packages/modules/src/index.ts",
        "@avandar/ui": "/packages/web/ui/src/index.ts",
        "@avandar/utils": "/packages/utils/src/index.ts",
        "@avandar/react-query": "/packages/web/react-query/src/index.ts",
      },
    },
    publicDir: "public",
    test: {
      globals: true,
      environment: "jsdom",
      setupFiles: "./tests/vitest.setup.ts",
    },
  };
});
