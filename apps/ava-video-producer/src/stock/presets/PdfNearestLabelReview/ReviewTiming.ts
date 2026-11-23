import { Motion } from "../../../motion";
import type { VideoMotion } from "../../../videoTheme/makeVideoMotionFromTokens/makeVideoMotionFromTokens";
/** The cue the distance guides start to reach their labels on. */
const MEASURE_CUE = 51;
/** The cue the association is stated on, once every distance is measured. */
const STATUS_CUE = 95;
/** Frames each candidate takes to fade in. */
const CANDIDATE_FRAMES = 35;
/** How far the distance guides have reached, landing on the status cue. */
function _getMeasureFromFrame({
  frame,
  motion,
}: Readonly<{
  frame: number;
  motion: VideoMotion;
}>): number {
  return Motion.ramp({
    frame,
    at: MEASURE_CUE,
    dur: STATUS_CUE - MEASURE_CUE,
    easing: motion.travel.easing,
  });
}
/** How far the candidate at `index` has faded in, on the list stagger. */
function _getCandidateFromFrame({
  frame,
  index,
  motion,
}: Readonly<{
  frame: number;
  index: number;
  motion: VideoMotion;
}>): number {
  return Motion.ramp({
    frame,
    at: 13 + index * motion.stagger.list,
    dur: motion.scale(CANDIDATE_FRAMES),
    easing: motion.reveal.easing,
  });
}
/** Times label candidates, distance measurement, and the association status. */
export const ReviewTiming = {
  /** How far the distance guides have reached, landing on the status cue. */
  getMeasureFromFrame: _getMeasureFromFrame,
  /** How far the candidate at `index` has faded in, on the list stagger. */
  getCandidateFromFrame: _getCandidateFromFrame,
  /** The cue the distance guides start to reach their labels on. */
  MEASURE_CUE,
  /** The cue the association is stated on, once every distance is measured. */
  STATUS_CUE,
};
