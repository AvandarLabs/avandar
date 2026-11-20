import { ramp } from "../../../motion";
import type { VideoMotion } from "../../../videoTheme/createVideoMotion/createVideoMotion";
/** The cue the candidates start to align by comparison value on. */
const ALIGN_CUE = 42;
/** The cue the aligned candidates start to fold on. */
const FOLD_CUE = 70;
/** Frames the candidates take to fold into a stack or a pair. */
const FOLD_FRAMES = 30;
/** How far the candidates have aligned, ending as the fold starts. */
function _getAlignFromFrame({
  frame,
  motion,
}: Readonly<{ frame: number; motion: VideoMotion }>): number {
  return ramp(frame, ALIGN_CUE, FOLD_CUE - ALIGN_CUE, motion.entrance.easing);
}
/** How far the candidates have folded, at the theme's tempo. */
function _getFoldFromFrame({
  frame,
  motion,
}: Readonly<{ frame: number; motion: VideoMotion }>): number {
  return ramp(
    frame,
    FOLD_CUE,
    motion.scale(FOLD_FRAMES),
    motion.entrance.easing,
  );
}
/** Times duplicate candidates aligning and folding into a stack or pair. */
export const DuplicateTiming = {
  /** How far the candidates have aligned, ending as the fold starts. */
  getAlignFromFrame: _getAlignFromFrame,
  /** How far the candidates have folded, at the theme's tempo. */
  getFoldFromFrame: _getFoldFromFrame,
  /** The cue the candidates start to align by comparison value on. */
  ALIGN_CUE,
  /** The cue the aligned candidates start to fold on. */
  FOLD_CUE,
};
