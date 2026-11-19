import { ramp } from "../../../motion";
import type { VideoMotion } from "../../../videoTheme/createVideoMotion/createVideoMotion";

/** The cue the parent selection starts to open on. */
export const PARENT_CUE = 40;
/** The cue the parent is open and the second selection starts on. */
export const CHILD_CUE = 74;
/** Frames the second selection takes to open into the detail window. */
const CHILD_FRAMES = 44;
/** A selection frame's line weight in the inset style, before scaling. */
export const INSET_STROKE = 5;

/** How far the parent selection has opened, landing on the child cue. */
export function getParentFromFrame(frame: number, motion: VideoMotion): number {
  return ramp(frame, PARENT_CUE, CHILD_CUE - PARENT_CUE, motion.reveal.easing);
}

/** How far the second selection has opened, at the theme's tempo. */
export function getChildFromFrame(frame: number, motion: VideoMotion): number {
  return ramp(
    frame,
    CHILD_CUE,
    motion.scale(CHILD_FRAMES),
    motion.reveal.easing,
  );
}
