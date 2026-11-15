import { STOCK } from "../../stockPalette";
/** Stable numbered colors identify all physical and accounting destinations. */
export const WATER_DESTINATIONS = {
  infiltration: { number: 1, color: STOCK.cyan },
  discharge: { number: 2, color: STOCK.mint },
  detained: { number: 3, color: "#b7a3e8" },
  overflow: { number: 4, color: STOCK.orange },
} as const;
/** A conserved destination rather than an optional display state. */
export type WaterDestination = keyof typeof WATER_DESTINATIONS;
