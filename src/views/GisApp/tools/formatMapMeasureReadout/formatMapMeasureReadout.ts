export type MapMeasureReadout =
  | {
      kind: "length";
      meters: number;
      lengthUnit: "m" | "km";
      lengthValue: number;
    }
  | {
      kind: "lengthAndArea";
      meters: number;
      squareMeters: number;
      lengthUnit: "m" | "km";
      lengthValue: number;
      areaUnit: "m2" | "km2";
      areaValue: number;
    };

function _lengthDisplay(meters: number): {
  lengthUnit: "m" | "km";
  lengthValue: number;
} {
  if (meters < 1000) {
    return { lengthUnit: "m", lengthValue: meters };
  }
  return { lengthUnit: "km", lengthValue: meters / 1000 };
}

function _areaDisplay(squareMeters: number): {
  areaUnit: "m2" | "km2";
  areaValue: number;
} {
  if (squareMeters < 1_000_000) {
    return { areaUnit: "m2", areaValue: squareMeters };
  }
  return { areaUnit: "km2", areaValue: squareMeters / 1_000_000 };
}

/**
 * Structured measure values in meters, plus the display unit band.
 *
 * Does not return translated strings; `MeasureReadout` localizes the units.
 */
export function formatMapMeasureReadout(
  options: Readonly<{ meters: number; squareMeters?: number }>,
): MapMeasureReadout {
  const lengthDisplay = _lengthDisplay(options.meters);
  if (options.squareMeters === undefined) {
    return {
      kind: "length",
      meters: options.meters,
      ...lengthDisplay,
    };
  }
  return {
    kind: "lengthAndArea",
    meters: options.meters,
    squareMeters: options.squareMeters,
    ...lengthDisplay,
    ..._areaDisplay(options.squareMeters),
  };
}
