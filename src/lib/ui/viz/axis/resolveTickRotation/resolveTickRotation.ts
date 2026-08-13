/** Recharts' default X axis height, and our floor. */
const MIN_AXIS_HEIGHT = 30;

/** Ceiling, so a rotated axis never swallows the plot area. */
const MAX_AXIS_HEIGHT = 160;

/** Rough average glyph width as a fraction of the font size. */
const CHAR_WIDTH_RATIO = 0.6;

/** Breathing room between the rotated labels and the axis label below. */
const AXIS_HEIGHT_PADDING = 12;

/**
 * The subset of Recharts axis props that express a rotated tick label.
 * Every field is optional: an unrotated axis yields an empty object and
 * leaves the renderer's default tick layout unchanged.
 */
export type TickRotation = {
  tick?: { angle: number; textAnchor: "start" | "end" };
  interval?: 0;
  height?: number;
};

function _clamp({
  value,
  low,
  high,
}: Readonly<{ value: number; low: number; high: number }>): number {
  return Math.max(low, Math.min(high, value));
}

/**
 * Returns axis props for a rotated tick label, including its required height.
 */
export function resolveTickRotation({
  angle,
  tickLabels,
  fontSize,
}: Readonly<{
  angle: number | undefined;
  tickLabels: readonly string[];
  fontSize: number;
}>): TickRotation {
  if (angle === undefined || !Number.isFinite(angle) || angle === 0) {
    return {};
  }

  const clampedAngle = _clamp({ value: angle, low: -90, high: 90 });
  const radians = (Math.abs(clampedAngle) * Math.PI) / 180;

  const longestLabelChars = tickLabels.reduce((longest, label) => {
    return Math.max(longest, label.length);
  }, 0);
  const longestLabelPx = longestLabelChars * fontSize * CHAR_WIDTH_RATIO;

  const estimatedHeight =
    Math.sin(radians) * longestLabelPx +
    Math.cos(radians) * fontSize +
    AXIS_HEIGHT_PADDING;

  return {
    tick: {
      angle: clampedAngle,
      textAnchor: clampedAngle < 0 ? "end" : "start",
    },
    interval: 0,
    height: Math.round(
      _clamp({
        value: estimatedHeight,
        low: MIN_AXIS_HEIGHT,
        high: MAX_AXIS_HEIGHT,
      }),
    ),
  };
}
