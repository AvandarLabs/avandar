import { Motion } from "../../../motion";
import type { VideoMotion } from "../../../videoTheme/makeVideoMotionFromTokens/makeVideoMotionFromTokens";
/** The cue the result columns start to unfold beside the page on. */
export const RESULT_CUE = 106;
/** The cue every result column has settled on. */
export const SETTLED_CUE = 139;
/** The cue the page evidence starts to draw on. */
const EVIDENCE_CUE = 13;
/** Frames the page evidence takes to draw. */
const EVIDENCE_FRAMES = 42;
/** How far the structural evidence on the page has drawn, 0 to 1. */
export function getEvidenceFromFrame({
  frame,
  motion,
}: Readonly<{
  frame: number;
  motion: VideoMotion;
}>): number {
  return Motion.ramp({
    frame,
    at: EVIDENCE_CUE,
    dur: motion.scale(EVIDENCE_FRAMES),
    easing: motion.reveal.easing,
  });
}
