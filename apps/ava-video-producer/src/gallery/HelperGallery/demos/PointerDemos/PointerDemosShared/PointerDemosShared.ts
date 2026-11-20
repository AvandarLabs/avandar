/** Stable names of the three shutter samples, oldest first. */
const SAMPLE_NAMES = ["far", "middle", "near"] as const;
/** How much the shutter samples are enlarged in the inset. */
const INSET_SCALE = 12;
/** Shared values and calculations for the PointerDemos visuals. */
export const PointerDemosShared = {
  /** Stable names of the three shutter samples, oldest first. */
  SAMPLE_NAMES,
  /** How much the shutter samples are enlarged in the inset. */
  INSET_SCALE,
} as const;
