import { getHundredthsFromQuantity } from "./getHundredthsFromQuantity";
import type { Input } from "./SavedSeedSeasonReturn.schema";
/** Data for getSeedBalancesFromInput. */
type GetSeedBalancesFromInputResult = {
  harvest: number;
  reserve: number;
  loss: number;
  sown: number;
  current: number;
  remaining: number;
  scale: number;
};

/**
 * Exact destination hundredths and one spatial scale for the supplied harvest.
 */
export function getSeedBalancesFromInput(
  input: Readonly<Input>,
): GetSeedBalancesFromInputResult {
  const harvest = getHundredthsFromQuantity(input.crop.harvestQuantity);
  const reserve = getHundredthsFromQuantity(input.crop.reservedQuantity);
  const loss = getHundredthsFromQuantity(input.crop.storageLossQuantity);
  const sown = getHundredthsFromQuantity(input.crop.sownQuantity);
  return {
    harvest,
    reserve,
    loss,
    sown,
    current: harvest - reserve,
    remaining: reserve - loss - sown,
    scale: 180 / harvest,
  };
}
