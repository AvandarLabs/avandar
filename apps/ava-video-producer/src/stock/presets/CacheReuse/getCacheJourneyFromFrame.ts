import { Motion } from "../../../motion";
import type { VideoMotion } from "../../../videoTheme/makeVideoMotionFromTokens/makeVideoMotionFromTokens";

/** Data for getCacheJourneyFromFrame. */
type GetCacheJourneyResult = {
  x: number;
  y: number;
  originActive: number;
  stored: number;
  response: number;
};

type TravelOptions = {
  frame: Readonly<{
    frame: number;
    motion: VideoMotion;
  }>["frame"];
  motion: Readonly<{
    frame: number;
    motion: VideoMotion;
  }>["motion"];
};

type TravelResult = {
  travel: Readonly<{
    frame: number;
    motion: VideoMotion;
  }>["motion"]["travel"]["easing"];
  outbound: number;
  originTrip: number;
  originReturn: number;
  firstReturn: number;
};

type OutboundOptions = {
  frame: Readonly<{
    frame: number;
    motion: VideoMotion;
  }>["frame"];
  motion: Readonly<{
    frame: number;
    motion: VideoMotion;
  }>["motion"];
};

type OutboundResult = {
  outbound: TravelResult["outbound"];
  originTrip: TravelResult["originTrip"];
  originReturn: TravelResult["originReturn"];
  firstReturn: TravelResult["firstReturn"];
  secondOut: number;
  secondBack: number;
};

type GetCacheKeyCoordinatesOptions = {
  frame: Readonly<{
    frame: number;
    motion: VideoMotion;
  }>["frame"];
  outbound: OutboundResult["outbound"];
  originTrip: OutboundResult["originTrip"];
  originReturn: OutboundResult["originReturn"];
  firstReturn: OutboundResult["firstReturn"];
  secondOut: OutboundResult["secondOut"];
  secondBack: OutboundResult["secondBack"];
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

/** Samples the cache key coordinates for the current authored frame. */
function _getCacheKeyCoordinates({
  frame,
  outbound,
  originTrip,
  originReturn,
  firstReturn,
  secondOut,
  secondBack,
}: Readonly<GetCacheKeyCoordinatesOptions>): { x: number; y: number } {
  return {
    x:
      frame < FIRST_RETURN_CUE
        ? Motion.mix({
            t: outbound,
            from: 190,
            to: 650,
          })
        : frame < 102
          ? Motion.mix({
              t: firstReturn,
              from: 650,
              to: 190,
            })
          : frame < 120
            ? Motion.mix({
                t: secondOut,
                from: 190,
                to: 650,
              })
            : Motion.mix({
                t: secondBack,
                from: 650,
                to: 190,
              }),
    y:
      frame < FIRST_RETURN_CUE
        ? 290 + 150 * originTrip * (1 - originReturn)
        : 290,
  };
}

/**
 * Samples the cache journey from frame travel state for the current authored
 * frame.
 */
function _getCacheJourneyFromFrameTravelState({
  frame,
  motion,
}: Readonly<TravelOptions>): TravelResult {
  const travel = motion.travel.easing;
  const outbound = Motion.ramp({
    frame,
    at: 24,
    dur: motion.scale(OUTBOUND_FRAMES),
    easing: travel,
  });
  const originTrip = Motion.ramp({
    frame,
    at: 42,
    dur: motion.scale(ORIGIN_TRIP_FRAMES),
    easing: travel,
  });
  const originReturn = Motion.ramp({
    frame,
    at: 60,
    dur: FIRST_RETURN_CUE - 60,
    easing: travel,
  });
  const firstReturn = Motion.ramp({
    frame,
    at: FIRST_RETURN_CUE,
    dur: motion.scale(FIRST_RETURN_FRAMES),
    easing: travel,
  });
  return { travel, outbound, originTrip, originReturn, firstReturn };
}

/**
 * Samples the cache journey from frame outbound state for the current authored
 * frame.
 */
function _getCacheJourneyFromFrameOutboundState({
  frame,
  motion,
}: Readonly<OutboundOptions>): OutboundResult {
  const { travel, outbound, originTrip, originReturn, firstReturn } =
    _getCacheJourneyFromFrameTravelState({ frame, motion });
  const secondOut = Motion.ramp({
    frame,
    at: 102,
    dur: motion.scale(SECOND_OUT_FRAMES),
    easing: travel,
  });
  const secondBack = Motion.ramp({
    frame,
    at: 120,
    dur: motion.hero,
    easing: travel,
  });
  return {
    outbound,
    originTrip,
    originReturn,
    firstReturn,
    secondOut,
    secondBack,
  };
}

/** Where the lookup key is: out to the cache, down to the origin, and back. */
function _getKeyPosition({
  frame,
  motion,
}: Readonly<{
  frame: number;
  motion: VideoMotion;
}>): Pick<GetCacheJourneyResult, "x" | "y"> {
  const {
    outbound,
    originTrip,
    originReturn,
    firstReturn,
    secondOut,
    secondBack,
  } = _getCacheJourneyFromFrameOutboundState({ frame, motion });
  return _getCacheKeyCoordinates({
    frame,
    outbound,
    originTrip,
    originReturn,
    firstReturn,
    secondOut,
    secondBack,
  });
}

/** Two exact-key lookups: one origin excursion followed by local reuse. */
export function getCacheJourneyFromFrame({
  frame,
  motion,
}: Readonly<{
  frame: number;
  motion: VideoMotion;
}>): GetCacheJourneyResult {
  return {
    ..._getKeyPosition({ frame, motion }),
    originActive:
      Motion.ramp({
        frame,
        at: 42,
        dur: motion.whip,
        easing: motion.reveal.easing,
      }) *
      (1 -
        Motion.ramp({
          frame,
          at: FIRST_RETURN_CUE,
          dur: motion.reveal.duration,
          easing: motion.exit.easing,
        })),
    stored: Motion.ramp({
      frame,
      at: FIRST_RETURN_CUE,
      dur: motion.scale(STORED_FRAMES),
      easing: motion.reveal.easing,
    }),
    response: Motion.ramp({
      frame,
      at: 78,
      dur: motion.scale(RESPONSE_FRAMES),
      easing: motion.reveal.easing,
    }),
  };
}
