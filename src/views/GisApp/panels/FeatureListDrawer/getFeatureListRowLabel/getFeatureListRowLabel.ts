import type {
  MapLayerFeatureList,
  MapLayerFeatureListColumn,
} from "@/clients/maps/MapLayerFeatureList/MapLayerFeatureList.types";

/** A column whose name says it holds identifiers rather than names. */
const CODE_COLUMN_PATTERN = /code|(^|_)(id|key|ref)$/i;

/** A value made only of capitals and digits, such as "M260" or "Z9". */
const CODE_VALUE_PATTERN = /^[A-Z0-9_-]+$/;

/** The cell's trimmed text, or undefined when it is not non-blank text. */
function _getText(
  row: MapLayerFeatureList["rows"][number],
  column: MapLayerFeatureListColumn,
): string | undefined {
  const value = row[column.key];
  if (typeof value !== "string") {
    return undefined;
  }
  const text = value.trim();
  return text === "" ? undefined : text;
}

/**
 * The text that names a feature list row, for example in its "Show ... on
 * the map" button: the first column named like a name, else the first text
 * column that is not a code. Undefined when no column reads like a name, so
 * the caller can fall back to the row's position. Used by
 * `FeatureListTableRow`.
 */
export function getFeatureListRowLabel(
  options: Readonly<{
    columns: readonly MapLayerFeatureListColumn[];
    row: MapLayerFeatureList["rows"][number];
  }>,
): string | undefined {
  const { row } = options;
  const sourceColumns = options.columns.filter((column) => {
    return column.kind === "source";
  });
  const nameColumnText = sourceColumns
    .filter((column) => {
      return /name/i.test(column.key);
    })
    .map((column) => {
      return _getText(row, column);
    })
    .find((text) => {
      return text !== undefined;
    });
  if (nameColumnText) {
    return nameColumnText;
  }
  return sourceColumns
    .filter((column) => {
      return !CODE_COLUMN_PATTERN.test(column.key);
    })
    .map((column) => {
      return _getText(row, column);
    })
    .find((text) => {
      return text !== undefined && !CODE_VALUE_PATTERN.test(text);
    });
}
