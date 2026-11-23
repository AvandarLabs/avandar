import { assertCornerExtractionRowsKeepShowDistanceValues as _assertCornerExtractionRowsKeepShowDistanceValues } from "./assertCornerExtractionRowsKeepShowDistanceValues";

/**
 * Asserts corner extraction rows keep complete text clear of source anchors
 * guides and ratio copy.
 */
export function assertCornerExtractionRowsKeepX({
  x,
  y,
}: Readonly<{ x: number[][0]; y: number[][1] }>): void {
  return [true, false].forEach((showDistanceValues) => {
    return _assertCornerExtractionRowsKeepShowDistanceValues({
      showDistanceValues,
      x,
      y,
    });
  });
}
