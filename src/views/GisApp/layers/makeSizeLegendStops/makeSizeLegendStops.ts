import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";

/**
 * Makes frozen minimum, mid-radius, and maximum proportional-symbol stops.
 */
export function makeSizeLegendStops(
  options: Readonly<{
    values: readonly number[];
    minRadius: number;
    maxRadius: number;
    scale: "sqrt" | "linear";
    formatLabel: (value: number) => string;
  }>,
): MapLayer.SizeLegendStop[] {
  const sortedValues = options.values
    .filter(Number.isFinite)
    .toSorted((left, right) => {
      return left - right;
    });
  const minimum = sortedValues[0];
  const maximum = sortedValues.at(-1);
  if (minimum === undefined || maximum === undefined) {
    return [];
  }
  if (minimum === maximum) {
    return [
      {
        value: minimum,
        radiusPx: options.minRadius,
        label: options.formatLabel(minimum),
      },
    ];
  }
  const radiusPx = (options.minRadius + options.maxRadius) / 2;
  const normalizedMidpoint = options.scale === "sqrt" ? 0.25 : 0.5;
  const midpoint = minimum + normalizedMidpoint * (maximum - minimum);
  return [minimum, midpoint, maximum].map((value, index) => {
    return {
      value,
      radiusPx: [options.minRadius, radiusPx, options.maxRadius][index]!,
      label: options.formatLabel(value),
    };
  });
}
