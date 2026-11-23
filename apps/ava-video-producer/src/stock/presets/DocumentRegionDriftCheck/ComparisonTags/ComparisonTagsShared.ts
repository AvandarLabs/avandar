/** Frames each comparison stroke takes to draw. */
const TAG_DRAW_FRAMES = 22;
/** A comparison stroke's normalized path length, which its dash spans. */
const TAG_LENGTH = 1;
/** Path length and timing used by ComparisonStroke to draw comparison tags. */
export const ComparisonTagsShared = {
  /** Frames each comparison stroke takes to draw. */
  TAG_DRAW_FRAMES,
  /** A comparison stroke's normalized path length, which its dash spans. */
  TAG_LENGTH,
} as const;
