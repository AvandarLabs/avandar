import { EASE, mix, ramp } from "../../../motion";
/** Data for getCacheJourneyFromFrame. */
type GetCacheJourneyResult = {
  x: number;
  y: number;
  originActive: number;
  stored: number;
  response: number;
};

/** Two exact-key lookups: one origin excursion followed by local reuse. */
export function getCacheJourneyFromFrame(frame: number): GetCacheJourneyResult {
  const outbound = ramp(frame, 24, 18, EASE.inOut);
  const originTrip = ramp(frame, 42, 14, EASE.inOut);
  const originReturn = ramp(frame, 60, 8, EASE.inOut);
  const firstReturn = ramp(frame, 68, 24, EASE.inOut);
  const secondOut = ramp(frame, 102, 16, EASE.inOut);
  const secondBack = ramp(frame, 120, 18, EASE.inOut);
  return {
    x:
      frame < 68
        ? mix(outbound, 190, 650)
        : frame < 102
          ? mix(firstReturn, 650, 190)
          : frame < 120
            ? mix(secondOut, 190, 650)
            : mix(secondBack, 650, 190),
    y: frame < 68 ? 290 + 150 * originTrip * (1 - originReturn) : 290,
    originActive: ramp(frame, 42, 8) * (1 - ramp(frame, 68, 12)),
    stored: ramp(frame, 68, 16),
    response: ramp(frame, 78, 14),
  };
}
