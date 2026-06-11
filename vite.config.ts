import { lingui } from "@lingui/vite-plugin";
import eslintPlugin from "@nabla/vite-plugin-eslint";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import { defaultExclude, defineConfig } from "vitest/config";

// Wraps `react()` with the Lingui macro babel plugin. This is required:
// Lingui macros (<Trans>, t``, msg``, plural()) are compile-time transforms
// that must run inside React's babel pipeline. Registering
// `@lingui/babel-plugin-lingui-macro` as a standalone Vite plugin would not
// see JSX/TSX, so the macros would survive into the bundle and crash at
// runtime. Do not register `react()` separately; always use this wrapper so
// both the test and prod plugin arrays below share one configured pipeline.
const reactWithLinguiMacro = () => {
  return react({
    babel: {
      plugins: ["@lingui/babel-plugin-lingui-macro"],
    },
  });
};

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  return {
    plugins:
      mode === "test" ?
        [reactWithLinguiMacro(), lingui()]
      : [
          TanStackRouterVite({
            target: "react",
            autoCodeSplitting: true,
            quoteStyle: "double",
            semicolons: true,
            routesDirectory: "src/routes",
            generatedRouteTree: "src/routeTree.gen.ts",
          }),
          reactWithLinguiMacro(),
          lingui(),
          eslintPlugin(),

          // node polyfills are necessary to run `knex` in browser
          nodePolyfills(),
        ],
    resolve: {
      alias: {
        "@": "/src",
        $: "/shared",
        "@clients": "/packages/shared/clients/src",
        "@logger": "/packages/shared/logger/src",
        "@models": "/packages/shared/models/src",
        "@modules": "/packages/shared/modules/src",
        "@utils": "/packages/shared/utils/src",
        "@ui": "/packages/web/ui/src",
        "@hooks": "/packages/web/hooks/src",
        "@sbfn": "/supabase/functions",
      },
    },
    publicDir: "public",
    test: {
      globals: true,
      environment: "jsdom",
      setupFiles: "./tests/vitest.setup.ts",
      exclude: [
        ...defaultExclude,
        "tests/e2e/**",
        ".agents/**",
        ".claude/**",
        "apps/**",
        "packages/**",
      ],
    },
  };
});
