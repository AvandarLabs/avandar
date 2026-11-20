import fs from "node:fs/promises";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { buildProduct } from "../buildProduct/buildProduct";
import { makeWorkspaceWebpackConfigFromConfig } from "../lib/makeWorkspaceWebpackConfigFromConfig";
import { assetReferences, publicAsset } from "../lib/planHelpers/planHelpers";
import { appRoot } from "./ShowcaseFilms/ShowcaseFilms";
import type { Film } from "../../src/showcase/showcase.types";

/**
 * Headless Chrome options for rendering showcase stills. Every still script
 * uses the same options so two runs on one machine render identical pixels,
 * for example Atlas posters and theme parity frames.
 */
export const SHOWCASE_STILL_BROWSER_OPTIONS = {
  chromeMode: "headless-shell",
  chromiumOptions: { headless: true, gl: "angle" },
  logLevel: "error",
} as const;

/**
 * Bundles the showcase render entry with one public directory that holds
 * every film's assets, so stills of several films render from one serve URL.
 * Use it before a batch of `renderStill` calls, for example to render poster
 * or parity frames. Returns the serve URL.
 */
export async function bundleShowcaseFilms(
  films: readonly Film[],
  directory: string,
): Promise<string> {
  const publicDir = path.join(directory, "public");
  await fs.mkdir(publicDir, { recursive: true });
  await fs.cp(
    path.join(appRoot, "public/fonts"),
    path.join(publicDir, "fonts"),
    { recursive: true },
  );
  const assets = new Set(
    films.flatMap((film) => {
      return film.plan ? assetReferences(film.plan) : [];
    }),
  );
  for (const asset of assets) {
    const target = path.join(publicDir, asset);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.copyFile(await publicAsset(appRoot, asset), target);
  }
  await buildProduct();
  return bundle({
    webpackOverride: makeWorkspaceWebpackConfigFromConfig,
    entryPoint: path.join(appRoot, "src/showcase/render-entry.tsx"),
    rootDir: appRoot,
    outDir: path.join(directory, "bundle"),
    publicDir,
  });
}
