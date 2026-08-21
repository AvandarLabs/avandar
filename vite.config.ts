import { readFileSync } from "node:fs";
import { lingui } from "@lingui/vite-plugin";
import eslintPlugin from "@nabla/vite-plugin-eslint";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { loadEnv } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import { VitePWA } from "vite-plugin-pwa";
import { defaultExclude, defineConfig } from "vitest/config";

// Read rather than import package.json so this does not depend on
// `resolveJsonModule` being enabled in the Node-side tsconfig. Exposed to the
// app as `import.meta.env.VITE_APP_VERSION` and recorded on every analytics
// event, so a regression can be correlated with the release that shipped it.
const { version: appVersion } = JSON.parse(
  readFileSync("./package.json", "utf-8"),
) as { version: string };

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
  const env = loadEnv(mode, process.cwd(), "");
  const supabaseApiUrl = env.VITE_SUPABASE_API_URL ?? "";

  // vite-plugin-pwa serializes `urlPattern` callbacks via `Function#toString`,
  // which drops the surrounding closure and leaves any captured variable as a
  // free reference in the emitted `sw.js` (it caused `supabaseApiUrl is not
  // defined` on every routed fetch in prod). Use a RegExp instead: those are
  // serialized by value, so the supabase origin is baked into `sw.js` as a
  // literal.
  const escapeRegExp = (s: string) => {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  };
  const supabaseRestUrlPattern =
    supabaseApiUrl ?
      new RegExp(`^${escapeRegExp(supabaseApiUrl)}/rest/`)
    : undefined;

  return {
    define: {
      "import.meta.env.VITE_APP_VERSION": JSON.stringify(appVersion),
    },
    worker: {
      format: "es",
    },
    optimizeDeps: {
      // Pre-bundling adds node polyfills to Emscripten glue; breaks workers.
      exclude: ["@duckdb/duckdb-wasm"],

      // SheetJS is imported only by `src/workers/xlsxSniff.worker.ts`, which is
      // reached through a `?worker` import. Vite's startup dependency scanner
      // does not crawl into worker modules, so against a cold
      // `node_modules/.vite` it stays unbundled until the browser first
      // requests the worker, which happens mid-import right after the user
      // uploads an XLSX. Vite then optimizes it and broadcasts a full page
      // reload ("new dependencies optimized: xlsx"), wiping the import form's
      // file state. Listing it here pre-bundles it at server start instead.
      // Locally the cache is warm so the reload never fires; CI starts cold
      // every run, which is why only CI saw it.
      include: ["xlsx"],
    },
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
          nodePolyfills(),
          VitePWA({
            registerType: "autoUpdate",
            injectRegister: false,
            workbox: {
              globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
              maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
              navigateFallback: "/index.html",
              navigateFallbackDenylist: [/^\/functions\//, /^\/auth\//],
              runtimeCaching: [
                ...(supabaseRestUrlPattern ?
                  [
                    {
                      urlPattern: supabaseRestUrlPattern,
                      handler: "NetworkFirst" as const,
                      options: {
                        cacheName: "supabase-rest",
                        networkTimeoutSeconds: 4,
                        expiration: {
                          maxEntries: 500,
                          maxAgeSeconds: 7 * 24 * 60 * 60,
                        },
                      },
                    },
                  ]
                : []),
                {
                  urlPattern: ({ url }: { url: URL }) => {
                    return url.pathname.startsWith("/storage/v1/object");
                  },
                  handler: "NetworkOnly" as const,
                },
                {
                  // DuckDb fetches spatial / excel extension WASM from this CDN
                  // on every fresh init; CacheFirst lets prod (PWA) keep
                  // serving them when the user goes offline.
                  urlPattern: ({ url }: { url: URL }) => {
                    return url.origin === "https://extensions.duckdb.org";
                  },
                  handler: "CacheFirst" as const,
                  options: {
                    cacheName: "duckdb-extensions",
                    expiration: {
                      maxEntries: 30,
                      maxAgeSeconds: 30 * 24 * 60 * 60,
                    },
                    cacheableResponse: { statuses: [0, 200] },
                  },
                },
                {
                  // Self-hosted DuckDB core WASM (mvp + eh variants, ~35 MB
                  // each). Excluded from precache to keep first-load egress
                  // small; CacheFirst means the first user who triggers
                  // DuckDB pays the download once, then it's served from
                  // cache and works offline thereafter.
                  urlPattern: ({
                    url,
                    sameOrigin,
                  }: {
                    url: URL;
                    sameOrigin: boolean;
                  }) => {
                    return sameOrigin && url.pathname.endsWith(".wasm");
                  },
                  handler: "CacheFirst" as const,
                  options: {
                    cacheName: "app-wasm",
                    expiration: {
                      maxEntries: 10,
                      maxAgeSeconds: 90 * 24 * 60 * 60,
                    },
                    cacheableResponse: { statuses: [0, 200] },
                  },
                },
              ],
            },
            manifest: {
              name: "Avandar",
              short_name: "Avandar",
              theme_color: "#0e8a76",
              background_color: "#ffffff",
              display: "standalone",
              icons: [
                {
                  src: "/logo.png",
                  sizes: "192x192",
                  type: "image/png",
                },
                {
                  src: "/logo.png",
                  sizes: "512x512",
                  type: "image/png",
                },
              ],
            },
          }),
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
        "@query-hooks": "/packages/web/query-hooks/src",
        "@browser-utils": "/packages/web/browser-utils/src",
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
        "tests/e2e/**/*.spec.ts",
        ".agents/**",
        ".claude/**",
        "apps/**",
        "packages/**",
        "**/*.executed.test.ts",
      ],
    },
  };
});
