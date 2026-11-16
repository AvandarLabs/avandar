import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { prop } from "@avandar/utils";
import {
  getLumaJumpsFromLuma,
  getTiledFramesFromMeasurements,
  makeJudgedCutsFromLuma,
  getFrameMeasurementsFromVideo,
  makeGateArgumentsFromArgv,
} from "../scripts/lib/frameGateHelpers";

/** A steady luma track with `values` written over it from `startFrame`. */
function createLumaTrack(
  length: number,
  startFrame: number,
  values: number[],
): number[] {
  const luma = Array.from({ length }, () => 100);
  values.forEach((value, offset) => {
    luma[startFrame + offset] = value;
  });
  return luma;
}

test("gate arguments keep the file apart from the declared cut list", () => {
  assert.deepEqual(
    makeGateArgumentsFromArgv(["--declared-cuts", "601,1021", "film.mp4"]),
    { file: "film.mp4", isStandalone: false, declaredCuts: [601, 1021] },
  );
  assert.deepEqual(
    makeGateArgumentsFromArgv([
      "film.mp4",
      "--standalone",
      "--declared-cuts=12",
    ]),
    { file: "film.mp4", isStandalone: true, declaredCuts: [12] },
  );
  assert.deepEqual(
    makeGateArgumentsFromArgv(["film.mp4", "--declared-cuts", ""]),
    {
      file: "film.mp4",
      isStandalone: false,
      declaredCuts: [],
    },
  );
  for (const argv of [
    [],
    ["film.mp4", "--declared-cuts", "abc"],
    ["film.mp4", "--declared-cuts", "1.5"],
    ["film.mp4", "--declared-cuts"],
    ["film.mp4", "--loose"],
  ]) {
    assert.throws(
      () => makeGateArgumentsFromArgv(argv),
      /usage/,
      argv.join(" "),
    );
  }
});

test("a declared cut that holds its new luma is accepted and leaves no jump", () => {
  // A dark field cuts to a light one and stays there, drifting a little.
  const luma = createLumaTrack(40, 20, [235, 230, 228, 226, 226, 226]);
  luma.fill(226, 26);
  luma.fill(5, 0, 20);
  const [cut] = makeJudgedCutsFromLuma(luma, [20]);
  assert.equal(cut.verdict, "accepted");
  assert.equal(cut.frame, 20);
  assert.equal(Math.round(cut.jump ?? 0), 230);
  assert.equal(Math.round(cut.reversal ?? 0), 9);
  assert.deepEqual(getLumaJumpsFromLuma(luma, [cut]), []);
});

test("the same jump without a declaration still fails the gate", () => {
  const luma = createLumaTrack(40, 20, []);
  luma.fill(5, 0, 20);
  assert.deepEqual(getLumaJumpsFromLuma(luma, []), [
    { from: 19, to: 20, jump: 95 },
  ]);
});

test("a declared cut that reverses within ten frames is a flash and fails", () => {
  // Light, a cut to black, and the light back nine frames later.
  const luma = createLumaTrack(40, 20, Array(9).fill(0));
  const [cut] = makeJudgedCutsFromLuma(luma, [20]);
  assert.equal(cut.verdict, "flash");
  assert.equal(cut.reversalFrame, 29);
  assert.equal(cut.reversal, 100);
  assert.deepEqual(getLumaJumpsFromLuma(luma, [cut]).map(prop("to")), [20, 29]);
});

test("a gradual reversal within ten frames is still a flash", () => {
  const luma = createLumaTrack(
    40,
    20,
    [0, 0, 20, 40, 60, 80, 80, 80, 80, 80, 80],
  );
  const [cut] = makeJudgedCutsFromLuma(luma, [20]);
  assert.equal(cut.verdict, "flash");
  assert.equal(cut.reversal, 80);
  assert.equal(cut.reversalFrame, 25);
});

test("a reversal measured from the furthest point the cut reaches", () => {
  // The cut lands at 200, keeps rising to 240, then falls back to 205.
  const luma = createLumaTrack(40, 20, [200, 220, 240, 205]);
  luma.fill(205, 24);
  luma.fill(0, 0, 20);
  const [cut] = makeJudgedCutsFromLuma(luma, [20]);
  assert.equal(cut.verdict, "flash");
  assert.equal(cut.reversal, 35);
});

test("a reversal after ten frames is a new shot, not a flash", () => {
  // Frames 21-30 are the ten after the cut; the light returns on frame 31.
  const luma = createLumaTrack(40, 20, Array(11).fill(0));
  const [cut] = makeJudgedCutsFromLuma(luma, [20]);
  assert.equal(cut.verdict, "accepted");
  assert.deepEqual(getLumaJumpsFromLuma(luma, [cut]).map(prop("to")), [31]);
});

test("a declaration exempts only its own frame, not the frames beside it", () => {
  const luma = createLumaTrack(40, 20, [60, 0]);
  luma.fill(0, 22);
  const [cut] = makeJudgedCutsFromLuma(luma, [20]);
  assert.equal(cut.verdict, "accepted");
  assert.deepEqual(getLumaJumpsFromLuma(luma, [cut]), [
    { from: 20, to: 21, jump: 60 },
  ]);
});

test("a declared cut under the luma limit or outside the video is reported", () => {
  const luma = createLumaTrack(40, 20, Array(20).fill(110));
  const [quiet, outside, first] = makeJudgedCutsFromLuma(luma, [20, 40, 0]);
  assert.equal(quiet.verdict, "under-limit");
  assert.equal(outside.verdict, "outside-video");
  assert.equal(first.verdict, "outside-video");
});

// Measured on a storyboard render: frames 1330-1350 of a blue field film.
// Frame 1338 is an empty field (contrast 40); frame 1339 is the same field
// with a heading and the blurred edge of a window entering.
const MEASURED_HALVES = [
  10.32, 10.32, 10.32, 10.24, 10.33, 10.3, 10.63, 11.67, 12.58, 47.81, 19.27,
  14.76, 13.09, 12.23, 11.45, 10.9, 10.73, 10.71, 10.67, 10.65, 10.62,
];
const MEASURED_CONTRAST = [
  206, 206, 206, 206, 206, 205, 205, 203, 203, 40, 207, 215, 229, 230, 234, 234,
  234, 234, 234, 234, 234,
];

test("a window entering a near-uniform field is not a tiled frame", () => {
  assert.deepEqual(
    getTiledFramesFromMeasurements({
      halves: MEASURED_HALVES,
      contrast: MEASURED_CONTRAST,
    }),
    [],
  );
});

test("a copy-level half match next to a near-uniform frame is still tiled", () => {
  // The same frame rendered as a 2x3 grid of itself measured 54.72 dB.
  const halves = [...MEASURED_HALVES];
  halves[10] = 54.72;
  assert.deepEqual(
    getTiledFramesFromMeasurements({ halves, contrast: MEASURED_CONTRAST }).map(
      (tile) => tile.frame,
    ),
    [10],
  );
});

/** Runs ffmpeg and fails the test on a non-zero exit. */
function runFfmpeg(args: string[]): void {
  const result = spawnSync(
    "ffmpeg",
    ["-hide_banner", "-loglevel", "error", "-y", ...args],
    {
      encoding: "utf8",
    },
  );
  assert.equal(result.status, 0, result.stderr);
}

const TILE_GRAPH =
  "[0]scale=160:60,split=6[a][b][c][d][e][f];[a][b]hstack[r1];" +
  "[c][d]hstack[r2];[e][f]hstack[r3];[r1][r2][r3]vstack=3";

test("a 2x3 grid of its own frame is caught, including next to a uniform frame", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "frame-gate-"));
  try {
    const frame = (index: number) => path.join(directory, `f-${index}.png`);
    runFfmpeg([
      "-f",
      "lavfi",
      "-i",
      "testsrc2=s=320x180:r=30:d=0.6",
      "-start_number",
      "0",
      path.join(directory, "f-%d.png"),
    ]);
    const tiled = path.join(directory, "tiled.png");
    const replaceWithTiled = async (index: number) => {
      runFfmpeg(["-i", frame(index), "-filter_complex", TILE_GRAPH, tiled]);
      await fs.rename(tiled, frame(index));
    };
    await replaceWithTiled(4);
    runFfmpeg([
      "-f",
      "lavfi",
      "-i",
      "color=c=0x4ea3ff:s=320x180",
      "-frames:v",
      "1",
      frame(11),
    ]);
    await replaceWithTiled(12);
    const film = path.join(directory, "film.mp4");
    runFfmpeg([
      "-framerate",
      "30",
      "-i",
      path.join(directory, "f-%d.png"),
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-crf",
      "21",
      "-bf",
      "0",
      film,
    ]);
    const measured = getFrameMeasurementsFromVideo(film);
    assert.equal(measured.halves.length, 18);
    assert.ok(measured.contrast[11] < 120, "frame 11 is near-uniform");
    assert.deepEqual(
      getTiledFramesFromMeasurements(measured).map(prop("frame")),
      [4, 12],
    );
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});
