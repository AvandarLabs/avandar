import { mix, ramp } from "../../../motion";
import type { VideoMotion } from "../../../videoTheme/createVideoMotion/createVideoMotion";
/** Data for getCacheJourneyFromFrame. */
type GetCacheJourneyResult = {
  x: number;
  y: number;
  originActive: number;
  stored: number;
  response: number;
};

/** The cue the first response starts back from the origin on. */
const FIRST_RETURN_CUE = 68;
/** Frames the key takes to reach the cache. */
const OUTBOUND_FRAMES = 18;
/** Frames the key takes to drop from the cache to the origin. */
const ORIGIN_TRIP_FRAMES = 14;
/** Frames the first response takes to travel back to the requester. */
const FIRST_RETURN_FRAMES = 24;
/** Frames the repeat lookup takes to reach the cache. */
const SECOND_OUT_FRAMES = 16;
/** Frames the stored entry takes to appear. */
const STORED_FRAMES = 16;
/** Frames the delivered response takes to appear. */
const RESPONSE_FRAMES = 14;

/** Two exact-key lookups: one origin excursion followed by local reuse. */
export function getCacheJourneyFromFrame(
  frame: number,
  motion: VideoMotion,
): GetCacheJourneyResult {
  return {
    ..._getKeyPosition(frame, motion),
    originActive:
      ramp(frame, 42, motion.whip, motion.reveal.easing) *
      (1 -
        ramp(
          frame,
          FIRST_RETURN_CUE,
          motion.reveal.duration,
          motion.exit.easing,
        )),
    stored: ramp(
      frame,
      FIRST_RETURN_CUE,
      motion.scale(STORED_FRAMES),
      motion.reveal.easing,
    ),
    response: ramp(
      frame,
      78,
      motion.scale(RESPONSE_FRAMES),
      motion.reveal.easing,
    ),
  };
}

/** Where the lookup key is: out to the cache, down to the origin, and back. */
function _getKeyPosition(
  frame: number,
  motion: VideoMotion,
): Pick<GetCacheJourneyResult, "x" | "y"> {
  const travel = motion.travel.easing;
  const outbound = ramp(frame, 24, motion.scale(OUTBOUND_FRAMES), travel);
  const originTrip = ramp(frame, 42, motion.scale(ORIGIN_TRIP_FRAMES), travel);
  const originReturn = ramp(frame, 60, FIRST_RETURN_CUE - 60, travel);
  const firstReturn = ramp(
    frame,
    FIRST_RETURN_CUE,
    motion.scale(FIRST_RETURN_FRAMES),
    travel,
  );
  const secondOut = ramp(frame, 102, motion.scale(SECOND_OUT_FRAMES), travel);
  const secondBack = ramp(frame, 120, motion.hero, travel);
  return {
    x:
      frame < FIRST_RETURN_CUE
        ? mix(outbound, 190, 650)
        : frame < 102
          ? mix(firstReturn, 650, 190)
          : frame < 120
            ? mix(secondOut, 190, 650)
            : mix(secondBack, 650, 190),
    y:
      frame < FIRST_RETURN_CUE
        ? 290 + 150 * originTrip * (1 - originReturn)
        : 290,
  };
}
