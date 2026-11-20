import { ramp } from "../../../../../motion";
import type { VideoMotion } from "../../../../../videoTheme/createVideoMotion/createVideoMotion";
/** Frames the carried result takes to appear or fade. */
const RESULT_FADE_FRAMES = 4;
/** The result's fade over the first return, then over the second. */
function _getResultOpacity({
  frame,
  motion,
}: Readonly<{ frame: number; motion: VideoMotion }>): number {
  const fade = motion.scale(RESULT_FADE_FRAMES);
  return frame < 102
    ? ramp(frame, 60, fade, motion.reveal.easing) *
        (1 - ramp(frame, 88, 92 - 88, motion.exit.easing))
    : ramp(frame, 120, fade, motion.reveal.easing) *
        (1 - ramp(frame, 134, 138 - 134, motion.exit.easing));
}
/** Shared values and calculations for the CacheLookupToken visuals. */
export const CacheLookupTokenShared = {
  /** The result's fade over the first return, then over the second. */
  getResultOpacity: _getResultOpacity,
  /** Frames the carried result takes to appear or fade. */
  RESULT_FADE_FRAMES,
} as const;
