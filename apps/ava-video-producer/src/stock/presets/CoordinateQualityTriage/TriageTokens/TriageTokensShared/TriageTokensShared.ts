const POINT_AT = 51;
const POINT_STEP = 3;
const POINT_FRAMES = 39;
/** Staggers plotted coordinate entrances and sets their fade duration. */
export const TriageTokensShared = {
  /** Frame when the first plotted coordinate starts to appear. */
  POINT_AT,
  /** Frame gap between consecutive plotted coordinate entrances. */
  POINT_STEP,
  /** Plotted coordinate fade duration in frames at tempo 1. */
  POINT_FRAMES,
} as const;
