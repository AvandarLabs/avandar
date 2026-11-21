import { type MaterialCase } from "./SavedSeedSeasonReturnContractTestState.types";

/** Cases that retain the authored sowing and reserve balances. */
type SeedCases = MaterialCase[];

/**
 * Makes fresh fixture state for zero reserve loss and sowing edges conserve
 * exact decimal material without invented use.
 */
export function makeZeroReserveLossSowingCasesFromAuthoredValues(): SeedCases {
  return [
    {
      harvestQuantity: 8.03,
      reservedQuantity: 0,
      storageLossQuantity: 0,
      sownQuantity: 0,
      current: 8.03,
      remaining: 0,
    },
    {
      harvestQuantity: 8.03,
      reservedQuantity: 8.03,
      storageLossQuantity: 8.03,
      sownQuantity: 0,
      current: 0,
      remaining: 0,
    },
    {
      harvestQuantity: 8.03,
      reservedQuantity: 8.03,
      storageLossQuantity: 0.01,
      sownQuantity: 8.02,
      current: 0,
      remaining: 0,
    },
    {
      harvestQuantity: 8.03,
      reservedQuantity: 7.02,
      storageLossQuantity: 1.01,
      sownQuantity: 0.01,
      current: 1.01,
      remaining: 6,
    },
    {
      harvestQuantity: 8.03,
      reservedQuantity: 3.01,
      storageLossQuantity: 0.01,
      sownQuantity: 0,
      current: 5.02,
      remaining: 3,
    },
  ];
}
