import { ramp } from "../../../motion";
import type { VideoMotion } from "../../../videoTheme/createVideoMotion/createVideoMotion";

/** The cue subscribed views start to exclude other categories on. */
const EXCLUDE_CUE = 91;
/** Frames the exclusion sweep takes. */
const EXCLUDE_FRAMES = 48;

/** How far subscribed views have excluded other categories, 0 to 1. */
export function getExclusionFromFrame(
  frame: number,
  motion: VideoMotion,
): number {
  return ramp(
    frame,
    EXCLUDE_CUE,
    motion.scale(EXCLUDE_FRAMES),
    motion.reveal.easing,
  );
}
