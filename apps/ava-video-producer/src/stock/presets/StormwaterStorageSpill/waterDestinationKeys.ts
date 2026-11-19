/**
 * Stable numbered destinations identify all physical and accounting
 * destinations. Each draws in its own slot of the theme's categorical palette
 * (`color.categorical`).
 */
export const WATER_DESTINATIONS = {
  infiltration: { number: 1, category: 2 },
  discharge: { number: 2, category: 1 },
  detained: { number: 3, category: 5 },
  overflow: { number: 4, category: 3 },
} as const;
/** A conserved destination rather than an optional display state. */
export type WaterDestination = keyof typeof WATER_DESTINATIONS;
