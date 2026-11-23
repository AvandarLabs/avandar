const VALUES = ["motions", "compositions", "films", "helpers"] as const;
/** One top-level collection in the Motion Atlas. */
export type AtlasSectionName = (typeof VALUES)[number];
/** The Motion Atlas collections in navigation order. */
export const AtlasSectionNames = {
  /** Section names available in the Motion Atlas gallery. */
  values: VALUES,
  /** Whether a value names an Atlas collection. */
  isValid: (value: unknown): value is AtlasSectionName => {
    return VALUES.some((section) => {
      return section === value;
    });
  },
};
