import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { propEq } from "@avandar/utils";
import {
  openBrowser,
  renderStill,
  selectComposition,
} from "@remotion/renderer";
import { requireLicense } from "../../requireLicense";
import {
  bundleShowcaseFilms,
  SHOWCASE_STILL_BROWSER_OPTIONS,
} from "../../showcase/bundleShowcaseFilms";
import {
  appRoot,
  ShowcaseFilms,
} from "../../showcase/ShowcaseFilms/ShowcaseFilms";
import {
  compareRgbaFrames,
  type ParityRegion,
} from "./compareRgbaFrames/compareRgbaFrames";
import {
  type ParityTarget,
  ParityTargets,
} from "./ParityTargets/ParityTargets";
import { readRgbaFromPng, writePngFromRgba } from "./rgbaPng/rgbaPng";
import type { Film } from "../../../src/showcase/showcase.types";

const PARITY_ROOT = path.join(appRoot, "out/theme-parity");
let parityDirectory = PARITY_ROOT;
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

/** How one frame compared: missing, identical, or with differing pixels. */
type FrameComparison =
  | { kind: "missing" }
  | { kind: "same" }
  | { kind: "different"; unexplainedPixels: number };

/** The frame and regions `_compareFrame` checks against a reference. */
type FrameComparisonRequest = {
  targetId: string;
  frame: number;
  size: { width: number; height: number };
  allowedRegions: ParityRegion[];
};

function _frameFile({
  stage,
  id,
  frame,
}: Readonly<{ stage: ParityStage; id: string; frame: number }>) {
  return path.join(
    parityDirectory,
    stage,
    id,
    `${String(frame).padStart(4, "0")}.png`,
  );
}
async function _loadTargets(
  ids: readonly string[],
  themeId: string,
): Promise<LoadedTarget[]> {
  const targets = ids.includes("--all")
    ? ParityTargets.listAllParityTargets()
    : ParityTargets.listParityTargets(ids);
  return Promise.all(
    targets.map(async (target) => {
      const film = await ShowcaseFilms.load(target.filmId, {
        ...target.options,
        theme: { id: themeId },
      });
      return {
        target,
        film,
        frames: ParityTargets.getParityFramesFromFilm(film),
      };
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
    targets.map(({ film }) => {
      return film;
    }),
    path.join(parityDirectory, "bundle"),
  );
  // Open the owned browser only after bundling succeeds so a failed bundle
  // cannot leak it.
  // react-doctor-disable-next-line server-sequential-independent-await
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
        const output = _frameFile({ stage, id: target.id, frame });
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

/**
 * Compares one current frame to its reference, writing a diff when they
 * differ.
 */
async function _compareFrame(
  options: Readonly<FrameComparisonRequest>,
): Promise<FrameComparison> {
  const { targetId, frame, size } = options;
  const reference = await readRgbaFromPng(
    _frameFile({ stage: "reference", id: targetId, frame }),
    size,
  ).catch(() => {
    return undefined;
  });
  if (!reference) {
    return { kind: "missing" };
  }
  const current = await readRgbaFromPng(
    _frameFile({ stage: "current", id: targetId, frame }),
    size,
  );
  const comparison = compareRgbaFrames({
    reference,
    current,
    ...size,
    allowedRegions: options.allowedRegions,
  });
  if (comparison.differingPixels === 0) {
    return { kind: "same" };
  }
  const diffFile = _frameFile({ stage: "diff", id: targetId, frame });
  await fs.mkdir(path.dirname(diffFile), { recursive: true });
  await writePngFromRgba({ file: diffFile, rgba: comparison.diff, size });
  return { kind: "different", unexplainedPixels: comparison.unexplainedPixels };
}

async function _compareTarget({
  target,
  film,
  frames,
}: LoadedTarget): Promise<TargetResult> {
  const size = { width: film.width, height: film.height };
  const allowedRegions = ParityTargets.getAllowedRegionsFromFilm({
    id: target.id,
    film,
  });
  const comparisons: FrameComparison[] = [];
  // Frames compare one at a time to keep only two decoded frames in memory.
  for (const frame of frames) {
    comparisons.push(
      await _compareFrame({ targetId: target.id, frame, size, allowedRegions }),
    );
  }
  return {
    id: target.id,
    frames: frames.length,
    differingFrames: comparisons.filter(propEq("kind", "different")).length,
    unexplainedPixels: comparisons.reduce((sum, item) => {
      return sum + (item.kind === "different" ? item.unexplainedPixels : 0);
    }, 0),
    missingFrames: comparisons.filter(propEq("kind", "missing")).length,
  };
}
async function _writeManifest(targets: readonly LoadedTarget[]) {
  const file = path.join(parityDirectory, "reference/manifest.json");
  const previous = JSON.parse(
    await fs.readFile(file, "utf8").catch(() => {
      return '{"targets":{}}';
    }),
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
        targets.map(({ target, frames }) => {
          return [target.id, frames];
        }),
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
async function _runThemeParity({
  mode,
  ids,
  themeId,
}: Readonly<{
  mode: "capture" | "compare";
  ids: readonly string[];
  themeId: string;
}>): Promise<void> {
  const targets = await _loadTargets(ids, themeId);
  const stages: readonly ParityStage[] =
    mode === "capture" ? ["reference"] : ["current", "diff"];
  await Promise.all(
    targets.flatMap(({ target }) => {
      return stages.map((stage) => {
        return fs.rm(path.join(parityDirectory, stage, target.id), {
          recursive: true,
          force: true,
        });
      });
    }),
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
    results.some((result) => {
      return result.unexplainedPixels > 0 || result.missingFrames > 0;
    })
  ) {
    console.error(
      `Parity failed. Diff images: ${path.relative(appRoot, path.join(parityDirectory, "diff"))}`,
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
    : argv.filter((_, index) => {
        return index !== themeIndex && index !== themeIndex + 1;
      });
parityDirectory =
  themeId === "classic" ? PARITY_ROOT : path.join(PARITY_ROOT, themeId);
if ((mode === "capture" || mode === "compare") && themeId) {
  await _runThemeParity({ mode, ids, themeId });
} else {
  console.error(
    "Usage: pnpm theme:parity <capture|compare> [target ids... | --all] [--theme id]",
  );
  process.exitCode = 2;
}
