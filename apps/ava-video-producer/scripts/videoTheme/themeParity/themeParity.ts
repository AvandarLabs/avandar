import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import {
  openBrowser,
  renderStill,
  selectComposition,
} from "@remotion/renderer";
import { requireLicense } from "../../require-license.mjs";
import {
  bundleShowcaseFilms,
  SHOWCASE_STILL_BROWSER_OPTIONS,
} from "../../showcase/bundleShowcaseFilms/bundleShowcaseFilms";
import {
  appRoot,
  ShowcaseFilms,
} from "../../showcase/ShowcaseFilms/ShowcaseFilms";
import { compareRgbaFrames } from "./compareRgbaFrames/compareRgbaFrames";
import {
  getAllowedRegionsFromFilm,
  getParityFramesFromFilm,
  listParityTargets,
  type ParityTarget,
} from "./parityTargets/parityTargets";
import { readRgbaFromPng, writePngFromRgba } from "./rgbaPng/rgbaPng";
import type { Film } from "../../../src/showcase/showcase.types";

const PARITY_ROOT = path.join(appRoot, "out/theme-parity");
let PARITY_DIRECTORY = PARITY_ROOT;

type ParityStage = "reference" | "current" | "diff";
type LoadedTarget = Readonly<{
  target: ParityTarget;
  film: Film;
  frames: readonly number[];
}>;
type TargetResult = Readonly<{
  id: string;
  frames: number;
  differingFrames: number;
  unexplainedPixels: number;
  missingFrames: number;
}>;

function _frameFile(stage: ParityStage, id: string, frame: number) {
  return path.join(
    PARITY_DIRECTORY,
    stage,
    id,
    `${String(frame).padStart(4, "0")}.png`,
  );
}

async function _loadTargets(
  ids: readonly string[],
  themeId: string,
): Promise<LoadedTarget[]> {
  return Promise.all(
    listParityTargets(ids).map(async (target) => {
      const film = await ShowcaseFilms.load(target.filmId, {
        ...target.options,
        theme: { id: themeId },
      });
      return { target, film, frames: getParityFramesFromFilm(film) };
    }),
  );
}

async function _renderTargets(
  targets: readonly LoadedTarget[],
  stage: "reference" | "current",
): Promise<void> {
  const { privateKey } = requireLicense();
  const options = SHOWCASE_STILL_BROWSER_OPTIONS;
  const serveUrl = await bundleShowcaseFilms(
    targets.map(({ film }) => film),
    path.join(PARITY_DIRECTORY, "bundle"),
  );
  const browser = await openBrowser("chrome", options);
  try {
    for (const { target, film, frames } of targets) {
      const inputProps = { film, withAudio: false };
      const composition = await selectComposition({
        serveUrl,
        id: "showcase-film",
        inputProps,
        puppeteerInstance: browser,
        ...options,
        envVariables: {},
      });
      for (const frame of frames) {
        const output = _frameFile(stage, target.id, frame);
        await fs.mkdir(path.dirname(output), { recursive: true });
        await renderStill({
          licenseKey: privateKey,
          serveUrl,
          composition,
          inputProps,
          frame,
          output,
          imageFormat: "png",
          scale: 1,
          puppeteerInstance: browser,
          ...options,
          envVariables: {},
        });
      }
      console.log(`${target.id}: ${frames.length} frames → ${stage}`);
    }
  } finally {
    await browser.close({ silent: true });
  }
}

async function _compareTarget({
  target,
  film,
  frames,
}: LoadedTarget): Promise<TargetResult> {
  const size = { width: film.width, height: film.height };
  const allowedRegions = getAllowedRegionsFromFilm(target.id, film);
  let differingFrames = 0;
  let unexplainedPixels = 0;
  let missingFrames = 0;
  for (const frame of frames) {
    const reference = await readRgbaFromPng(
      _frameFile("reference", target.id, frame),
      size,
    ).catch(() => undefined);
    if (!reference) {
      missingFrames += 1;
      continue;
    }
    const current = await readRgbaFromPng(
      _frameFile("current", target.id, frame),
      size,
    );
    const comparison = compareRgbaFrames({
      reference,
      current,
      ...size,
      allowedRegions,
    });
    if (comparison.differingPixels === 0) {
      continue;
    }
    differingFrames += 1;
    unexplainedPixels += comparison.unexplainedPixels;
    const diffFile = _frameFile("diff", target.id, frame);
    await fs.mkdir(path.dirname(diffFile), { recursive: true });
    await writePngFromRgba(diffFile, comparison.diff, size);
  }
  return {
    id: target.id,
    frames: frames.length,
    differingFrames,
    unexplainedPixels,
    missingFrames,
  };
}

async function _writeManifest(targets: readonly LoadedTarget[]) {
  const file = path.join(PARITY_DIRECTORY, "reference/manifest.json");
  const previous = JSON.parse(
    await fs.readFile(file, "utf8").catch(() => '{"targets":{}}'),
  ) as { targets: Record<string, readonly number[]> };
  const manifest = {
    capturedAt: new Date().toISOString(),
    commit: execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: appRoot,
      encoding: "utf8",
    }).trim(),
    targets: {
      ...previous.targets,
      ...Object.fromEntries(
        targets.map(({ target, frames }) => [target.id, frames]),
      ),
    },
  };
  await fs.writeFile(file, `${JSON.stringify(manifest, null, 2)}\n`);
}

/**
 * Captures reference frames with `capture`, or renders current frames and
 * compares them with the reference with `compare`, for the named targets or
 * all of them. A comparison fails on any pixel difference outside the
 * allowances, or on a frame with no reference.
 */
async function runThemeParity(
  mode: "capture" | "compare",
  ids: readonly string[],
  themeId: string,
): Promise<void> {
  const targets = await _loadTargets(ids, themeId);
  const stages: readonly ParityStage[] =
    mode === "capture" ? ["reference"] : ["current", "diff"];
  await Promise.all(
    targets.flatMap(({ target }) =>
      stages.map((stage) =>
        fs.rm(path.join(PARITY_DIRECTORY, stage, target.id), {
          recursive: true,
          force: true,
        }),
      ),
    ),
  );
  await _renderTargets(targets, mode === "capture" ? "reference" : "current");
  if (mode === "capture") {
    await _writeManifest(targets);
    return;
  }
  const results: TargetResult[] = [];
  for (const target of targets) {
    results.push(await _compareTarget(target));
  }
  console.table(results);
  if (
    results.some(
      (result) => result.unexplainedPixels > 0 || result.missingFrames > 0,
    )
  ) {
    console.error(
      `Parity failed. Diff images: ${path.relative(appRoot, path.join(PARITY_DIRECTORY, "diff"))}`,
    );
    process.exitCode = 1;
  }
}

const argv = process.argv.slice(2);
const themeIndex = argv.indexOf("--theme");
const themeId = themeIndex < 0 ? "classic" : argv[themeIndex + 1];
const [mode, ...ids] =
  themeIndex < 0
    ? argv
    : argv.filter(
        (_, index) => index !== themeIndex && index !== themeIndex + 1,
      );
PARITY_DIRECTORY =
  themeId === "classic" ? PARITY_ROOT : path.join(PARITY_ROOT, themeId);
if ((mode === "capture" || mode === "compare") && themeId) {
  await runThemeParity(mode, ids, themeId);
} else {
  console.error(
    "Usage: pnpm theme:parity <capture|compare> [target ids...] [--theme id]",
  );
  process.exitCode = 2;
}
