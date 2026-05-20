import eslintPlugin from "@nabla/vite-plugin-eslint";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { loadEnv } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import { VitePWA } from "vite-plugin-pwa";
import { defaultExclude, defineConfig } from "vitest/config";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const supabaseApiUrl = env.VITE_SUPABASE_API_URL ?? "";

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
          nodePolyfills(),
          VitePWA({
            registerType: "autoUpdate",
            injectRegister: false,
            workbox: {
              globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2,wasm}"],
              maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
              navigateFallback: "/index.html",
              navigateFallbackDenylist: [/^\/functions\//, /^\/auth\//],
              runtimeCaching: [
                ...(supabaseApiUrl ?
                  [
                    {
                      urlPattern: ({ url }: { url: URL }) =>
                        url.origin === supabaseApiUrl &&
                        url.pathname.startsWith("/rest/"),
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
                  urlPattern: ({ url }: { url: URL }) =>
                    url.pathname.startsWith("/storage/v1/object"),
                  handler: "NetworkOnly" as const,
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
