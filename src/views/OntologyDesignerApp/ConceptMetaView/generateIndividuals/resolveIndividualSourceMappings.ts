import {
  assertIsDefined,
  isDefined,
  makeBucketRecord,
  makeObject,
  objectValuesMap,
  prop,
  propEq,
  where,
} from "@avandar/utils";
import { Concept } from "$/models/ontology/Concept/Concept";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumnRead } from "$/models/datasets/DatasetColumn/DatasetColumn.types";
import type {
  DatasetColumnMapping,
  DatasetColumnMappingId,
} from "$/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMapping.types";
import type { BuildableConcept } from "$/models/ontology/Concept/Concept.types";

/**
 * The dataset-column mapping lookups needed to build the staging SQL: which
 * mappings identify an individual, which one supplies its label, and the
 * dataset columns and column lists each of those mappings resolves to.
 */
export type IndividualSourceMappings = {
  identifierMappings: DatasetColumnMapping[];
  labelMapping: DatasetColumnMapping;
  titleColumn: DatasetColumnRead;
  titleDatasetPrimaryKeyColumn: DatasetColumnRead;
  mappingColumnsLookup: Record<DatasetColumnMappingId, DatasetColumnRead>;
  neededColumnsByDatasetId: Record<Dataset.Id, string[]>;
};

/**
 * Resolves a concept's identifier and label attributes down to the dataset
 * columns they map to, returning everything the staging SQL needs to select
 * external ids and names from those columns.
 */
export async function resolveIndividualSourceMappings(
  concept: BuildableConcept,
): Promise<IndividualSourceMappings> {
  const entConfig = Concept.bind(concept);

  const identifierAttributes = entConfig.getIdentifierAttributes();
  const labelAttribute = entConfig.getLabelAttribute();
  const allAttributes = [...identifierAttributes, labelAttribute];

  const datasetColumnMappings = allAttributes
    .map((attribute) => {
      return attribute.mapping.type === "dataset_column"
        ? attribute.mapping
        : undefined;
    })
    .filter(isDefined);

  // get all columns that we need to extract values from
  const sourceDatasetColumns = await DatasetColumnClient.getAll(
    where("id", "in", datasetColumnMappings.map(prop("datasetColumnId"))),
  );
  const columnsById = makeObject(sourceDatasetColumns, { key: "id" });

  // map each mapping to its column and table name
  const mappingColumnsLookup = makeObject(datasetColumnMappings, {
    key: "id",
    valueFn: (mapping) => {
      const column = columnsById[mapping.datasetColumnId];
      assertIsDefined(
        column,
        `Could not find column "${mapping.datasetColumnId}"`,
      );
      return column;
    },
  });

  // Get the dataset columns to use for external IDs and the individual title
  const identifierMappings = datasetColumnMappings.filter((mapping) => {
    return identifierAttributes.some(propEq("id", mapping.conceptAttributeId));
  });
  const labelMapping = datasetColumnMappings.find((mapping) => {
    return mapping.conceptAttributeId === labelAttribute.id;
  })!;
  // The label names each record with one value, so its mapping must name the
  // rule that picks it.
  if (labelMapping.valuePickerRuleType === undefined) {
    throw new Error(
      `Label attribute '${labelAttribute.name}' (${labelAttribute.id}) keeps ` +
        `one value, but its mapping names no value rule.`,
    );
  }
  const identifierMappingsByDatasetId = makeObject(identifierMappings, {
    key: "datasetId",
  });
  const titleColumn = mappingColumnsLookup[labelMapping.id]!;
  const titleDatasetPrimaryKeyColumn =
    mappingColumnsLookup[
      identifierMappingsByDatasetId[titleColumn.datasetId]!.id
    ]!;

  const neededColumnsByDatasetId = objectValuesMap(
    makeBucketRecord(
      datasetColumnMappings.map((mapping) => {
        return mappingColumnsLookup[mapping.id]!;
      }),
      { key: "datasetId" },
    ),
    (columns) => {
      return columns.map(prop("name"));
    },
  );

  return {
    identifierMappings,
    labelMapping,
    titleColumn,
    titleDatasetPrimaryKeyColumn,
    mappingColumnsLookup,
    neededColumnsByDatasetId,
  };
}
