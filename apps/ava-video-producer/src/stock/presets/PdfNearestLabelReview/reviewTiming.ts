import { ramp } from "../../../motion";
import type { VideoMotion } from "../../../videoTheme/createVideoMotion/createVideoMotion";

/** The cue the distance guides start to reach their labels on. */
export const MEASURE_CUE = 51;
/** The cue the association is stated on, once every distance is measured. */
export const STATUS_CUE = 95;
/** Frames each candidate takes to fade in. */
const CANDIDATE_FRAMES = 35;

/** How far the distance guides have reached, landing on the status cue. */
export function getMeasureFromFrame(
  frame: number,
  motion: VideoMotion,
): number {
  return ramp(
    frame,
    MEASURE_CUE,
    STATUS_CUE - MEASURE_CUE,
    motion.travel.easing,
  );
}

/** How far the candidate at `index` has faded in, on the list stagger. */
export function getCandidateFromFrame(
  frame: number,
  index: number,
  motion: VideoMotion,
): number {
  return ramp(
    frame,
    13 + index * motion.stagger.list,
    motion.scale(CANDIDATE_FRAMES),
    motion.reveal.easing,
  );
}
