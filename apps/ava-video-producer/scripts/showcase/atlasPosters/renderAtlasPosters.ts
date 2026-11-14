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
import { VIDEO_THEME_SLUG_PATTERN } from "../../../src/videoTheme/videoThemeSchema/videoThemeSchema";
import { requireLicense } from "../../require-license.mjs";
import {
  bundleShowcaseFilms,
  SHOWCASE_STILL_BROWSER_OPTIONS,
} from "../bundleShowcaseFilms/bundleShowcaseFilms";
import { appRoot, ShowcaseFilms } from "../ShowcaseFilms/ShowcaseFilms";
import { getPosterFrameFromFilm } from "./getPosterFrameFromFilm/getPosterFrameFromFilm";
import type { Film } from "../../../src/showcase/showcase.types";
import type { HeadlessBrowser } from "@remotion/renderer";

/**
 * Tracked card posters for the Atlas Compositions and Sample films sections,
 * one folder per theme.
 */
const ATLAS_POSTER_ROOT: string = path.join(appRoot, "showcase/assets/atlas");

const USAGE = "Usage: pnpm atlas:posters [--theme id] [composition ids...]";

/** `[--theme id] [ids...]`. The theme defaults to `classic`. */
function _parseArgs(
  argv: readonly string[],
): Readonly<{ themeId: string; ids: readonly string[] }> {
  const flag = argv.indexOf("--theme");
  if (flag === -1) {
    return { themeId: "classic", ids: argv };
  }
  const themeId = argv[flag + 1];
  if (
    !themeId ||
    !VIDEO_THEME_SLUG_PATTERN.test(themeId) ||
    argv.indexOf("--theme", flag + 1) !== -1
  ) {
    throw new Error(USAGE);
  }
  return {
    themeId,
    ids: argv.filter(
      (_, position) => position !== flag && position !== flag + 1,
    ),
  };
}

/** Posters render at half the canvas: sharp on a card, small in Git. */
const POSTER_SCALE = 0.5;

/**
 * The films for the named ids, or the whole continuity catalog when no ids are
 * given, loaded in one theme with captions and camera travel off.
 */
async function _loadPosterFilms(
  ids: readonly string[],
  themeId: string,
): Promise<readonly Film[]> {
  const entries = ids.length
    ? CONTINUITY_CATALOG.filter((entry) => ids.includes(entry.id))
    : CONTINUITY_CATALOG;
  if (entries.length !== (ids.length || CONTINUITY_CATALOG.length)) {
    throw new Error("Unknown Atlas composition id");
  }
  // Camera travel blurs a still; with it off, a poster shows the sharp wide
  // composition. Plain storyboard scenes have no camera options.
  return Promise.all(
    entries.map((entry) =>
      ShowcaseFilms.load(entry.id, {
        captions: false,
        theme: { id: themeId },
        ...(isSceneEntry(entry) ? {} : { cameraMotion: false }),
      }),
    ),
  );
}

type PosterRenderContext = Readonly<{
  browser: HeadlessBrowser;
  serveUrl: string;
  privateKey: string;
  posterDirectory: string;
}>;

/** Render one film's poster still into the theme's poster folder. */
async function _renderPoster(film: Film, context: PosterRenderContext) {
  const options = SHOWCASE_STILL_BROWSER_OPTIONS;
  const inputProps = { film, withAudio: false };
  const shared = {
    serveUrl: context.serveUrl,
    inputProps,
    puppeteerInstance: context.browser,
    ...options,
    envVariables: {},
  };
  const composition = await selectComposition({
    ...shared,
    id: "showcase-film",
  });
  const frame = getPosterFrameFromFilm(film);
  const output = path.join(context.posterDirectory, `${film.id}.jpg`);
  await renderStill({
    ...shared,
    licenseKey: context.privateKey,
    composition,
    frame,
    output,
    imageFormat: "jpeg",
    jpegQuality: 82,
    scale: POSTER_SCALE,
  });
  console.log(`${film.id}: frame ${frame} → ${path.relative(appRoot, output)}`);
}

/**
 * Render a still for each named composition or sample film, or for the whole
 * continuity catalog when no ids are given, in one theme, into that theme's
 * tracked poster folder.
 */
async function renderAtlasPosters(ids: readonly string[], themeId: string) {
  const { privateKey } = requireLicense();
  const films = await _loadPosterFilms(ids, themeId);
  const directory = path.join(appRoot, "out/showcase/atlas-posters");
  await fs.rm(directory, { recursive: true, force: true });
  const serveUrl = await bundleShowcaseFilms(films, directory);
  const posterDirectory = path.join(ATLAS_POSTER_ROOT, themeId);
  await fs.mkdir(posterDirectory, { recursive: true });
  const browser = await openBrowser("chrome", SHOWCASE_STILL_BROWSER_OPTIONS);
  try {
    for (const film of films) {
      await _renderPoster(film, {
        browser,
        serveUrl,
        privateKey,
        posterDirectory,
      });
    }
  } finally {
    await browser.close({ silent: true });
  }
}

const { themeId, ids } = _parseArgs(process.argv.slice(2));
await renderAtlasPosters(ids, themeId);
