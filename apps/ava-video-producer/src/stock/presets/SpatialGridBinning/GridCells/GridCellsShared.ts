const OUTLINE_AT = 13;
const OUTLINE_FRAMES = 37;
const SHADE_AT = 111;
const SHADE_FRAMES = 28;
const SHADE_FLOOR = 0.04;
const SHADE_RANGE = 0.36;
/** Coordinates grid outline and density-shading timing and opacity. */
export const GridCellsShared = {
  /** Frame when cell fills start revealing the point distribution. */
  SHADE_AT,
  /** Cell fill fade duration in frames at tempo 1. */
  SHADE_FRAMES,
  /** Minimum cell fill opacity before theme wash scaling. */
  SHADE_FLOOR,
  /** Extra fill opacity for a cell holding all points, before scaling. */
  SHADE_RANGE,
  /** Frame when grid cell outlines start to appear. */
  OUTLINE_AT,
  /** Grid outline fade duration in frames at tempo 1. */
  OUTLINE_FRAMES,
} as const;
