import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { DatasetColumnMapping } from "$/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMapping.types";
import type { ConceptId } from "$/models/ontology/Concept/Concept.types";
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";
import type { Workspace } from "$/models/Workspace/Workspace";

import {
  assertIsDefined,
  isDefined,
  makeBucketRecord,
  makeIdLookupMap,
  makeIdLookupRecord,
  objectEntries,
  promiseFlatMap,
  prop,
  sqlTemplate,
  where,
} from "@avandar/utils";

import { ConceptAttributeId } from "$/models/ontology/ConceptAttribute/ConceptAttribute.types";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { getSQLSelectOfMapping } from "@/clients/ontology/AttributeAssertionClient/getAttributeAssertions/getSQLSelectOfMapping";
import { ConceptAttributeClient } from "@/clients/ontology/ConceptAttributeClient";
import { DatasetColumnMappingClient } from "@/clients/ontology/DatasetColumnMappingClient";
import { WorkspaceQuerySession } from "@/clients/qetl/WorkspaceQuerySession/WorkspaceQuerySession";
import { removeDuplicates } from "@/lib/utils/arrays/removeDuplicates/removeDuplicates";

type AttributeWithDatasetMapping = {
  attribute: ConceptAttribute.T;
  mapping: DatasetColumnMapping;
};

async function _extractAssertionsFromDataset({
  datasetId,
  identifierAttribute,
  workspaceId,
  requestedAttributes,
}: {
  datasetId: DatasetId;
  identifierAttribute: {
    datasetColumn: DatasetColumn.T;
    attribute: ConceptAttribute.T;
    mapping: DatasetColumnMapping;
  };
  workspaceId: Workspace.Id;
  requestedAttributes: ReadonlyArray<{
    datasetColumn: DatasetColumn.T;
    attribute: ConceptAttribute.T;
    mapping: DatasetColumnMapping;
  }>;
}): Promise<Array<Record<ConceptAttribute.Id, unknown>>> {
  const primaryKeyColumnName = identifierAttribute.datasetColumn.name;

  // returns rows where each column is a concept attribute ID
  const queryResult = await WorkspaceQuerySession.runQuery<
    Record<ConceptAttributeId, unknown>
  >({
    workspaceId,
    rawSql: sqlTemplate(`
      -- Get all the external IDs we will pull values for
      WITH external_ids AS (
        SELECT
          DISTINCT "$primaryKeyColumnName$" as external_id
        FROM "$datasetId$"
      )
      SELECT
        external_ids.external_id,
        $columnSelectors$
      FROM external_ids
    `).parse({
      datasetId,
      primaryKeyColumnName,
      columnSelectors: requestedAttributes
        .map((attribute) => {
          const attributeId = attribute.attribute.id;
          const colName = attribute.datasetColumn.name;
          const sqlStatement = getSQLSelectOfMapping({
            selectColumnName: colName,
            primaryKeyColumnName,
            datasetId: datasetId,
            ruleType: attribute.mapping.valuePickerRuleType,
            outputColumnName: attributeId,
            externalIdsTable: "external_ids",
            externalIdColumn: "external_id",
          });
          return sqlStatement;
        })
        .join(", "),
    }),
  });

  return queryResult.data;
}

/**
 * Given a concept ID, get all the identifier attributes with their
 * mappings.
 */
async function _getIdentifierAttributeMappings(
  conceptId: ConceptId,
): Promise<AttributeWithDatasetMapping[]> {
  // get the ID attributes that also have dataset value mappings.
  // we will need these to do other dataset queries, because we will
  // need to know which columns to look at for the primary key
  const identifierAttributes = await ConceptAttributeClient.getAll({
    where: {
      concept_id: { eq: conceptId },
      is_identifier: { eq: true },
      mapping_type: { eq: "dataset_column" },
    },
  });

  // now get all the mappings for these attributes
  const identifierMappings = await DatasetColumnMappingClient.getAll(
    where("concept_attribute_id", "in", identifierAttributes.map(prop("id"))),
  );

  // now group them together
  const mappingsByAttributeId = makeIdLookupRecord(identifierMappings, {
    key: "conceptAttributeId",
  });

  return identifierAttributes
    .map((attribute) => {
      const mapping = mappingsByAttributeId[attribute.id];
      if (mapping) {
        return {
          attribute: attribute,
          mapping,
        };
      }
      return undefined;
    })
    .filter(isDefined);
}

/**
 * Given a concept ID and a list of attributes with their mappings,
 * get all the attribute values for those attributes.
 */
export async function getDatasetColumnAssertions({
  conceptId,
  workspaceId,
  attributesWithMappings,
}: {
  conceptId: ConceptId;
  workspaceId: Workspace.Id;
  attributesWithMappings: readonly AttributeWithDatasetMapping[];
}): Promise<Array<Record<ConceptAttributeId, unknown>>> {
  const identifierAttributesWithMappings =
    await _getIdentifierAttributeMappings(conceptId);

  // Get all metadata of the columns we need to extract
  const allColumnIds = removeDuplicates([
    ...identifierAttributesWithMappings.map(prop("mapping.datasetColumnId")),
    ...attributesWithMappings.map(prop("mapping.datasetColumnId")),
  ]);
  const datasetColumnsById = makeIdLookupRecord(
    await DatasetColumnClient.getAll(where("id", "in", allColumnIds)),
    { key: "id" },
  );

  // get all requested and identifier attributes with their associated
  // dataset columns
  const requestedAttributes = attributesWithMappings.map((attribute) => {
    return {
      ...attribute,
      datasetColumn: datasetColumnsById[attribute.mapping.datasetColumnId]!,
    };
  });
  const identifierAttributes = identifierAttributesWithMappings.map(
    (attribute) => {
      return {
        ...attribute,
        datasetColumn: datasetColumnsById[attribute.mapping.datasetColumnId]!,
      };
    },
  );

  // group the requested attributes and primary keys by dataset IDs so we can
  // group our queries by dataset
  const identifierAttributesByDatasetId = makeIdLookupMap(
    identifierAttributes,
    {
      key: "mapping.datasetId",
    },
  );

  // Each mapping corresponds to 1 dataset, but there can be
  // duplicate datasets, so let's bucket them by dataset.
  const requestedAttributesByDatasetId = makeBucketRecord(requestedAttributes, {
    keyFn: prop("mapping.datasetId"),
  });

  // run a query for each dataset
  const assertionRows = await promiseFlatMap(
    objectEntries(requestedAttributesByDatasetId),
    async ([datasetId, reqAttributes]) => {
      const identifierAttribute =
        identifierAttributesByDatasetId.get(datasetId);
      assertIsDefined(
        identifierAttribute,
        `Primary key attribute not found for dataset ${datasetId}`,
      );
      const rows = await _extractAssertionsFromDataset({
        datasetId,
        workspaceId,
        identifierAttribute,
        requestedAttributes: reqAttributes,
      });
      return rows;
    },
  );

  return assertionRows;
}
