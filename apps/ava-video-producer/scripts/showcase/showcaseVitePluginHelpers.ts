import { mkdir, readdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { ProductSources } from "../lib/ProductSources";
import { refreshPalette } from "./refreshPalette";
import type { Alias, Plugin } from "vite";

/** Brand files from `public/` that showcase pages load, by served path. */
export const SHOWCASE_PUBLIC_FILES: Readonly<Record<string, string>> = {
  "/fonts/figtree-latin.woff2": "fonts/figtree-latin.woff2",
  "/brand/avandar-logo.png": "avandar/logo.png",
};

/** The id pages and the theme stylesheet link resolve to. */
const SHOWCASE_THEME_ID = "\0showcase-theme.css";

/**
 * Resolves `generated/product` and `generated/product.css` imports to the
 * showcase's own compiled Avandar bundle, which is built separately from the
 * Remotion bridge in `src/avandar/generated/`.
 */
export function createProductBundlePlugin(productDirectory: string): Plugin {
  return {
    name: "showcase-product-bundle",
    enforce: "pre",
    resolveId: (source) => {
      const match = /(?:^|\/)generated\/product(?:\.(js|css))?$/.exec(source);
      return match
        ? {
            id: path.join(productDirectory, `product.${match[1] ?? "js"}`),
            // esbuild already bundled and shook the product. Rollup
            // analysing its megabytes again only slows every rebuild.
            moduleSideEffects: "no-treeshake",
          }
        : undefined;
    },
  };
}

/**
 * Aliases for the brand files pages and stylesheets reference by served path,
 * so Vite bundles them instead of copying the whole `public/` folder. CSS
 * `url()` references resolve through aliases, not plugin hooks.
 */
export function makePublicFileAliasesFromAppRoot(appRoot: string): Alias[] {
  return Object.entries(SHOWCASE_PUBLIC_FILES).map(([servedPath, file]) => {
    return {
      find: new RegExp(`^${servedPath.replaceAll(".", "\\.")}$`),
      replacement: path.join(appRoot, "public", file),
    };
  });
}

/** Avandar theme sources whose edits refresh the gallery palette. */
async function _findThemeSourceFiles(appRoot: string): Promise<string[]> {
  const product = ProductSources.getProductRootFromProducerRoot(appRoot);
  const themeDirectory = path.join(product, "src/config/Theme");
  const entries = await readdir(themeDirectory, {
    withFileTypes: true,
    recursive: true,
  }).catch(() => {
    return [];
  });
  return [
    path.join(product, "shared/config/Theme.ts"),
    ...entries
      .filter((entry) => {
        return entry.isFile() && /\.tsx?$/.test(entry.name);
      })
      .map((entry) => {
        return path.join(entry.parentPath, entry.name);
      }),
  ];
}

/**
 * Refreshes the palette JSON and theme stylesheet from the Avandar theme at
 * the start of every build, and rebuilds when a theme source changes. The
 * stylesheet is served as a virtual module so writing it never retriggers a
 * watched build.
 */
export function createShowcaseThemePlugin({
  appRoot,
  themeDirectory,
}: Readonly<{ appRoot: string; themeDirectory: string }>): Plugin {
  return {
    name: "showcase-theme",
    // A method, not an arrow: `this.addWatchFile` needs the plugin context.
    async buildStart() {
      await mkdir(themeDirectory, { recursive: true });
      await refreshPalette({
        root: appRoot,
        outputDirectory: themeDirectory,
        paletteFile: path.join(appRoot, "src/gallery/theme-colors.json"),
      });
      (await _findThemeSourceFiles(appRoot)).forEach((file) => {
        this.addWatchFile(file);
      });
    },
    resolveId: (source) => {
      return /(?:^|\/)showcase-theme\.css$/.test(source)
        ? SHOWCASE_THEME_ID
        : undefined;
    },
    load: async (id) => {
      return id === SHOWCASE_THEME_ID
        ? readFile(path.join(themeDirectory, "showcase-theme.css"), "utf8")
        : undefined;
    },
  };
}

/**
 * Removes files a previous watched build wrote once the current build is on
 * disk. Watched builds keep their output folder so open pages and players
 * still load while a rebuild runs.
 */
export function createStaleOutputPrunePlugin(): Plugin {
  return {
    name: "showcase-stale-output-prune",
    writeBundle: async (options, bundle) => {
      if (!options.dir) {
        return;
      }
      const outputDirectory = options.dir;
      const entries = await readdir(outputDirectory, {
        withFileTypes: true,
        recursive: true,
      });
      await Promise.all(
        entries
          .filter((entry) => {
            return entry.isFile();
          })
          .map((entry) => {
            return path.join(entry.parentPath, entry.name);
          })
          .filter((file) => {
            const fileName = path
              .relative(outputDirectory, file)
              .split(path.sep)
              .join("/");
            return !Object.hasOwn(bundle, fileName);
          })
          .map((file) => {
            return rm(file, { force: true });
          }),
      );
    },
  };
}
