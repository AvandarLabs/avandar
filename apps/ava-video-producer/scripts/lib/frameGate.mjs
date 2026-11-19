// Measurements and verdicts behind `scripts/check-frames.mjs`. The header of
// that script explains what each check exists to catch. Everything here is
// pure except `measureFrames`, which runs ffmpeg, so the rules can be tested
// on numbers measured from real renders.
//
// Do not "fix" a failure by loosening the thresholds below.

import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

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
export const FLAT = 120;

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
  "usage: node scripts/check-frames.mjs <video> [--standalone] [--declared-cuts <frame>,<frame>...]";

/** Reads a comma-separated list of non-negative integer frames. */
function _parseCutList(value) {
  if (value === undefined)
    throw new Error(`${USAGE}\n--declared-cuts needs a value`);
  if (value === "") return [];
  return value.split(",").map((item) => {
    if (!/^\d+$/.test(item.trim()))
      throw new Error(`${USAGE}\nnot a frame number: ${item}`);
    return Number(item.trim());
  });
}

/**
 * Parses the gate's command line. Throws an error carrying the usage line on
 * a missing file, an unknown flag or a malformed cut list.
 *
 * @param {string[]} argv
 * @returns {{file: string, isStandalone: boolean, declaredCuts: number[]}}
 */
export function parseGateArguments(argv) {
  let file;
  let isStandalone = false;
  let declaredCuts = [];
  for (let index = 0; index < argv.length; index++) {
    const argument = argv[index];
    if (argument === "--standalone") isStandalone = true;
    else if (argument === "--declared-cuts")
      declaredCuts = _parseCutList(argv[++index]);
    else if (argument.startsWith("--declared-cuts="))
      declaredCuts = _parseCutList(argument.slice("--declared-cuts=".length));
    else if (argument.startsWith("--"))
      throw new Error(`${USAGE}\nunknown flag: ${argument}`);
    else file = argument;
  }
  if (!file) throw new Error(USAGE);
  return { file, isStandalone, declaredCuts };
}

/**
 * The ffmpeg binary: the bundled one when installed, otherwise the PATH one.
 */
function _findFfmpeg() {
  const local = new URL(
    "../../node_modules/ffmpeg-static/ffmpeg",
    import.meta.url,
  ).pathname;
  return existsSync(local) ? local : "ffmpeg";
}

// ffmpeg reports stream info and filter results on stderr, so both streams
// have to be read back.
function _runFfmpeg(args) {
  const result = spawnSync(_findFfmpeg(), args, {
    encoding: "utf8",
    maxBuffer: 1 << 28,
  });
  if (result.error) throw result.error;
  return `${result.stdout ?? ""}${result.stderr ?? ""}`;
}

/**
 * Each frame's left-half against right-half PSNR in dB, a perfect match as 99.
 */
function _measureHalves(file, width, height) {
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
    const halves = [];
    for (const line of readFileSync(tileLog, "utf8").split("\n")) {
      const frameMatch = /(?:^|\s)n:(\d+)/.exec(line);
      const psnrMatch = /psnr_avg:([0-9.]+|inf)/.exec(line);
      if (frameMatch && psnrMatch)
        halves[Number(frameMatch[1]) - 1] =
          psnrMatch[1] === "inf" ? 99 : Number(psnrMatch[1]);
    }
    return halves;
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

/** Each frame's average luma and luma contrast (max minus min). */
function _measureLuma(file) {
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
  const readAll = (name) =>
    Array.from(
      stats.matchAll(
        new RegExp(`lavfi\\.signalstats\\.${name}=([0-9.]+)`, "g"),
      ),
      (match) => Number(match[1]),
    );
  const minimums = readAll("YMIN");
  const contrast = readAll("YMAX").map(
    (maximum, index) => maximum - (minimums[index] ?? 0),
  );
  return { luma: readAll("YAVG"), contrast };
}

/**
 * Measures a video for the gate.
 *
 * @param {string} file
 * @returns {{
 *   width: number,
 *   height: number,
 *   halves: number[],
 *   luma: number[],
 *   contrast: number[]
 * }}
 */
export function measureFrames(file) {
  const probe = _runFfmpeg(["-hide_banner", "-i", file, "-f", "null", "-"]);
  const dimensions = /,\s(\d{2,5})x(\d{2,5})[\s,]/.exec(probe);
  if (!dimensions) throw new Error(`could not read dimensions of ${file}`);
  const width = Number(dimensions[1]);
  const height = Number(dimensions[2]);
  return {
    width,
    height,
    halves: _measureHalves(file, width, height),
    ..._measureLuma(file),
  };
}

const _median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
};

const _isFlat = (contrast, index) => (contrast[index] ?? 255) < FLAT;

/** The half matches of the four frames either side of `index`. */
function _neighbourMatches(halves, index) {
  const matches = [];
  const last = Math.min(halves.length, index + 5);
  for (let other = Math.max(0, index - 4); other < last; other++)
    if (other !== index && halves[other] !== undefined)
      matches.push(halves[other]);
  return matches;
}

/**
 * Frames whose halves match far better than their neighbours do: Chromium's
 * wrapped-texture frames. A frame bordering a near-uniform frame must also
 * match like a copy (`COPY_MATCH_DB`), since it is partly that flat field.
 *
 * @param {{halves: number[], contrast: number[]}} measured
 * @returns {{frame: number, spike: number}[]}
 */
export function findTiledFrames({ halves, contrast }) {
  const tiled = [];
  for (let index = 0; index < halves.length; index++) {
    if (_isFlat(contrast, index)) continue;
    const around = _neighbourMatches(halves, index);
    if (!around.length) continue;
    const spike = halves[index] - _median(around);
    if (!(spike > TILE_SPIKE_DB)) continue;
    const bordersFlat =
      (index > 0 && _isFlat(contrast, index - 1)) ||
      (index + 1 < halves.length && _isFlat(contrast, index + 1));
    if (bordersFlat && halves[index] < COPY_MATCH_DB) continue;
    tiled.push({ frame: index, spike });
  }
  return tiled;
}

/**
 * How far the luma swings back after a cut, measured from the furthest point
 * it reaches in the cut's direction within `CUT_REVERSAL_FRAMES`.
 */
function _measureReversal(luma, frame, direction) {
  let furthest = luma[frame];
  let reversal = 0;
  let reversalFrame;
  const last = Math.min(luma.length - 1, frame + CUT_REVERSAL_FRAMES);
  for (let later = frame + 1; later <= last; later++) {
    furthest =
      direction > 0
        ? Math.max(furthest, luma[later])
        : Math.min(furthest, luma[later]);
    const back = direction * (furthest - luma[later]);
    if (back > reversal) {
      reversal = back;
      reversalFrame = later;
    }
  }
  return { reversal, reversalFrame };
}

/**
 * Judges each declared cut, where `frame` is the first frame of the new shot.
 * `accepted`: the jump is over `LUMA_JUMP` and holds. `flash`: it swings back
 * by more than `LUMA_JUMP` within `CUT_REVERSAL_FRAMES`. `under-limit`: the
 * ordinary rule already passes it. `outside-video`: no frame before it.
 *
 * @param {number[]} luma
 * @param {number[]} declaredCuts
 */
export function judgeDeclaredCuts(luma, declaredCuts) {
  return declaredCuts.map((frame) => {
    if (frame < 1 || frame >= luma.length)
      return { frame, verdict: "outside-video" };
    const jump = luma[frame] - luma[frame - 1];
    const { reversal, reversalFrame } = _measureReversal(
      luma,
      frame,
      Math.sign(jump),
    );
    let verdict = "under-limit";
    if (Math.abs(jump) > LUMA_JUMP)
      verdict = reversal > LUMA_JUMP ? "flash" : "accepted";
    return { frame, verdict, jump, reversal, reversalFrame };
  });
}

/**
 * Frame-to-frame luma changes over `LUMA_JUMP`, except onto the frame of a
 * declared cut judged `accepted`.
 *
 * @param {number[]} luma
 * @param {{frame: number, verdict: string}[]} judgedCuts
 * @returns {{from: number, to: number, jump: number}[]}
 */
export function findLumaJumps(luma, judgedCuts) {
  const acceptedFrames = new Set(
    judgedCuts
      .filter((cut) => cut.verdict === "accepted")
      .map((cut) => cut.frame),
  );
  const jumps = [];
  for (let index = 1; index < luma.length; index++) {
    const jump = Math.abs(luma[index] - luma[index - 1]);
    if (jump > LUMA_JUMP && !acceptedFrames.has(index))
      jumps.push({ from: index - 1, to: index, jump });
  }
  return jumps;
}
