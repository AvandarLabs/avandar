/** Pixels of scan travel over which a row turns from waiting to passed. */
const ROW_PASS_SPAN = 28;
const PLACEHOLDER_STROKE = 5;
const FIELD_SIZE = "xl";
/**
 * Sets scan-row labels, placeholder strokes, and scan-pass blending distance.
 */
export const ScanLinesShared = {
  /** Pixels of scan travel over which a row turns from waiting to passed. */
  ROW_PASS_SPAN,
  /** Type scale step used for scanned row labels. */
  FIELD_SIZE,
  /** Placeholder line width in pixels before theme stroke scaling. */
  PLACEHOLDER_STROKE,
} as const;
