import { makeIdLookupRecord, where } from "@avandar/utils";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { ConceptAttributeClient } from "@/clients/ontology/ConceptAttributeClient";
import { makeConceptAttributeColumnsFromMetadata } from "@/clients/qetl/QueryMediator/conceptRelation/makeConceptAttributeColumnsFromMetadata";
import { removeDuplicates } from "@/lib/utils/arrays/removeDuplicates/removeDuplicates";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { AttributeMapping } from "$/models/ontology/AttributeMapping/AttributeMapping.types";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ConceptAttributeColumns } from "@/clients/qetl/QueryMediator/conceptRelation/makeConceptAttributeColumnsFromMetadata";

/**
 * Every dataset column the given mappings name, as a value or as a date column,
 * keyed by id.
 */
async function _getMappedDatasetColumns(
  mappings: readonly AttributeMapping[],
): Promise<DatasetColumn.T[]> {
  const datasetColumnIds = removeDuplicates(
    mappings.flatMap((mapping) => {
      if (mapping.type !== "dataset_column") {
        return [];
      }
      // A per-period field also reads the date column that places each row
      // in a period, and column resolution looks that column up by id.
      return mapping.bucketColumnId === undefined
        ? [mapping.datasetColumnId]
        : [mapping.datasetColumnId, mapping.bucketColumnId];
    }),
  );
  return datasetColumnIds.length === 0
    ? []
    : await DatasetColumnClient.getAll(where("id", "in", datasetColumnIds));
}

/**
 * Reads one concept's attributes, the mappings that populate them, and the
 * dataset columns those mappings name, and resolves them into the columns the
 * concept's view emits.
 *
 * Use it wherever code needs a concept view's columns, for example to plan
 * the view before a query, or to map a result column back to its attribute by
 * `attributeId` after one. Every caller names the columns identically,
 * because the naming is `makeConceptAttributeColumnsFromMetadata` over the
 * same rows.
 */
export async function getConceptAttributeColumnsFromConceptId(
  conceptId: Concept.Id,
): Promise<ConceptAttributeColumns> {
  const attributes = await ConceptAttributeClient.getAll(
    where("concept_id", "eq", conceptId),
  );
  const mappings = await ConceptAttributeClient.getAllAttributeMappings({
    attributes,
  });
  const datasetColumns = await _getMappedDatasetColumns(mappings);
  return makeConceptAttributeColumnsFromMetadata({
    attributes,
    mappings,
    datasetColumnsById: makeIdLookupRecord(datasetColumns, { key: "id" }),
  });
}
