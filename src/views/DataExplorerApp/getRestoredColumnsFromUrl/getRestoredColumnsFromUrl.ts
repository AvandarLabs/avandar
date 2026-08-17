import { isNonNullish, propEq } from "@avandar/utils";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { EntityFieldConfig } from "$/models/EntityConfig/EntityFieldConfig/EntityFieldConfig";

/**
 * Resolves the column names carried in the URL back to real query columns.
 *
 * A dataset source and an entity source supply their columns through different
 * models, so both are converted before matching. Names that match nothing are
 * dropped rather than erroring: a shared URL can outlive the column it names,
 * and hydrating the rest of the query is better than failing the whole restore.
 *
 * Order follows `colNames`, so the restored selection reads the way the URL
 * that produced it did.
 */
export function getRestoredColumnsFromUrl(
  options: Readonly<{
    colNames: readonly string[] | undefined;
    datasetColumns: readonly DatasetColumn.T[] | undefined;
    entityFieldConfigs: readonly EntityFieldConfig.T[] | undefined;
  }>,
): QueryColumn.T[] {
  const { colNames, datasetColumns, entityFieldConfigs } = options;
  const allQueryColumns = [
    ...(datasetColumns ?? []).map((col) => {
      return QueryColumn.makeFromDatasetColumn(col);
    }),
    ...(entityFieldConfigs ?? []).map((col) => {
      return QueryColumn.makeFromEntityFieldConfig(col);
    }),
  ];

  return (colNames ?? [])
    .map((name) => {
      return allQueryColumns.find(propEq("baseColumn.name", name));
    })
    .filter(isNonNullish);
}
