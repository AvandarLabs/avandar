import { getPopulationRateFromCounts } from "./getPopulationRateFromCounts";
import { getZoneShadeFromFraction } from "./zoneShade";
import type { VideoMotion } from "../../../videoTheme/createVideoMotion/createVideoMotion";
import type { Input } from "./PopulationNormalizedMap.schema";

type Props = {
  zone: Input["zones"][number];
  input: Input;
  frame: number;
  motion: VideoMotion;
};
/**
 * Explicit domains determine the shade before and after population
 * normalization.
 */
export function getZoneShadeFromInputAndFrame({
  zone,
  input,
  frame,
  motion,
}: Readonly<Props>): { rate: number; opacity: number } {
  const countFraction = zone.records / input.colorDomains.countMaximum;
  const rate = getPopulationRateFromCounts({
    ...zone,
    rateBase: input.rateBase,
  });
  const rateFraction = rate / input.colorDomains.normalizedMaximum;
  const opacity = getZoneShadeFromFraction(
    countFraction +
      (rateFraction - countFraction) *
        motion.ramp(frame, 72, motion.scale(36), motion.travel.easing),
  );
  return { rate, opacity };
}
