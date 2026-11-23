import { Motion } from "../../../../../motion";
import type { VideoMotion } from "../../../../../videoTheme/makeVideoMotionFromTokens/makeVideoMotionFromTokens";
/** Frames the carried result takes to appear or fade. */
const RESULT_FADE_FRAMES = 4;
/** The result's fade over the first return, then over the second. */
function _getResultOpacity({
  frame,
  motion,
}: Readonly<{
  frame: number;
  motion: VideoMotion;
}>): number {
  const fade = motion.scale(RESULT_FADE_FRAMES);
  return frame < 102
    ? Motion.ramp({
        frame,
        at: 60,
        dur: fade,
        easing: motion.reveal.easing,
      }) *
        (1 -
          Motion.ramp({
            frame,
            at: 88,
            dur: 92 - 88,
            easing: motion.exit.easing,
          }))
    : Motion.ramp({
        frame,
        at: 120,
        dur: fade,
        easing: motion.reveal.easing,
      }) *
        (1 -
          Motion.ramp({
            frame,
            at: 134,
            dur: 138 - 134,
            easing: motion.exit.easing,
          }));
}
/**
 * Return fade timing used by CarriedResult and CacheLookupToken to reveal
 * reused results.
 */
export const CacheLookupTokenShared = {
  /** The result's fade over the first return, then over the second. */
  getResultOpacity: _getResultOpacity,
  /** Frames the carried result takes to appear or fade. */
  RESULT_FADE_FRAMES,
} as const;
