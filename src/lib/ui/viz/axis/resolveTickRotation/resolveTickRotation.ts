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
 * renders exactly as it does today.
 */
export type TickRotation = {
  tick?: { angle: number; textAnchor: "start" | "end" };
  interval?: 0;
  height?: number;
};

function _clamp(value: number, low: number, high: number): number {
  return Math.max(low, Math.min(high, value));
}

/**
 * Translate a tick label rotation into Recharts props.
 *
 * Recharts rotates via the `tick` object but does not grow the plot to
 * fit the result, so labels clip past roughly thirty degrees unless the
 * axis `height` grows with them. Height is estimated from the longest
 * label because measuring real text would mean rendering it first.
 *
 * `interval: 0` matters as much as the angle: Mantine defaults to
 * `preserveStartEnd`, so a user who rotates specifically to fit every
 * label would otherwise still see only some of them.
 */
export function resolveTickRotation(
  angle: number | undefined,
  tickLabels: readonly string[],
  fontSize: number,
): TickRotation {
  if (angle === undefined || !Number.isFinite(angle) || angle === 0) {
    return {};
  }

  const clampedAngle = _clamp(angle, -90, 90);
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
      _clamp(estimatedHeight, MIN_AXIS_HEIGHT, MAX_AXIS_HEIGHT),
    ),
  };
}
