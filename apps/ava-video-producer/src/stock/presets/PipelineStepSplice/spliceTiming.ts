import { ramp } from "../../../motion";
import type { VideoMotion } from "../../../videoTheme/createVideoMotion/createVideoMotion";

/** The cue the original steps start to separate on. */
export const SEPARATE_CUE = 38;
/** Frames the original steps take to open the gap. */
export const SEPARATE_FRAMES = 30;

/** How far the original steps have separated, 0 to 1. */
export function getSeparationFromFrame(
  frame: number,
  motion: VideoMotion,
): number {
  return ramp(
    frame,
    SEPARATE_CUE,
    motion.scale(SEPARATE_FRAMES),
    motion.travel.easing,
  );
}
