import { removeDuplicates } from "@/lib/utils/arrays/removeDuplicates/removeDuplicates";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { AttributeMapping } from "$/models/ontology/AttributeMapping/AttributeMapping.types";
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";
import type { CaseDetailsRow } from "@/views/IndividualManagerApp/SingleIndividualView/CaseDetailsRail";

/** What one record's rail rows are built from. */
type CaseDetailsRowSources = {
  /** Every field of the record's case type. */
  attributes: readonly ConceptAttribute.T[];
  /** The record's values, keyed by field id. */
  valuesByAttributeId: Readonly<Partial<Record<ConceptAttribute.Id, unknown>>>;
  /** The mappings of those fields, for the datasets each reads. */
  mappings: readonly AttributeMapping[];
  /** The datasets those mappings name, for their names. */
  datasets: readonly Dataset.T[];
};

/**
 * The names of the datasets one field's mappings read, in name order. Each
 * dataset is listed once however many of its columns the field reads, and two
 * datasets that share a name are both listed.
 */
function _getSourceNames(
  options: Readonly<{
    attributeId: ConceptAttribute.Id;
    mappings: readonly AttributeMapping[];
    datasetNamesById: ReadonlyMap<string, string>;
  }>,
): string[] {
  const datasetIds = options.mappings.flatMap((mapping) => {
    return mapping.type === "dataset_column" &&
      mapping.conceptAttributeId === options.attributeId
      ? [mapping.datasetId]
      : [];
  });
  return removeDuplicates(datasetIds)
    .flatMap((datasetId) => {
      const datasetName = options.datasetNamesById.get(datasetId);
      return datasetName === undefined ? [] : [datasetName];
    })
    .sort((left, right) => {
      return left.localeCompare(right);
    });
}

/**
 * Builds the record page's rail rows: one per field of the case type, ordered
 * by name and then id (the order of the view's columns), each with the
 * record's value and the datasets the field reads. Used by `useRecordFields`.
 */
export function makeCaseDetailsRowsFromAttributes(
  options: Readonly<CaseDetailsRowSources>,
): CaseDetailsRow[] {
  const datasetNamesById = new Map<string, string>(
    options.datasets.map((dataset) => {
      return [dataset.id, dataset.name];
    }),
  );
  return [...options.attributes]
    .sort((left, right) => {
      return (
        left.name.localeCompare(right.name) || left.id.localeCompare(right.id)
      );
    })
    .map((attribute) => {
      return {
        id: attribute.id,
        name: attribute.name,
        value: options.valuesByAttributeId[attribute.id],
        sourceNames: _getSourceNames({
          attributeId: attribute.id,
          mappings: options.mappings,
          datasetNamesById,
        }),
      };
    });
}
