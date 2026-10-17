import { prop } from "@avandar/utils";
import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult.ts";

/**
 * Shared helpers for choosing default axis / series columns when hydrating
 * a viz config from `QueryResult` columns. Centralizes the column-ID Set
 * and the category-column preference ladder that were previously copied
 * across the per-viz hydration helpers.
 */

/** Build a Set of the result column IDs for fast membership checks. */
export function columnIdSet(
  columns: readonly QueryResult.BoundColumn[],
): Set<QueryColumn.Id> {
  return new Set(columns.map(prop("id")));
}

/** Identity of the first numeric column, or `undefined` when there is none. */
export function pickFirstNumericColumnId(
  columns: readonly QueryResult.BoundColumn[],
): QueryColumn.Id | undefined {
  return columns.find((col) => {
    return AvaDataType.isNumeric(col.dataType);
  })?.id;
}

/**
 * Preferred category (X / name) column for bar / line / area: temporal,
 * then text, then boolean (as category), then a numeric column that isn't
 * already used, then the first remaining column. Column IDs in
 * `excludedIds` (already bound to other axes / series) are skipped.
 */
export function pickCategoryColumnId(
  columns: readonly QueryResult.BoundColumn[],
  excludedIds: ReadonlySet<QueryColumn.Id>,
): QueryColumn.Id | undefined {
  const others = columns.filter((col) => {
    return !excludedIds.has(col.id);
  });
  const temporal = others.find((col) => {
    return AvaDataType.isTemporal(col.dataType);
  });
  if (temporal !== undefined) {
    return temporal.id;
  }
  const text = others.find((col) => {
    return AvaDataType.isText(col.dataType);
  });
  if (text !== undefined) {
    return text.id;
  }
  const booleanCol = others.find((col) => {
    return col.dataType === "boolean";
  });
  if (booleanCol !== undefined) {
    return booleanCol.id;
  }
  const numeric = others.find((col) => {
    return AvaDataType.isNumeric(col.dataType);
  });
  if (numeric !== undefined) {
    return numeric.id;
  }
  return others[0]?.id;
}
