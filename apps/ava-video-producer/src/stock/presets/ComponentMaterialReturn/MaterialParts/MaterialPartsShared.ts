const REPLACEMENT_CORNER = 6;
const SOURCE_CORNER = 2;
/** Distinguishes original and replacement parts through their corner radii. */
export const MaterialPartsShared = {
  /** Replacement part corner radius before theme corner scaling. */
  REPLACEMENT_CORNER,
  /** Original part corner radius before theme corner scaling. */
  SOURCE_CORNER,
} as const;
