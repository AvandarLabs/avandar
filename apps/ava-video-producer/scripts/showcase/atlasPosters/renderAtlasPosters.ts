import fs from "node:fs/promises";
import path from "node:path";
import {
  openBrowser,
  renderStill,
  selectComposition,
} from "@remotion/renderer";
import {
  CONTINUITY_CATALOG,
  isSceneEntry,
} from "../../../src/continuity/continuityCatalog";
import { requireLicense } from "../../require-license.mjs";
import {
  bundleShowcaseFilms,
  SHOWCASE_STILL_BROWSER_OPTIONS,
} from "../bundleShowcaseFilms/bundleShowcaseFilms";
import { appRoot, ShowcaseFilms } from "../ShowcaseFilms/ShowcaseFilms";
import { getPosterFrameFromPlan } from "./getPosterFrameFromPlan/getPosterFrameFromPlan";

/** Tracked card posters for the Atlas Compositions and Sample films sections. */
const ATLAS_POSTER_DIRECTORY: string = path.join(
  appRoot,
  "showcase/assets/atlas",
);

/** Posters render at half the canvas: sharp on a card, small in Git. */
const POSTER_SCALE = 0.5;

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
  const serveUrl = await bundleShowcaseFilms(films, directory);
  await fs.mkdir(ATLAS_POSTER_DIRECTORY, { recursive: true });
  const options = SHOWCASE_STILL_BROWSER_OPTIONS;
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
