// The gate. Two defects that actually shipped, and were both misdiagnosed
// as encoder problems before they were understood:
//
//  1. Tiled frames. Chromium's GPU compositor occasionally hands Remotion a
//     screenshot where the whole page texture is wrapped, so the frame comes
//     out as a 2x3 grid of itself. It hits isolated frames: a handful out
//     of several hundred, at random. So it reads as a flash rather than as
//     obvious corruption, and it survives every encoder setting you try.
//     Detected by comparing each frame's left half to its right half and
//     flagging frames that match far better than their neighbours do. A
//     frame bordering a near-uniform frame is mostly that flat field, so it
//     must also match like a copy (COPY_MATCH_DB) to be flagged.
//
//  2. Full-frame luminance jumps. A one-frame flip between a light panel
//     and a dark one is a strobe. The loop seam counts: the last frame
//     cutting back to frame 0 happens every time the tile repeats, and it
//     is the one nobody checks.
//
// Declared cuts. A storyboard shot with `transition: {kind: "cut"}` is a
// hard cut on purpose, and `npm run video -- render` passes its first frame
// here as `--declared-cuts`. On exactly that frame a jump of any size is
// accepted, but only if the luminance does not swing back by more than
// LUMA_JUMP within the next 10 frames: a jump and its reversal is a flash,
// and WCAG 2.3.1 allows at most three a second. Every other frame, and the
// frames on either side of a cut, keep the ordinary limit. Measured on a
// storyboard render, each of six cuts landed entirely on the shot's first
// frame (the frame before moved by 20 at most), so there is no window to
// widen. Fixed compositions and stock clips declare nothing. The output
// lists every declared cut and its verdict.
//
// Wire this into every render script and let it fail the build. Do not
// "fix" a failure by loosening the thresholds in scripts/lib/frameGate.mjs.
//
// Usage: node scripts/check-frames.mjs out/demo.mp4 [--standalone]
//          [--declared-cuts 602,1022]

import {
  CUT_REVERSAL_FRAMES,
  LUMA_JUMP,
  findLumaJumps,
  findTiledFrames,
  judgeDeclaredCuts,
  measureFrames,
  parseGateArguments,
} from "./lib/frameGate.mjs";
import { requireLicense } from "./require-license.mjs";

requireLicense();

let options;
try {
  options = parseGateArguments(process.argv.slice(2));
} catch (error) {
  console.error(error.message);
  process.exit(2);
}

let measured;
try {
  measured = measureFrames(options.file);
} catch (error) {
  console.error(error.message);
  process.exit(2);
}
const { width, height, luma } = measured;

const tiled = findTiledFrames(measured);
const cuts = judgeDeclaredCuts(luma, options.declaredCuts);
const jumps = findLumaJumps(luma, cuts);
const rejectedCuts = cuts.filter(
  (cut) => cut.verdict === "flash" || cut.verdict === "outside-video",
);
const seam = Math.abs(luma[0] - luma[luma.length - 1]);

/** One line of the declared-cut report. */
function describeCut(cut) {
  const frame = `  frame ${String(cut.frame).padEnd(6)}`;
  if (cut.verdict === "outside-video")
    return `${frame}rejected   not in this ${luma.length}-frame video`;
  const jump = `jump ${cut.jump >= 0 ? "+" : ""}${cut.jump.toFixed(1)}`;
  const reversal = `swings back ${cut.reversal.toFixed(1)}`;
  if (cut.verdict === "flash")
    return `${frame}rejected   ${jump}, ${reversal} by frame ${cut.reversalFrame}: a flash, not a cut`;
  const status = cut.verdict === "accepted" ? "accepted " : "under limit";
  return `${frame}${status}  ${jump}, ${reversal} at most within ${CUT_REVERSAL_FRAMES} frames`;
}

console.log(`${luma.length} frames, ${width}x${height}`);
console.log(`\ntiled frames: ${tiled.length ? "" : "none"}`);
for (const tile of tiled)
  console.log(
    `  frame ${tile.frame} — halves match +${tile.spike.toFixed(1)} dB vs neighbours`,
  );
if (cuts.length) {
  console.log(
    `\ndeclared cuts (a jump is accepted if it does not swing back over ${LUMA_JUMP} within ${CUT_REVERSAL_FRAMES} frames):`,
  );
  for (const cut of cuts) console.log(describeCut(cut));
}
console.log(
  `\nluminance jumps over ${LUMA_JUMP}: ${jumps.length ? "" : "none"}`,
);
for (const jump of jumps)
  console.log(
    `  frame ${jump.from} -> ${jump.to}   jump ${jump.jump.toFixed(1)}`,
  );
if (options.isStandalone) {
  console.log(
    `\nloop seam: not checked (--standalone) — last frame Y=${luma[luma.length - 1].toFixed(1)}, first Y=${luma[0].toFixed(1)}`,
  );
} else {
  console.log(
    `\nloop seam: frame ${luma.length - 1} Y=${luma[luma.length - 1].toFixed(1)} -> frame 0 ` +
      `Y=${luma[0].toFixed(1)}   jump ${seam.toFixed(1)}${
        seam > LUMA_JUMP ? "  <-- flashes on every loop" : ""
      }`,
  );
}

const isFailing =
  tiled.length ||
  jumps.length ||
  rejectedCuts.length ||
  (!options.isStandalone && seam > LUMA_JUMP);
process.exit(isFailing ? 1 : 0);
