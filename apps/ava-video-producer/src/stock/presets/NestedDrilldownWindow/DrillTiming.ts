import { ramp } from "../../../motion";
import type { VideoMotion } from "../../../videoTheme/createVideoMotion/createVideoMotion";
/** The cue the parent selection starts to open on. */
const PARENT_CUE = 40;
/** The cue the parent is open and the second selection starts on. */
const CHILD_CUE = 74;
/** Frames the second selection takes to open into the detail window. */
const CHILD_FRAMES = 44;
/** A selection frame's line weight in the inset style, before scaling. */
const INSET_STROKE = 5;
/** How far the parent selection has opened, landing on the child cue. */
function _getParentFromFrame({
  frame,
  motion,
}: Readonly<{ frame: number; motion: VideoMotion }>): number {
  return ramp(frame, PARENT_CUE, CHILD_CUE - PARENT_CUE, motion.reveal.easing);
}
/** How far the second selection has opened, at the theme's tempo. */
function _getChildFromFrame({
  frame,
  motion,
}: Readonly<{ frame: number; motion: VideoMotion }>): number {
  return ramp(
    frame,
    CHILD_CUE,
    motion.scale(CHILD_FRAMES),
    motion.reveal.easing,
  );
}
/** Times the nested parent and child selection windows opening into detail. */
export const DrillTiming = {
  /** How far the parent selection has opened, landing on the child cue. */
  getParentFromFrame: _getParentFromFrame,
  /** How far the second selection has opened, at the theme's tempo. */
  getChildFromFrame: _getChildFromFrame,
  /** The cue the parent selection starts to open on. */
  PARENT_CUE,
  /** The cue the parent is open and the second selection starts on. */
  CHILD_CUE,
  /** A selection frame's line weight in the inset style, before scaling. */
  INSET_STROKE,
};
