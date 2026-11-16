import { isNonNullish, propEq } from "@avandar/utils";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { makeQueryColumnsFromConcept } from "@/views/DataExplorerApp/makeQueryColumnsFromConcept/makeQueryColumnsFromConcept";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";

type Options = {
  colNames: readonly string[] | undefined;
  datasetColumns: readonly DatasetColumn.T[] | undefined;
  conceptAttributes: readonly ConceptAttribute.T[] | undefined;
  /** The case type's id when the source is a case type, for its `status`. */
  conceptId?: Concept.Id;
};

/**
 * Resolves the column names carried in the URL back to real query columns.
 *
 * A dataset source and a concept source supply their columns through different
 * models, so both are converted before matching. A concept source also offers
 * its built-in `status` column once its id is known. Names that match nothing
 * are dropped rather than erroring: a shared URL can outlive the column it
 * names, and hydrating the rest of the query is better than failing the whole
 * restore.
 *
 * Order follows `colNames`, so the restored selection reads the way the URL
 * that produced it did.
 */
export function getRestoredColumnsFromUrl(
  options: Readonly<Options>,
): QueryColumn.T[] {
  const { colNames, datasetColumns, conceptAttributes, conceptId } = options;
  const conceptColumns =
    conceptId && conceptAttributes
      ? makeQueryColumnsFromConcept({
          conceptId,
          attributes: conceptAttributes,
        })
      : QueryColumn.makeFromConceptAttributes(conceptAttributes ?? []);
  const allQueryColumns = [
    ...(datasetColumns ?? []).map((col) => {
      return QueryColumn.makeFromDatasetColumn(col);
    }),
    ...conceptColumns,
  ];

  return (colNames ?? [])
    .map((name) => {
      return allQueryColumns.find(propEq("baseColumn.name", name));
    })
    .filter(isNonNullish);
}
