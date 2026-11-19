import { ramp } from "../../../motion";
import type { VideoMotion } from "../../../videoTheme/createVideoMotion/createVideoMotion";

/** The cue the chart starts to refine on. */
const REFINE_CUE = 40;
/** Frames the refinement takes. */
const REFINE_FRAMES = 72;

/** The frame the refinement ends on, at the theme's tempo. */
export function getRefinementEndFromMotion(motion: VideoMotion): number {
  return REFINE_CUE + motion.scale(REFINE_FRAMES);
}

/** How far the chart has refined, 0 to 1, on the travel curve. */
export function getRefinementFromFrame(
  frame: number,
  motion: VideoMotion,
): number {
  return ramp(
    frame,
    REFINE_CUE,
    motion.scale(REFINE_FRAMES),
    motion.travel.easing,
  );
}
