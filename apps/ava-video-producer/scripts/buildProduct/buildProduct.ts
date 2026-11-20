import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  build,
  type BuildContext,
  type BuildOptions,
  context,
  type OnLoadResult,
  type OnResolveResult,
  type Plugin,
} from "esbuild";
import { requireLicense } from "../requireLicense";
import { ADAPTER_ROOT, PRODUCER_ROOT } from "./buildProduct.constants";
import { compileProductCss } from "./compileProductCss";
import { compileProductSource } from "./compileProductSource";
import { compileSqlParser } from "./compileSqlParser";
import { finishProductBuild } from "./finishProductBuild";
import { getProductSourceFileFromImport } from "./getProductSourceFileFromImport";
import { loadProductAsset } from "./loadProductAsset";
import type { Aliases, ImportedFiles } from "./buildProduct.types";

/** The absolute paths of the adapter's `-aliases.json` maps. */
async function _listAliasFiles(): Promise<string[]> {
  const files = await fs.readdir(ADAPTER_ROOT);
  return files
    .filter((file) => {
      return file.endsWith("-aliases.json");
    })
    .map((file) => {
      return path.join(ADAPTER_ROOT, file);
    });
}

async function _readAliases(): Promise<Aliases> {
  const aliasMaps: Aliases[] = await Promise.all(
    (await _listAliasFiles()).map(async (file) => {
      return JSON.parse(await fs.readFile(file, "utf8"));
    }),
  );
  return Object.assign({}, ...aliasMaps);
}

/** Watches the adapter folder and its alias maps from the adapter entry. */
async function _watchAdapter(compiled: OnLoadResult): Promise<OnLoadResult> {
  return {
    ...compiled,
    watchDirs: [ADAPTER_ROOT],
    watchFiles: await _listAliasFiles(),
  };
}

function _createSourcePlugin(
  outputDirectory: string,
  onBuilt: () => Promise<void>,
): Plugin {
  const imported: ImportedFiles = new Map();
  let currentAliases: Aliases = {};
  return {
    name: "avandar-source",
    setup: (builder) => {
      builder.onStart(async () => {
        imported.clear();
        currentAliases = await _readAliases();
      });
      builder.onResolve({ filter: /.*/ }, async (args) => {
        const file = await getProductSourceFileFromImport(args, currentAliases);
        return file ? ({ path: file } satisfies OnResolveResult) : undefined;
      });
      builder.onLoad(
        { filter: /node-sql-parser[\\/]index\.js$/ },
        compileSqlParser,
      );
      builder.onLoad({ filter: /\.(tsx?|jsx?)$/ }, async (args) => {
        const compiled = await compileProductSource(args, {
          aliases: currentAliases,
          imported,
        });
        return compiled &&
          args.path === path.join(ADAPTER_ROOT, "product-entry.ts")
          ? _watchAdapter(compiled)
          : compiled;
      });
      builder.onLoad({ filter: /\.css$/ }, (args) => {
        return compileProductCss(args, imported);
      });
      builder.onLoad({ filter: /\.(json|png|svg)$/ }, (args) => {
        return loadProductAsset(args, imported);
      });
      builder.onEnd((result) => {
        return finishProductBuild({
          result,
          imported,
          outputDirectory,
          onBuilt,
        });
      });
    },
  };
}

function _createBuildOptions(
  outputDirectory: string,
  onBuilt: () => Promise<void>,
): BuildOptions {
  return {
    absWorkingDir: PRODUCER_ROOT,
    entryPoints: ["avandar-adapter/product-entry.ts"],
    outfile: path.join(outputDirectory, "product.js"),
    bundle: true,
    format: "esm",
    platform: "browser",
    target: "chrome120",
    jsx: "automatic",
    minify: false,
    metafile: true,
    banner: {
      js: `import * as ReactRuntime from 'react'; import * as ReactDOMRuntime from 'react-dom'; import * as JSXRuntime from 'react/jsx-runtime'; const require=(id)=>{ if(id==='react')return ReactRuntime; if(id==='react-dom')return ReactDOMRuntime; if(id==='react/jsx-runtime')return JSXRuntime; throw new Error('Unexpected runtime dependency: '+id); };`,
    },
    external: [
      "react",
      "react-dom",
      "react-dom/client",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "remotion",
    ],
    // Product code may read a bare `import.meta` (query-hooks' isDevBuild).
    // Film bundles are classic scripts, where that is a syntax error, so both
    // become empty objects: the product then sees a production build.
    define: {
      "process.env.NODE_ENV": '"production"',
      "import.meta.env": "{}",
      "import.meta": "{}",
    },
    loader: {
      ".woff": "dataurl",
      ".woff2": "dataurl",
      ".png": "dataurl",
      ".svg": "dataurl",
    },
    plugins: [_createSourcePlugin(outputDirectory, onBuilt)],
  };
}

/**
 * Compiles the enclosing worktree's Avandar components and the adapters into
 * one ESM bundle with its provenance manifest, without copying product
 * source. Run it before anything renders the real product components, for
 * example a storyboard preview or the component review page.
 * In watch mode it returns the esbuild context so the caller can dispose it.
 */
export async function buildProduct({
  watch = false,
  onBuilt = async () => {},
  outputDirectory = path.join(PRODUCER_ROOT, "src/avandar/generated"),
}: Readonly<{
  watch?: boolean;
  onBuilt?: () => Promise<void>;
  outputDirectory?: string;
}> = {}): Promise<BuildContext | undefined> {
  requireLicense();
  await fs.mkdir(outputDirectory, { recursive: true });
  const options = _createBuildOptions(outputDirectory, onBuilt);
  if (watch) {
    const builder = await context(options);
    await builder.rebuild();
    await builder.watch();
    return builder;
  }
  await build(options);
  return undefined;
}

// `pnpm component:build [--watch]` runs this file directly.
if (
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
) {
  if (
    process.argv.slice(2).some((arg) => {
      return arg !== "--watch";
    })
  ) {
    throw new Error(
      "Usage: component:build [--watch]. Product source is always this Avandar worktree.",
    );
  }
  await buildProduct({ watch: process.argv.includes("--watch") });
}
