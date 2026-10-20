import fs from "node:fs/promises";
import path from "node:path";
import { transformAsync } from "@babel/core";
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
  const macros: Plugin = {
    name: "showcase-macros",
    setup(builder) {
      builder.onLoad(
        { filter: /[\\/]src[\\/](showcase|continuity|gallery)[\\/].*\.tsx?$/ },
        async (args) => {
          const source = await fs.readFile(args.path, "utf8");
          if (!source.includes("/macro"))
            return { contents: source, loader: "tsx" };
          const result = await transformAsync(source, {
            filename: args.path,
            configFile: false,
            babelrc: false,
            presets: ["@babel/preset-typescript"],
            plugins: [
              [
                "@lingui/babel-plugin-lingui-macro",
                { descriptorFields: "message" },
              ],
            ],
          });
          return { contents: result!.code!, loader: "tsx" };
        },
      );
      builder.onResolve(
        { filter: /generated\/product\.(js|css)$/ },
        (args) => ({ path: path.join(product, path.basename(args.path)) }),
      );
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
      "composition-gallery": "src/continuity/gallery/CompositionGallery.tsx",
    },
    outdir: output,
    bundle: true,
    format: "iife",
    platform: "browser",
    jsx: "automatic",
    target: "es2022",
    define: { "process.env.NODE_ENV": '"production"' },
    loader: { ".woff2": "dataurl" },
    plugins: [yamlPlugin, macros],
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
