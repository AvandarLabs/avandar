import path from "node:path";
import { makeObject } from "@avandar/utils";
import { getAvandarUtilsDirectoryFromRoot } from "../lib/getAvandarUtilsDirectoryFromRoot";
import { yamlVitePlugin } from "../yaml/yamlVitePlugin";
import {
  makeShowcasePathsFromAppRoot,
  type ShowcasePaths,
} from "./makeShowcasePathsFromAppRoot";
import {
  createProductBundlePlugin,
  makePublicFileAliasesFromAppRoot,
  createShowcaseThemePlugin,
  createStaleOutputPrunePlugin,
} from "./showcaseVitePluginHelpers";
import type { Alias, BuildOptions, InlineConfig } from "vite";

/** Every showcase page, by its HTML file name under `showcase/`. */
export const SHOWCASE_PAGES = [
  "index",
  "productions",
  "compositions",
  "live",
  "motion",
] as const;

/** The `@utils` source alias and the brand-file aliases pages resolve. */
function _createAliases(appRoot: string): Alias[] {
  return [
    {
      find: /^@utils(?=\/|$)/,
      // Matches the Remotion bundle's `@utils` alias.
      replacement: getAvandarUtilsDirectoryFromRoot(appRoot),
    },
    ...makePublicFileAliasesFromAppRoot(appRoot),
  ];
}

/** Writes every page into the site folder, unminified while watching. */
function _createBuildOptions(
  paths: Readonly<ShowcasePaths>,
  isWatching: boolean,
): BuildOptions {
  return {
    outDir: paths.site,
    // A watched build replaces files in place and prunes stale ones after
    // writing, so pages never 404 while a rebuild runs.
    emptyOutDir: !isWatching,
    assetsDir: "bundles",
    target: "es2022",
    minify: !isWatching,
    sourcemap: false,
    reportCompressedSize: false,
    // The compiled Avandar product bundle alone is several megabytes.
    chunkSizeWarningLimit: 100_000,
    rollupOptions: {
      onwarn: (warning, warn) => {
        // Mantine marks client components with "use client", which only
        // matters to server-rendering frameworks. Bundling drops it safely.
        if (warning.code !== "MODULE_LEVEL_DIRECTIVE") {
          warn(warning);
        }
      },
      input: makeObject(SHOWCASE_PAGES, {
        valueFn: (page) => {
          return path.join(paths.pages, `${page}.html`);
        },
      }),
    },
    watch: isWatching ? { buildDelay: 100 } : undefined,
  };
}

/**
 * The Vite build for every showcase page: the shell scripts, the live film
 * player, and the Motion Atlas share one build. Watched builds skip
 * minification so source edits rebuild sooner.
 *
 * `buildShowcaseSite` builds it once and `watchShowcaseSite` builds it with
 * `isWatching` for the showcase dev server.
 */
export function makeShowcaseViteConfigFromAppRoot({
  appRoot,
  isWatching,
}: Readonly<{ appRoot: string; isWatching: boolean }>): InlineConfig {
  const paths = makeShowcasePathsFromAppRoot(appRoot);
  return {
    configFile: false,
    root: paths.pages,
    base: "/",
    publicDir: false,
    logLevel: "warn",
    clearScreen: false,
    // Showcase CSS is plain CSS. An inline config stops Vite from loading the
    // workspace's Tailwind PostCSS setup, which the product bundle owns.
    css: { postcss: {} },
    resolve: { alias: _createAliases(appRoot) },
    plugins: [
      yamlVitePlugin,
      createProductBundlePlugin(paths.product),
      createShowcaseThemePlugin({ appRoot, themeDirectory: paths.theme }),
      ...(isWatching ? [createStaleOutputPrunePlugin()] : []),
    ],
    build: _createBuildOptions(paths, isWatching),
  };
}
