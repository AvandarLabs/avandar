import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";

import { isNonNullish, propEq } from "@avandar/utils";

import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";

/**
 * Resolves the column names carried in the URL back to real query columns.
 *
 * A dataset source and a concept source supply their columns through different
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
    conceptAttributes: readonly ConceptAttribute.T[] | undefined;
  }>,
): QueryColumn.T[] {
  const { colNames, datasetColumns, conceptAttributes } = options;
  const allQueryColumns = [
    ...(datasetColumns ?? []).map((col) => {
      return QueryColumn.makeFromDatasetColumn(col);
    }),
    ...(conceptAttributes ?? []).map((col) => {
      return QueryColumn.makeFromConceptAttribute(col);
    }),
  ];

  return (colNames ?? [])
    .map((name) => {
      return allQueryColumns.find(propEq("baseColumn.name", name));
    })
    .filter(isNonNullish);
}
