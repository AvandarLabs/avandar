// The gate. It catches two defects that look like encoder problems but are
// not. No encoder setting fixes either one:
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
// "fix" a failure by loosening the thresholds in
// scripts/lib/FrameGateMeasurements/FrameGateMeasurements.constants.ts.
//
// Usage: node --import tsx scripts/checkFrames.ts out/demo.mp4 [--standalone]
//          [--declared-cuts 602,1022]
import { propIsInArray } from "@avandar/utils";
import { match } from "ts-pattern";
import { FrameGateMeasurements } from "../lib/FrameGateMeasurements/FrameGateMeasurements";
import {
  CUT_REVERSAL_FRAMES,
  LUMA_JUMP,
} from "../lib/FrameGateMeasurements/FrameGateMeasurements.constants";
import { getFrameMeasurementsFromVideo } from "../lib/FrameGateMeasurements/getFrameMeasurementsFromVideo";
import { makeGateArgumentsFromArgv } from "../lib/FrameGateMeasurements/makeGateArgumentsFromArgv";
import { requireLicense } from "../requireLicense";
import { ProducerCli } from "../runProducerCommand/ProducerCli/ProducerCli.mjs";
import type {
  FrameMeasurements,
  GateArguments,
  JudgedCut,
} from "../lib/FrameGateMeasurements/FrameGateMeasurements.types";
/** Runs one gate step, exiting with status 2 and its message when it throws. */
function _runOrExit<T>(step: () => T): T {
  try {
    return step();
  } catch (error) {
    ProducerCli.failure("check", error);
    return process.exit(2);
  }
}
/** One line of the declared-cut report. */
function _describeCut({
  cut,
  frameCount,
}: Readonly<{
  cut: Readonly<JudgedCut>;
  frameCount: number;
}>): string {
  const frame = `  frame ${String(cut.frame).padEnd(6)}`;
  const jumpValue = cut.jump ?? 0;
  const jump = `jump ${jumpValue >= 0 ? "+" : ""}${jumpValue.toFixed(1)}`;
  const reversal = `swings back ${(cut.reversal ?? 0).toFixed(1)}`;
  const held = (status: string) => {
    return `${frame}${status}  ${jump}, ${reversal} at most within ${CUT_REVERSAL_FRAMES} frames`;
  };
  return match(cut.verdict)
    .with("outside-video", () => {
      return `${frame}rejected   not in this ${frameCount}-frame video`;
    })
    .with("flash", () => {
      return `${frame}rejected   ${jump}, ${reversal} by frame ${cut.reversalFrame}: a flash, not a cut`;
    })
    .with("accepted", () => {
      return held("accepted ");
    })
    .with("under-limit", () => {
      return held("under limit");
    })
    .exhaustive();
}
/** Prints the loop seam line for the first and last frame's luma. */
function _printLoopSeam({
  luma,
  seam,
  isStandalone,
}: Readonly<{
  luma: readonly number[];
  seam: number;
  isStandalone: boolean;
}>): void {
  const firstLuma = luma[0].toFixed(1);
  const lastLuma = luma[luma.length - 1].toFixed(1);
  if (isStandalone) {
    console.error(
      `\nloop seam: not checked (--standalone) - last frame Y=${lastLuma}, first Y=${firstLuma}`,
    );
    return;
  }
  const warning = seam > LUMA_JUMP ? "  <-- flashes on every loop" : "";
  console.error(
    `\nloop seam: frame ${luma.length - 1} Y=${lastLuma} -> frame 0 Y=${firstLuma}   jump ${seam.toFixed(1)}${warning}`,
  );
}
/** Prints the gate report and returns whether the render fails it. */
function _reportGate({
  options,
  measured,
}: Readonly<{
  options: Readonly<GateArguments>;
  measured: Readonly<FrameMeasurements>;
}>): boolean {
  const { luma } = measured;
  const tiled = FrameGateMeasurements.getTiledFramesFromMeasurements(measured);
  const cuts = FrameGateMeasurements.makeJudgedCutsFromLuma({
    luma,
    declaredCuts: options.declaredCuts,
  });
  const jumps = FrameGateMeasurements.getLumaJumpsFromLuma({
    luma,
    judgedCuts: cuts,
  });
  _printFrameSummary({ measured, tiled });
  _printDeclaredCuts({ cuts, frameCount: luma.length });
  console.error(
    `\nluminance jumps over ${LUMA_JUMP}: ${jumps.length ? "" : "none"}`,
  );
  jumps.forEach((jump) => {
    console.error(
      `  frame ${jump.from} -> ${jump.to}   jump ${jump.jump.toFixed(1)}`,
    );
  });
  const seam = Math.abs(luma[0] - luma[luma.length - 1]);
  _printLoopSeam({ luma, seam, isStandalone: options.isStandalone });
  const hasRejectedCut = cuts.some(
    propIsInArray("verdict", ["flash", "outside-video"]),
  );
  return (
    tiled.length > 0 ||
    jumps.length > 0 ||
    hasRejectedCut ||
    (!options.isStandalone && seam > LUMA_JUMP)
  );
}
requireLicense();
const options = _runOrExit(() => {
  return makeGateArgumentsFromArgv(process.argv.slice(2));
});
const measured = _runOrExit(() => {
  return getFrameMeasurementsFromVideo(options.file);
});
process.exit(
  _reportGate({
    options,
    measured,
  })
    ? 1
    : 0,
);

/** Prints the measured frame shape and every tiled-frame observation. */
function _printFrameSummary({
  measured: frameMeasurements,
  tiled,
}: Readonly<{
  measured: Readonly<FrameMeasurements>;
  tiled: ReturnType<
    typeof FrameGateMeasurements.getTiledFramesFromMeasurements
  >;
}>): void {
  const { width, height, luma } = frameMeasurements;
  console.error(`${luma.length} frames, ${width}x${height}`);
  console.error(`\ntiled frames: ${tiled.length ? "" : "none"}`);
  tiled.forEach((tile) => {
    console.error(
      `  frame ${tile.frame} - halves match +${tile.spike.toFixed(1)} dB vs neighbours`,
    );
  });
}

/** Prints the verdict for every explicitly declared cut. */
function _printDeclaredCuts({
  cuts,
  frameCount,
}: Readonly<{
  cuts: ReturnType<typeof FrameGateMeasurements.makeJudgedCutsFromLuma>;
  frameCount: number;
}>): void {
  if (cuts.length) {
    console.error(
      `\ndeclared cuts (a jump is accepted if it does not swing back over ${LUMA_JUMP} within ${CUT_REVERSAL_FRAMES} frames):`,
    );
    cuts.forEach((cut) => {
      return console.error(
        _describeCut({
          cut,
          frameCount,
        }),
      );
    });
  }
}
