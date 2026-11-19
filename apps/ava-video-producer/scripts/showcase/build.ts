import path from "node:path";
import { context, type Plugin } from "esbuild";
import { buildProduct } from "../build-avandar.mjs";
import { requireLicense } from "../require-license.mjs";
import { yamlPlugin } from "../yaml/yamlPlugin/yamlPlugin";
import { appRoot } from "./ShowcaseFilms/ShowcaseFilms";

/** Watch product source and build the iframe bundle without serving the repo. */
export async function buildLivePlayers(onBuilt: () => Promise<void>) {
  requireLicense();
  const output = path.join(appRoot, "out/showcase/browser");
  const product = path.join(output, "product");
  const productBundle: Plugin = {
    name: "showcase-product-bundle",
    setup(builder) {
      builder.onResolve({ filter: /generated\/product\.(js|css)$/ }, (args) => {
        return { path: path.join(product, path.basename(args.path)) };
      });
      builder.onEnd(async (result) => {
        if (!result.errors.length) {
          await onBuilt();
        }
      });
    },
  };
  const player = await context({
    absWorkingDir: appRoot,
    entryPoints: {
      "live-player": "src/showcase/LivePlayer.tsx",
    },
    outdir: output,
    bundle: true,
    format: "iife",
    platform: "browser",
    jsx: "automatic",
    target: "es2022",
    define: { "process.env.NODE_ENV": '"production"' },
    loader: { ".woff2": "dataurl" },
    plugins: [yamlPlugin, productBundle],
    logLevel: "warning",
  });
  const productBuild = await buildProduct({
    watch: true,
    outputDirectory: product,
    onBuilt: async () => {
      await player.rebuild();
    },
  });
  await player.watch();
  return {
    output,
    dispose: async () => {
      // Product completion can rebuild the player, so drain it first.
      await productBuild?.dispose();
      await player.dispose();
    },
  };
}
