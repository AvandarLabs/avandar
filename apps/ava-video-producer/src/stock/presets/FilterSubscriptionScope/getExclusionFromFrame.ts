import { Motion } from "../../../motion";
import type { VideoMotion } from "../../../videoTheme/makeVideoMotionFromTokens/makeVideoMotionFromTokens";
/** The cue subscribed views start to exclude other categories on. */
const EXCLUDE_CUE = 91;
/** Frames the exclusion sweep takes. */
const EXCLUDE_FRAMES = 48;
/** How far subscribed views have excluded other categories, 0 to 1. */
export function getExclusionFromFrame({
  frame,
  motion,
}: Readonly<{
  frame: number;
  motion: VideoMotion;
}>): number {
  return Motion.ramp({
    frame,
    at: EXCLUDE_CUE,
    dur: motion.scale(EXCLUDE_FRAMES),
    easing: motion.reveal.easing,
  });
}
