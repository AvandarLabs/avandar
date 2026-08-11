import { makeSet, propIsDefined, sortObjList } from "@avandar/utils";
import { AvaDataTypeModule } from "$/models/datasets/AvaDataType/AvaDataTypeModule";
import type { ColumnSummary } from "@/clients/datasets/DatasetQueryClient";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";

const ENUM_LIKE_DISTINCT_MAX = 10;

/** Identifier column names excluded from group-by and average suggestions. */
const IDENTIFIER_EXACT_NAMES = new Set(["id", "uuid", "uid"]);

/** Numeric columns whose names indicate averaging is not meaningful. */
const NON_AVERAGEABLE_EXACT_NAMES = new Set([
  "year",
  "index",
  "idx",
  "version",
  "zip",
  "ssn",
  "code",
  "count",
  "sequence",
  "seq",
]);

/**
 * Substrings in a normalized column name that suggest a numeric field is a
 * code or identifier, not a quantity to average.
 */
const NON_AVERAGEABLE_NAME_SUBSTRINGS = [
  "phone",
  "telephone",
  "mobile",
  "cellphone",
  "cell_phone",
  "fax",
  "ssn",
  "social_security",
  "socialsecurity",
  "zipcode",
  "zip_code",
  "postal",
  "postcode",
  "account_number",
  "routing_number",
  "credit_card",
  "card_number",
  "iban",
  "swift",
  "license_number",
  "plate_number",
  "latitude",
  "longitude",
  "birth_year",
  "fiscal_year",
] as const;

/** Column names that are rarely useful as GROUP BY dimensions. */
const NON_GROUPABLE_EXACT_NAMES = new Set([
  ...IDENTIFIER_EXACT_NAMES,
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

type ColumnMeta = Pick<DatasetColumn.T, "name" | "dataType" | "columnIdx">;

function _normalizeColumnName(columnName: string): string {
  return columnName.trim().toLowerCase().replace(/\s+/g, "_");
}

/**
 * True when the column name is exactly `id`, `uuid`, or `uid` (any casing).
 * Applies regardless of whether the column is stored as text or numeric.
 */
function _isIdentifierColumnName(columnName: string): boolean {
  return IDENTIFIER_EXACT_NAMES.has(_normalizeColumnName(columnName));
}

/**
 * Returns whether a column name is unlikely to be a meaningful group-by
 * dimension (identifiers, audit fields, etc.).
 */
function _isNonGroupableColumnName(columnName: string): boolean {
  const normalized = _normalizeColumnName(columnName);
  return (
    NON_GROUPABLE_EXACT_NAMES.has(normalized) || normalized.endsWith("_id")
  );
}

/**
 * True when a numeric column name suggests values are codes or identifiers
 * (phone, SSN, zip, etc.) rather than quantities where an average is useful.
 */
function _isNonAverageableColumnName(columnName: string): boolean {
  const normalized = _normalizeColumnName(columnName);
  return (
    _isIdentifierColumnName(columnName) ||
    NON_AVERAGEABLE_EXACT_NAMES.has(normalized) ||
    normalized.endsWith("_year") ||
    normalized.endsWith("_code") ||
    NON_AVERAGEABLE_NAME_SUBSTRINGS.some((fragment) => {
      return normalized.includes(fragment);
    })
  );
}

function _sortByColumnIdx(
  columns: readonly ColumnMeta[],
): readonly ColumnMeta[] {
  return sortObjList(columns, {
    sortBy: (column) => {
      return column.columnIdx;
    },
  });
}

function _textColumns(columns: readonly ColumnMeta[]): readonly ColumnMeta[] {
  return _sortByColumnIdx(columns).filter((column) => {
    return (
      AvaDataTypeModule.isText(column.dataType) &&
      !_isNonGroupableColumnName(column.name)
    );
  });
}

/**
 * Picks a varchar column for "count by …" suggestions. Uses cached column
 * summaries when available (enum-like first, then lowest cardinality).
 */
function _pickGroupByColumn(
  columns: readonly ColumnMeta[],
  cachedSummariesByName?: ReadonlyMap<string, ColumnSummary>,
  options?: Readonly<{ excludeColumnNames?: readonly string[] }>,
): string | undefined {
  const excludedColumnNames = makeSet(options?.excludeColumnNames ?? [], {
    hashFn: _normalizeColumnName,
  });
  const textColumns = _textColumns(columns).filter((column) => {
    return !excludedColumnNames.has(_normalizeColumnName(column.name));
  });
  if (textColumns.length === 0) {
    return undefined;
  }

  if (!cachedSummariesByName || cachedSummariesByName.size === 0) {
    return textColumns[0]?.name;
  }

  const columnsWithDistinctCounts = textColumns.map((column) => {
    const summary = cachedSummariesByName.get(column.name);
    const distinctValuesCount =
      summary?.type === "text" ? summary.distinctValuesCount : undefined;
    return { column, distinctValuesCount };
  });

  const enumLikeColumn = columnsWithDistinctCounts.find((entry) => {
    return (
      entry.distinctValuesCount !== undefined &&
      entry.distinctValuesCount < ENUM_LIKE_DISTINCT_MAX
    );
  });
  if (enumLikeColumn) {
    return enumLikeColumn.column.name;
  }

  const columnsWithKnownDistinctCounts = columnsWithDistinctCounts.filter(
    propIsDefined("distinctValuesCount"),
  );
  if (columnsWithKnownDistinctCounts.length > 0) {
    return sortObjList(columnsWithKnownDistinctCounts, {
      sortBy: (entry) => {
        return entry.distinctValuesCount;
      },
    })[0]?.column.name;
  }

  return textColumns[0]?.name;
}

/**
 * Picks the first numeric column for "average …" suggestions.
 */
function _pickAverageColumn(
  columns: readonly ColumnMeta[],
): string | undefined {
  const numericColumns = _sortByColumnIdx(columns).filter((column) => {
    return (
      AvaDataTypeModule.isNumeric(column.dataType) &&
      !_isNonAverageableColumnName(column.name)
    );
  });
  return numericColumns[0]?.name;
}

/** Selects columns suitable for generated chat suggestions. */
export const ChatSuggestionColumnPicker = {
  isIdentifierColumnName: _isIdentifierColumnName,
  isNonAverageableColumnName: _isNonAverageableColumnName,
  isNonGroupableColumnName: _isNonGroupableColumnName,
  pickAverageColumn: _pickAverageColumn,
  pickGroupByColumn: _pickGroupByColumn,
};
