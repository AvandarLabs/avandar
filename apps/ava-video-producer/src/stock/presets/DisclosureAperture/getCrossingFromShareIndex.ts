import type { VideoMotion } from "../../../videoTheme/makeVideoMotionFromTokens/makeVideoMotionFromTokens";
/** The cue the first shared copy starts to cross on. */
const FIRST_CROSSING_CUE = 36;
/** Frames between neighbouring shared copies starting to cross. */
const CROSSING_STAGGER_FRAMES = 12;
/** Frames a shared copy takes to cross, while its aperture stays open. */
const CROSSING_FRAMES = 24;
/**
 * When the shared copy at `shareIndex` starts to cross and how long it takes,
 * at the theme's tempo. The aperture opposite it is open for the same span.
 */
export function getCrossingFromShareIndex({
  shareIndex,
  motion,
}: Readonly<{ shareIndex: number; motion: VideoMotion }>): {
  at: number;
  duration: number;
} {
  return {
    at:
      FIRST_CROSSING_CUE +
      shareIndex * motion.scaleStagger(CROSSING_STAGGER_FRAMES),
    duration: motion.scale(CROSSING_FRAMES),
  };
}
