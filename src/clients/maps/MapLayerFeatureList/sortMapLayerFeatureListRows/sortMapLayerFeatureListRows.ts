import type {
  MapLayerFeatureList,
  MapLayerFeatureListSort,
} from "../MapLayerFeatureList.types";

function _isBlank(value: unknown): boolean {
  return value === null || value === undefined || value === "";
}

function _compareValues(first: unknown, second: unknown): number {
  if (typeof first === "number" && typeof second === "number") {
    return first - second;
  }
  return String(first).localeCompare(String(second), undefined, {
    numeric: true,
  });
}

/**
 * A feature list's rows ordered by one column, numbers numerically and text
 * in natural order ("P.S. 9" before "P.S. 10"), with blank cells last in
 * either direction. Use it to sort a feature list for display or print.
 */
export function sortMapLayerFeatureListRows(
  options: Readonly<{
    rows: MapLayerFeatureList["rows"];
    sort: MapLayerFeatureListSort;
  }>,
): MapLayerFeatureList["rows"] {
  const { rows, sort } = options;
  const directionSign = sort.direction === "asc" ? 1 : -1;
  return [...rows].sort((firstRow, secondRow) => {
    const first = firstRow[sort.key];
    const second = secondRow[sort.key];
    if (_isBlank(first) || _isBlank(second)) {
      return Number(_isBlank(first)) - Number(_isBlank(second));
    }
    return directionSign * _compareValues(first, second);
  });
}
