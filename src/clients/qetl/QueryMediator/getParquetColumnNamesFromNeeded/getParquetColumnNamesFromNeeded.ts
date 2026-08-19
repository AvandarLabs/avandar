import {
  coversColumns,
  normalizeColumns,
} from "$/models/relations/RelationCacheKey/RelationCacheKey";

/** The names a dataset column uses in DuckDB (`name`) and in Parquet. */
export type DatasetColumnNames = {
  name: string;
  originalName: string;
};

function _getOriginalNameFromNeededName(
  neededName: string,
  datasetColumns: readonly DatasetColumnNames[],
): string {
  const datasetColumn = datasetColumns.find((column) => {
    return column.name === neededName || column.originalName === neededName;
  });
  return datasetColumn?.originalName ?? neededName;
}

/**
 * The Parquet headers that cover a needed set of query-facing names.
 *
 * View aliases (`DatasetColumn.name`) become `originalName`. A finite set
 * that already names every declared original header is `"all"`.
 */
export function getParquetColumnNamesFromNeeded(
  options: Readonly<{
    datasetColumns: readonly DatasetColumnNames[];
    needed: readonly string[] | "all";
  }>,
): readonly string[] | "all" {
  if (options.needed === "all") {
    return "all";
  }
  const parquetNames = normalizeColumns(
    options.needed.map((neededName) => {
      return _getOriginalNameFromNeededName(neededName, options.datasetColumns);
    }),
  );
  if (parquetNames === "all") {
    return "all";
  }
  const declaredOriginalNames = options.datasetColumns.map((column) => {
    return column.originalName;
  });
  if (
    declaredOriginalNames.length > 0 &&
    coversColumns(parquetNames, declaredOriginalNames)
  ) {
    return "all";
  }
  return parquetNames;
}
