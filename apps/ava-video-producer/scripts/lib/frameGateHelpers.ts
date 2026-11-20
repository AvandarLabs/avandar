// Measurements and verdicts behind `scripts/checkFrames.ts`. The header of
// that script explains what each check exists to catch. Everything here is
// pure except `getFrameMeasurementsFromVideo`, which runs ffmpeg, so the
// rules can be tested on numbers measured from real renders.
//
// Do not "fix" a failure by loosening the thresholds below.

import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { makeSet, propEq, propIsDefined } from "@avandar/utils";

/**
 * How much better than its neighbours a frame's halves match to count as tiled,
 * in dB.
 */
export const TILE_SPIKE_DB = 3;

/**
 * The largest allowed frame-to-frame change of average luma, on a 0-255 scale.
 */
export const LUMA_JUMP = 25;

/**
 * Below this luma contrast (max minus min) a frame is nearly one flat colour,
 * so its halves match by definition and it cannot be judged for tiling.
 * Measured: tiled frames sit at 206-219 of contrast, the dimmest dissolve
 * frame worth keeping sits at 71.
 */
export const FLAT_CONTRAST_LIMIT = 120;

/**
 * The half match a frame bordering a near-uniform frame needs before it can
 * count as tiled, in dB. Such a frame is an entrance from (or exit into) a
 * flat field, so it is mostly that field itself: its halves match better
 * than its detailed neighbours for the same reason a flat frame's do, and
 * the neighbour comparison alone flags it. A tiled frame's halves are copies
 * of each other, so they match far better still.
 *
 * Measured: the one frame bordering a near-uniform frame that spiked in a
 * 2357-frame storyboard render matched at 19.3 dB (a heading and a blurred
 * window entering an empty field). 2x3 grids of eleven frames of that render
 * matched at 44.8-54.7 dB, and of ffmpeg's noisy `testsrc2` pattern at
 * 320x180 at 38.7-39.5 dB. This floor sits between the two.
 */
export const COPY_MATCH_DB = 30;

/**
 * How many frames after a declared cut its luma may not swing back. A jump
 * and a swing back is one flash; WCAG 2.3.1 allows at most three flashes a
 * second, which is one per 10 frames at the storyboard's 30 fps.
 */
export const CUT_REVERSAL_FRAMES = 10;

const USAGE =
  "usage: node --import tsx scripts/checkFrames.ts <video> [--standalone] [--declared-cuts <frame>,<frame>...]";

/** What the gate's command line asks it to check. */
export type GateArguments = {
  file: string;
  isStandalone: boolean;
  declaredCuts: number[];
};

/**
 * A video's per-frame measurements, as `getFrameMeasurementsFromVideo` reads
 * them.
 */
export type FrameMeasurements = {
  width: number;
  height: number;
  halves: number[];
  luma: number[];
  contrast: number[];
};

/** How a declared cut was judged. See `makeJudgedCutsFromLuma`. */
export type CutVerdict = "accepted" | "flash" | "under-limit" | "outside-video";

/**
 * One declared cut and its verdict, as `makeJudgedCutsFromLuma` reports it.
 */
export type JudgedCut = {
  frame: number;
  verdict: CutVerdict;
  jump?: number;
  reversal?: number;
  reversalFrame?: number;
};

/**
 * One frame flagged as tiled, with how far its halves match above its
 * neighbours', in dB.
 */
export type TiledFrame = { frame: number; spike: number };

/** Reads a comma-separated list of non-negative integer frames. */
function _parseCutList(value: string | undefined): number[] {
  if (value === undefined) {
    throw new Error(`${USAGE}\n--declared-cuts needs a value`);
  }
  if (value === "") {
    return [];
  }
  return value.split(",").map((item) => {
    if (!/^\d+$/.test(item.trim())) {
      throw new Error(`${USAGE}\nnot a frame number: ${item}`);
    }
    return Number(item.trim());
  });
}

/** Reads the arguments from `index` on into `parsed`, consuming flag values. */
function _readArguments(options: {
  argv: readonly string[];
  index: number;
  parsed: Partial<GateArguments>;
}): Partial<GateArguments> {
  const { argv, index, parsed } = options;
  const argument = argv[index];
  if (argument === undefined) {
    return parsed;
  }
  if (argument === "--declared-cuts") {
    const declaredCuts = _parseCutList(argv[index + 1]);
    return _readArguments({
      argv,
      index: index + 2,
      parsed: { ...parsed, declaredCuts },
    });
  }
  if (argument.startsWith("--declared-cuts=")) {
    const declaredCuts = _parseCutList(
      argument.slice("--declared-cuts=".length),
    );
    return _readArguments({
      argv,
      index: index + 1,
      parsed: { ...parsed, declaredCuts },
    });
  }
  if (argument === "--standalone") {
    return _readArguments({
      argv,
      index: index + 1,
      parsed: { ...parsed, isStandalone: true },
    });
  }
  if (argument.startsWith("--")) {
    throw new Error(`${USAGE}\nunknown flag: ${argument}`);
  }
  return _readArguments({
    argv,
    index: index + 1,
    parsed: { ...parsed, file: argument },
  });
}

/**
 * Parses the gate's command line for `checkFrames`. Throws an error carrying
 * the usage line on a missing file, an unknown flag or a malformed cut list.
 */
export function makeGateArgumentsFromArgv(
  argv: readonly string[],
): GateArguments {
  const {
    file,
    isStandalone = false,
    declaredCuts = [],
  } = _readArguments({ argv, index: 0, parsed: {} });
  if (!file) {
    throw new Error(USAGE);
  }
  return { file, isStandalone, declaredCuts };
}

/**
 * The ffmpeg binary: the bundled one when installed, otherwise the PATH one.
 */
function _findFfmpeg(): string {
  const bundledFfmpegPath = new URL(
    "../../node_modules/ffmpeg-static/ffmpeg",
    import.meta.url,
  ).pathname;
  return existsSync(bundledFfmpegPath) ? bundledFfmpegPath : "ffmpeg";
}

// ffmpeg reports stream info and filter results on stderr, so both streams
// have to be read back.
function _runFfmpeg(args: readonly string[]): string {
  const result = spawnSync(_findFfmpeg(), args, {
    encoding: "utf8",
    maxBuffer: 1 << 28,
  });
  if (result.error) {
    throw result.error;
  }
  return `${result.stdout ?? ""}${result.stderr ?? ""}`;
}

/**
 * Each frame's left-half against right-half PSNR in dB, a perfect match as 99.
 */
function _measureHalves(options: {
  file: string;
  width: number;
  height: number;
}): number[] {
  const { file, width, height } = options;
  const directory = mkdtempSync(join(tmpdir(), "checkframes-"));
  const tileLog = join(directory, "tile.log");
  const half = Math.floor(width / 2);
  try {
    _runFfmpeg([
      "-hide_banner",
      "-loglevel",
      "error",
      "-i",
      file,
      "-lavfi",
      `[0:v]split[x][y];[x]crop=${half}:${height}:0:0[l];[y]crop=${half}:${height}:${width - half}:0[r];` +
        `[l][r]psnr=stats_file=${tileLog}`,
      "-f",
      "null",
      "-",
    ]);
    const halves: number[] = [];
    readFileSync(tileLog, "utf8")
      .split("\n")
      .forEach((line) => {
        const frameMatch = /(?:^|\s)n:(\d+)/.exec(line);
        const psnrMatch = /psnr_avg:([0-9.]+|inf)/.exec(line);
        if (frameMatch && psnrMatch) {
          halves[Number(frameMatch[1]) - 1] =
            psnrMatch[1] === "inf" ? 99 : Number(psnrMatch[1]);
        }
      });
    return halves;
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

/** Each frame's average luma and luma contrast (max minus min). */
function _measureLuma(file: string): { luma: number[]; contrast: number[] } {
  const stats = _runFfmpeg([
    "-hide_banner",
    "-loglevel",
    "info",
    "-i",
    file,
    "-vf",
    "signalstats,metadata=print",
    "-f",
    "null",
    "-",
  ]);
  const readAll = (name: string) => {
    return Array.from(
      stats.matchAll(
        new RegExp(`lavfi\\.signalstats\\.${name}=([0-9.]+)`, "g"),
      ),
      (match) => {
        return Number(match[1]);
      },
    );
  };
  const minimums = readAll("YMIN");
  const contrast = readAll("YMAX").map((maximum, index) => {
    return maximum - (minimums[index] ?? 0);
  });
  return { luma: readAll("YAVG"), contrast };
}

/**
 * Measures a video for the gate: its size, each frame's half match, and its
 * luma and contrast. `checkFrames` feeds the result to the verdict helpers.
 */
export function getFrameMeasurementsFromVideo(file: string): FrameMeasurements {
  const probe = _runFfmpeg(["-hide_banner", "-i", file, "-f", "null", "-"]);
  const dimensions = /,\s(\d{2,5})x(\d{2,5})[\s,]/.exec(probe);
  if (!dimensions) {
    throw new Error(`could not read dimensions of ${file}`);
  }
  const width = Number(dimensions[1]);
  const height = Number(dimensions[2]);
  return {
    width,
    height,
    halves: _measureHalves({ file, width, height }),
    ..._measureLuma(file),
  };
}

function _median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => {
    return a - b;
  });
  return sorted[Math.floor(sorted.length / 2)];
}

function _isFlat(contrast: readonly number[], index: number): boolean {
  return (contrast[index] ?? 255) < FLAT_CONTRAST_LIMIT;
}

/** The half matches of the four frames either side of `index`. */
function _neighbourMatches(halves: readonly number[], index: number): number[] {
  const firstNeighbourIndex = Math.max(0, index - 4);
  const lastNeighbourIndex = Math.min(halves.length, index + 5);
  const numNeighbourIndexes = Math.max(
    0,
    lastNeighbourIndex - firstNeighbourIndex,
  );
  return Array.from({ length: numNeighbourIndexes }, (_, offset) => {
    return firstNeighbourIndex + offset;
  })
    .filter((neighbourIndex) => {
      return neighbourIndex !== index && halves[neighbourIndex] !== undefined;
    })
    .map((neighbourIndex) => {
      return halves[neighbourIndex];
    });
}

/** The frame's spike over its neighbours, or undefined when it is not tiled. */
function _getTileSpike(options: {
  halves: readonly number[];
  contrast: readonly number[];
  index: number;
}): number | undefined {
  const { halves, contrast, index } = options;
  if (_isFlat(contrast, index)) {
    return undefined;
  }
  const neighbourMatches = _neighbourMatches(halves, index);
  if (!neighbourMatches.length) {
    return undefined;
  }
  const spike = halves[index] - _median(neighbourMatches);
  if (!(spike > TILE_SPIKE_DB)) {
    return undefined;
  }
  const bordersFlat =
    (index > 0 && _isFlat(contrast, index - 1)) ||
    (index + 1 < halves.length && _isFlat(contrast, index + 1));
  return bordersFlat && halves[index] < COPY_MATCH_DB ? undefined : spike;
}

/**
 * Frames whose halves match far better than their neighbours do: Chromium's
 * wrapped-texture frames. A frame bordering a near-uniform frame must also
 * match like a copy (`COPY_MATCH_DB`), since it is partly that flat field.
 * `checkFrames` fails a render that has any.
 */
export function getTiledFramesFromMeasurements(
  measurements: Readonly<Pick<FrameMeasurements, "halves" | "contrast">>,
): TiledFrame[] {
  // `halves` can be sparse, so walk every index rather than its entries.
  return Array.from({ length: measurements.halves.length }, (_, frame) => {
    return {
      frame,
      spike: _getTileSpike({
        halves: measurements.halves,
        contrast: measurements.contrast,
        index: frame,
      }),
    };
  }).filter(propIsDefined("spike"));
}

/**
 * How far the luma swings back after a cut, measured from the furthest point
 * it reaches in the cut's direction within `CUT_REVERSAL_FRAMES`.
 */
function _measureReversal(options: {
  luma: readonly number[];
  frame: number;
  direction: number;
}): { reversal: number; reversalFrame: number | undefined } {
  const { luma, frame, direction } = options;
  const lastFrame = Math.min(luma.length - 1, frame + CUT_REVERSAL_FRAMES);
  const laterFrames = Array.from(
    { length: Math.max(0, lastFrame - frame) },
    (_, offset) => {
      return frame + 1 + offset;
    },
  );
  return laterFrames.reduce<{
    furthest: number;
    reversal: number;
    reversalFrame: number | undefined;
  }>(
    (state, laterFrame) => {
      const furthest =
        direction > 0
          ? Math.max(state.furthest, luma[laterFrame])
          : Math.min(state.furthest, luma[laterFrame]);
      const swingBack = direction * (furthest - luma[laterFrame]);
      return swingBack > state.reversal
        ? { furthest, reversal: swingBack, reversalFrame: laterFrame }
        : { ...state, furthest };
    },
    { furthest: luma[frame], reversal: 0, reversalFrame: undefined },
  );
}

/**
 * Judges each declared cut, where `frame` is the first frame of the new shot.
 * `accepted`: the jump is over `LUMA_JUMP` and holds. `flash`: it swings back
 * by more than `LUMA_JUMP` within `CUT_REVERSAL_FRAMES`. `under-limit`: the
 * ordinary rule already passes it. `outside-video`: no frame before it.
 * `checkFrames` reports every verdict and exempts only accepted cuts.
 */
export function makeJudgedCutsFromLuma(
  luma: readonly number[],
  declaredCuts: readonly number[],
): JudgedCut[] {
  return declaredCuts.map((frame) => {
    if (frame < 1 || frame >= luma.length) {
      return { frame, verdict: "outside-video" };
    }
    const jump = luma[frame] - luma[frame - 1];
    const { reversal, reversalFrame } = _measureReversal({
      luma,
      frame,
      direction: Math.sign(jump),
    });
    const isOverLimit = Math.abs(jump) > LUMA_JUMP;
    const flashOrAccepted = reversal > LUMA_JUMP ? "flash" : "accepted";
    const verdict = isOverLimit ? flashOrAccepted : "under-limit";
    return { frame, verdict, jump, reversal, reversalFrame };
  });
}

/**
 * Frame-to-frame luma changes over `LUMA_JUMP`, except onto the frame of a
 * declared cut judged `accepted`. `checkFrames` fails a render that has any.
 */
export function getLumaJumpsFromLuma(
  luma: readonly number[],
  judgedCuts: ReadonlyArray<Pick<JudgedCut, "frame" | "verdict">>,
): Array<{ from: number; to: number; jump: number }> {
  const acceptedFrames = makeSet(
    judgedCuts.filter(propEq("verdict", "accepted")),
    { key: "frame" },
  );
  return luma
    .slice(1)
    .map((value, offset) => {
      return {
        from: offset,
        to: offset + 1,
        jump: Math.abs(value - luma[offset]),
      };
    })
    .filter(({ to, jump }) => {
      return jump > LUMA_JUMP && !acceptedFrames.has(to);
    });
}
