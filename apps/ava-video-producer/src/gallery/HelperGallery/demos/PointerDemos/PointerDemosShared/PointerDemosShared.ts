/** Stable names of the three shutter samples, oldest first. */
const SAMPLE_NAMES = ["far", "middle", "near"] as const;
/** How much the shutter samples are enlarged in the inset. */
const INSET_SCALE = 12;
/**
 * Shutter sample names and magnification used by ShutterInset to compare
 * pointer trails.
 */
export const PointerDemosShared = {
  /** Stable names of the three shutter samples, oldest first. */
  SAMPLE_NAMES,
  /** How much the shutter samples are enlarged in the inset. */
  INSET_SCALE,
} as const;
