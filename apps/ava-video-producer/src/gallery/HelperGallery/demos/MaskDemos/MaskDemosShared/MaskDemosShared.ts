const WIPE_AT = 15;
const WIPE_FRAMES = 18;
/**
 * The two stepped wipes compared: the shot transition default and a variant.
 */
const WIPES = [
  { code: "{ columns: 8 }", options: { columns: 8 } },
  {
    code: '{ columns: 6, staggerFrames: 1.5, from: "top", order: "right-to-left" }',
    options: {
      columns: 6,
      staggerFrames: 1.5,
      from: "top",
      order: "right-to-left",
    },
  },
] as const;
/** Defines paired stepped-wipe variants and their shared playback timing. */
export const MaskDemosShared = {
  /**
   * The two stepped wipes compared: the shot transition default and a variant.
   */
  WIPES,
  /** Frame when both stepped-wipe previews begin. */
  WIPE_AT,
  /** Authored duration in frames shared by the stepped-wipe previews. */
  WIPE_FRAMES,
} as const;
