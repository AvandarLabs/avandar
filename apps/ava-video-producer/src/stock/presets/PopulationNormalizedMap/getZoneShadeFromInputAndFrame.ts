import { EASE, ramp } from "../../../motion";
import { getPopulationRateFromCounts } from "./getPopulationRateFromCounts";
import type { Input } from "./PopulationNormalizedMap.schema";
type Props = { zone: Input["zones"][number]; input: Input; frame: number };
/**
 * Explicit domains determine the shade before and after population
 * normalization.
 */
export function getZoneShadeFromInputAndFrame({
  zone,
  input,
  frame,
}: Readonly<Props>): { rate: number; opacity: number } {
  const countFraction = zone.records / input.colorDomains.countMaximum;
  const rate = getPopulationRateFromCounts({
    ...zone,
    rateBase: input.rateBase,
  });
  const rateFraction = rate / input.colorDomains.normalizedMaximum;
  const opacity =
    0.12 +
    0.76 *
      (countFraction +
        (rateFraction - countFraction) * ramp(frame, 72, 36, EASE.inOut));
  return { rate, opacity };
}
