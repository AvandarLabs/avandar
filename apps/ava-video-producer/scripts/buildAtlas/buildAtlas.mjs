import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build, context } from "esbuild";
import { requireLicense } from "../require-license.mjs";
import { yamlPlugin } from "../yaml/yamlPlugin/yamlPlugin.js";
import { createGalleryPlugin } from "./createGalleryPlugin.mjs";
const root = fileURLToPath(new URL("../../", import.meta.url));
/**
 * Build Atlas from current source and refresh theme inputs during watch mode.
 */
export async function buildAtlas({
  watch = false,
  onBuilt = async () => {},
  outputDirectory = path.join(root, "out/showcase/browser"),
} = {}) {
  requireLicense();
  await mkdir(outputDirectory, {
    recursive: true,
  });
  const paletteFile = path.join(root, "src/gallery/theme-colors.json");
  const options = {
    absWorkingDir: root,
    entryPoints: ["src/gallery/MotionGallery/MotionGallery.tsx"],
    outfile: path.join(outputDirectory, "motion-gallery.js"),
    bundle: true,
    format: "iife",
    platform: "browser",
    target: ["es2022"],
    jsx: "automatic",
    minify: true,
    sourcemap: false,
    legalComments: "eof",
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    logLevel: "warning",
    plugins: [
      yamlPlugin,
      createGalleryPlugin({ root, outputDirectory, paletteFile, onBuilt }),
    ],
  };
  if (watch) {
    const builder = await context(options);
    try {
      await builder.rebuild();
      await builder.watch();
      return builder;
    } catch (error) {
      await builder.dispose();
      throw error;
    }
  }
  await build(options);
}
