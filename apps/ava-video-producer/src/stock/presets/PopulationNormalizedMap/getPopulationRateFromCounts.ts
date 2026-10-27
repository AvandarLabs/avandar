/**
 * Computes a rate from validated counts without division-first rounding.
 * Records <=100 and rateBase <=1000 keep the integer product exactly
 * representable.
 */
export function getPopulationRateFromCounts({
  records,
  population,
  rateBase,
}: Readonly<{
  records: number;
  population: number;
  rateBase: number;
}>): number {
  return (records * rateBase) / population;
}
