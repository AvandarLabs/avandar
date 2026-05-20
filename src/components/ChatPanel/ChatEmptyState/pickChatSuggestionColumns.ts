import { AvaDataTypeModule } from "$/models/datasets/AvaDataType/AvaDataTypeModule";
import type { ColumnSummary } from "@/clients/datasets/DatasetQueryClient";
import type { DatasetColumnRead } from "$/models/datasets/DatasetColumn/DatasetColumn.types";

const ENUM_LIKE_DISTINCT_MAX = 10;

/** Column names that are rarely useful as GROUP BY dimensions. */
const NON_GROUPABLE_EXACT_NAMES = new Set([
  "id",
  "uuid",
  "guid",
  "pk",
  "rowid",
  "row_id",
  "row_number",
  "row_num",
  "created_at",
  "updated_at",
  "created",
  "updated",
  "modified_at",
  "deleted_at",
  "inserted_at",
  "timestamp",
  "email",
  "url",
  "uri",
]);

type ColumnMeta = Pick<DatasetColumnRead, "name" | "dataType" | "columnIdx">;

/**
 * Returns whether a column name is unlikely to be a meaningful group-by
 * dimension (identifiers, audit fields, etc.).
 */
export function isNonGroupableColumnName(columnName: string): boolean {
  const normalized = columnName.trim().toLowerCase().replace(/\s+/g, "_");
  if (NON_GROUPABLE_EXACT_NAMES.has(normalized)) {
    return true;
  }
  return normalized.endsWith("_id");
}

function _sortByColumnIdx(
  columns: readonly ColumnMeta[],
): readonly ColumnMeta[] {
  return [...columns].sort((left, right) => {
    return left.columnIdx - right.columnIdx;
  });
}

function _textColumns(columns: readonly ColumnMeta[]): readonly ColumnMeta[] {
  return _sortByColumnIdx(columns).filter((column) => {
    return (
      AvaDataTypeModule.isText(column.dataType) &&
      !isNonGroupableColumnName(column.name)
    );
  });
}

/**
 * Picks a varchar column for "count by …" suggestions. Uses cached column
 * summaries when available (enum-like first, then lowest cardinality).
 */
export function pickGroupByColumn(
  columns: readonly ColumnMeta[],
  cachedSummariesByName?: ReadonlyMap<string, ColumnSummary>,
): string | undefined {
  const textColumns = _textColumns(columns);
  if (textColumns.length === 0) {
    return undefined;
  }

  if (!cachedSummariesByName || cachedSummariesByName.size === 0) {
    return textColumns[0]?.name;
  }

  const withDistinct = textColumns.map((column) => {
    const summary = cachedSummariesByName.get(column.name);
    const distinctValuesCount =
      summary?.type === "text" ? summary.distinctValuesCount : undefined;
    return { column, distinctValuesCount };
  });

  const enumLike = withDistinct.find((entry) => {
    return (
      entry.distinctValuesCount !== undefined &&
      entry.distinctValuesCount < ENUM_LIKE_DISTINCT_MAX
    );
  });
  if (enumLike) {
    return enumLike.column.name;
  }

  const withKnownDistinct = withDistinct.filter((entry) => {
    return entry.distinctValuesCount !== undefined;
  });
  if (withKnownDistinct.length > 0) {
    withKnownDistinct.sort((left, right) => {
      return left.distinctValuesCount! - right.distinctValuesCount!;
    });
    return withKnownDistinct[0]?.column.name;
  }

  return textColumns[0]?.name;
}

/**
 * Picks the first numeric column for "average …" suggestions.
 */
export function pickAverageColumn(
  columns: readonly ColumnMeta[],
): string | undefined {
  const numericColumns = _sortByColumnIdx(columns).filter((column) => {
    return AvaDataTypeModule.isNumeric(column.dataType);
  });
  return numericColumns[0]?.name;
}
