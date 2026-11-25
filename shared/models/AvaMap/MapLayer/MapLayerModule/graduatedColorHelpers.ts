import type {
  ClassificationConfig, // oxfmt-ignore
} from "$/models/AvaMap/MapLayer/LayerSymbology.types.ts";

/** How close to a stop a class position must be to take that stop exactly. */
const STOP_TOLERANCE = 1e-9;

/** Reads a `#rgb` or `#rrggbb` color as red, green, blue channels. */
function _parseHexColor(color: string): readonly number[] | undefined {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color);
  const hexDigits = match?.[1];
  if (hexDigits === undefined) {
    return undefined;
  }
  const fullDigits =
    hexDigits.length === 3
      ? [...hexDigits]
          .map((digit) => {
            return `${digit}${digit}`;
          })
          .join("")
      : hexDigits;
  const packed = Number.parseInt(fullDigits, 16);
  return [(packed >> 16) & 255, (packed >> 8) & 255, packed & 255];
}

/** Writes red, green, blue channels as a lowercase `#rrggbb` color. */
function _buildHexColor(channels: readonly number[]): string {
  const hexChannels = channels.map((channel) => {
    return channel.toString(16).padStart(2, "0");
  });
  return `#${hexChannels.join("")}`;
}

/** Blends two colors in RGB, or picks the nearer one when either is not hex. */
function _mixColors(
  options: Readonly<{ fromColor: string; toColor: string; fraction: number }>,
): string {
  const { fromColor, toColor, fraction } = options;
  const fromChannels = _parseHexColor(fromColor);
  const toChannels = _parseHexColor(toColor);
  if (!fromChannels || !toChannels) {
    return fraction < 0.5 ? fromColor : toColor;
  }
  return _buildHexColor(
    fromChannels.map((channel, index) => {
      return Math.round(
        channel + ((toChannels[index] ?? 0) - channel) * fraction,
      );
    }),
  );
}

/**
 * Picks `classCount` colors at evenly spaced positions along `sourceColors`,
 * blending neighbors in RGB where a position falls between two stops. With
 * two or more classes the first and last classes get the first and last
 * source colors.
 *
 * Use it wherever a graduated ramp must hold exactly one color per class,
 * for example when a classification gains or loses a class.
 */
export function resampleColorRamp(
  sourceColors: readonly string[],
  classCount: number,
): string[] {
  if (classCount <= 0 || sourceColors.length === 0) {
    return [];
  }
  const lastStopIndex = sourceColors.length - 1;
  return Array.from({ length: classCount }, (_, classIndex) => {
    const position =
      classCount === 1 ? 0 : (classIndex * lastStopIndex) / (classCount - 1);
    const lowerStopIndex = Math.floor(position);
    const fraction = position - lowerStopIndex;
    const lowerColor = sourceColors[lowerStopIndex]!;
    const upperColor =
      sourceColors[Math.min(lowerStopIndex + 1, lastStopIndex)]!;
    if (fraction < STOP_TOLERANCE) {
      return lowerColor;
    }
    if (1 - fraction < STOP_TOLERANCE) {
      return upperColor;
    }
    return _mixColors({ fromColor: lowerColor, toColor: upperColor, fraction });
  });
}

/**
 * How many classes a graduated classification asks for: the class count of
 * an automatic method, or one more than the number of manual breaks. Use it
 * to size per-class arrays such as a ramp or its labels.
 */
export function getGraduatedClassCount(
  classification: ClassificationConfig,
): number {
  return classification.method === "manual"
    ? classification.breaks.length + 1
    : classification.classCount;
}
