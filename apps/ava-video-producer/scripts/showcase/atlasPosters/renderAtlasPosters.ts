import fs from "node:fs/promises";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import {
  openBrowser,
  renderStill,
  selectComposition,
} from "@remotion/renderer";
import {
  CONTINUITY_CATALOG,
  isSceneEntry,
} from "../../../src/continuity/continuityCatalog";
import { buildProduct } from "../../build-avandar.mjs";
import { assetReferences, publicAsset } from "../../lib/planHelpers";
import { withWorkspaceAliases } from "../../lib/withWorkspaceAliases.mjs";
import { requireLicense } from "../../require-license.mjs";
import { appRoot, ShowcaseFilms } from "../ShowcaseFilms/ShowcaseFilms";
import { getPosterFrameFromPlan } from "./getPosterFrameFromPlan/getPosterFrameFromPlan";
import type { Film } from "../../../src/showcase/showcase.types";

/** Tracked card posters for the Atlas Compositions and Sample films sections. */
const ATLAS_POSTER_DIRECTORY: string = path.join(
  appRoot,
  "showcase/assets/atlas",
);

/** Posters render at half the canvas: sharp on a card, small in Git. */
const POSTER_SCALE = 0.5;

/** One Remotion bundle whose public directory holds every film's assets. */
async function _bundleFilms(films: readonly Film[], directory: string) {
  const publicDir = path.join(directory, "public");
  await fs.mkdir(publicDir, { recursive: true });
  await fs.cp(
    path.join(appRoot, "public/fonts"),
    path.join(publicDir, "fonts"),
    { recursive: true },
  );
  const assets = new Set(
    films.flatMap((film) => (film.plan ? assetReferences(film.plan) : [])),
  );
  for (const asset of assets) {
    const target = path.join(publicDir, asset);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.copyFile(await publicAsset(appRoot, asset), target);
  }
  await buildProduct();
  return bundle({
    webpackOverride: withWorkspaceAliases,
    entryPoint: path.join(appRoot, "src/showcase/render-entry.tsx"),
    rootDir: appRoot,
    outDir: path.join(directory, "bundle"),
    publicDir,
  });
}

/**
 * Render a still for each named composition or sample film, or for the whole
 * continuity catalog when no ids are given, into the tracked poster folder.
 */
async function renderAtlasPosters(ids: readonly string[]) {
  const { privateKey } = requireLicense();
  const entries = ids.length
    ? CONTINUITY_CATALOG.filter((entry) => ids.includes(entry.id))
    : CONTINUITY_CATALOG;
  if (entries.length !== (ids.length || CONTINUITY_CATALOG.length)) {
    throw new Error("Unknown Atlas composition id");
  }
  // Camera travel blurs a still; with it off, a poster shows the sharp wide
  // composition. Plain storyboard scenes have no camera options.
  const films = await Promise.all(
    entries.map((entry) =>
      ShowcaseFilms.load(entry.id, {
        captions: false,
        ...(isSceneEntry(entry) ? {} : { cameraMotion: false }),
      }),
    ),
  );
  const directory = path.join(appRoot, "out/showcase/atlas-posters");
  await fs.rm(directory, { recursive: true, force: true });
  const serveUrl = await _bundleFilms(films, directory);
  await fs.mkdir(ATLAS_POSTER_DIRECTORY, { recursive: true });
  const options = {
    chromeMode: "headless-shell" as const,
    chromiumOptions: { headless: true, gl: "angle" as const },
    logLevel: "error" as const,
  };
  const browser = await openBrowser("chrome", options);
  try {
    for (const film of films) {
      const inputProps = { film, withAudio: false };
      const composition = await selectComposition({
        serveUrl,
        id: "showcase-film",
        inputProps,
        puppeteerInstance: browser,
        ...options,
        envVariables: {},
      });
      const frame = film.plan ? getPosterFrameFromPlan(film.plan) : 0;
      const output = path.join(ATLAS_POSTER_DIRECTORY, `${film.id}.jpg`);
      await renderStill({
        licenseKey: privateKey,
        serveUrl,
        composition,
        inputProps,
        frame,
        output,
        imageFormat: "jpeg",
        jpegQuality: 82,
        scale: POSTER_SCALE,
        puppeteerInstance: browser,
        ...options,
        envVariables: {},
      });
      console.log(
        `${film.id}: frame ${frame} → ${path.relative(appRoot, output)}`,
      );
    }
  } finally {
    await browser.close({ silent: true });
  }
}

await renderAtlasPosters(process.argv.slice(2));
