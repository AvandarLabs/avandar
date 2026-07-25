import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import { prop } from "@utils/objects/hofs/prop/prop.ts";
import type { QueryResultColumn } from "$/models/queries/QueryResult/QueryResult.types.ts";

/**
 * Shared helpers for choosing default axis / series columns when hydrating
 * a viz config from `QueryResult` columns. Centralizes the column-name Set
 * and the category-column preference ladder that were previously copied
 * across the per-viz hydration helpers.
 */

/** Build a Set of the result column names for fast membership checks. */
export function columnNameSet(
  columns: readonly QueryResultColumn[],
): Set<string> {
  return new Set(columns.map(prop("name")));
}

/** Name of the first numeric column, or `undefined` when there is none. */
export function pickFirstNumericColumnName(
  columns: readonly QueryResultColumn[],
): string | undefined {
  return columns.find((col) => {
    return AvaDataType.isNumeric(col.dataType);
  })?.name;
}

/**
 * Preferred category (X / name) column for bar / line / area: temporal,
 * then text, then boolean (as category), then a numeric column that isn't
 * already used, then the first remaining column. Columns named in
 * `excludedNames` (already bound to other axes / series) are skipped.
 */
export function pickCategoryColumnName(
  columns: readonly QueryResultColumn[],
  excludedNames: ReadonlySet<string>,
): string | undefined {
  const others = columns.filter((col) => {
    return !excludedNames.has(col.name);
  });
  const temporal = others.find((col) => {
    return AvaDataType.isTemporal(col.dataType);
  });
  if (temporal !== undefined) {
    return temporal.name;
  }
  const text = others.find((col) => {
    return AvaDataType.isText(col.dataType);
  });
  if (text !== undefined) {
    return text.name;
  }
  const booleanCol = others.find((col) => {
    return col.dataType === "boolean";
  });
  if (booleanCol !== undefined) {
    return booleanCol.name;
  }
  const numeric = others.find((col) => {
    return AvaDataType.isNumeric(col.dataType);
  });
  if (numeric !== undefined) {
    return numeric.name;
  }
  return others[0]?.name;
}
