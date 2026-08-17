import {
  makeBucketRecord,
  makeIdLookupRecord,
  objectKeys,
  promiseFlatMap,
} from "@avandar/utils";
import { match } from "ts-pattern";
import { getDatasetColumnAssertions } from "@/clients/ontology/AttributeAssertionClient/getAttributeAssertions/getDatasetColumnAssertions";
import { ConceptAttributeClient } from "@/clients/ontology/ConceptAttributeClient";
import { Logger } from "@/utils/Logger";
import type { RegistryOfArrays } from "@avandar/utils";
import type { AttributeMappingRegistry } from "$/models/ontology/AttributeMapping/AttributeMapping.types";
import type { ConceptId } from "$/models/ontology/Concept/Concept.types";
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { Simplify } from "type-fest";

async function _getAssertionsByMappingType({
  conceptId,
  workspaceId,
  requestedAttributes,
  mappingsByType,
}: {
  conceptId: ConceptId;
  workspaceId: Workspace.Id;
  requestedAttributes: readonly ConceptAttribute.T[];
  mappingsByType: Simplify<Partial<RegistryOfArrays<AttributeMappingRegistry>>>;
}): Promise<Array<Record<ConceptAttribute.Id, unknown>>> {
  const requestedAttributesById = makeIdLookupRecord(requestedAttributes, {
    key: "id",
  });

  const assertions = await promiseFlatMap(
    objectKeys(mappingsByType),
    async (mappingType) => {
      return match(mappingType)
        .with("dataset_column", async (type) => {
          const mappings = mappingsByType[type]!;
          const attributesWithMappings = mappings.map((mapping) => {
            return {
              attribute: requestedAttributesById[mapping.conceptAttributeId]!,
              mapping,
            };
          });

          return getDatasetColumnAssertions({
            conceptId,
            workspaceId,
            attributesWithMappings,
          });
        })
        .with("manual_entry", async (type) => {
          throw new Error(`${type} mappings are not supported yet.`);
        })
        .exhaustive();
    },
  );
  return assertions;
}

/**
 * Get every attribute assertion for the individuals of a concept.
 * Returns an array of rows, where each row column key is a concept
 * attribute id.
 */
export async function getAttributeAssertions({
  conceptId,
  conceptAttributes,
  workspaceId,
}: {
  conceptId: ConceptId;
  conceptAttributes: readonly ConceptAttribute.T[];
  workspaceId: Workspace.Id;
}): Promise<Array<Record<ConceptAttribute.Id, unknown>>> {
  const mappings = await ConceptAttributeClient.getAllAttributeMappings({
    attributes: conceptAttributes,
  });

  // bucket the mappings by type
  const mappingsByType = makeBucketRecord(mappings, {
    key: "type",
  }) as Partial<RegistryOfArrays<AttributeMappingRegistry>>;

  const assertions = await _getAssertionsByMappingType({
    conceptId,
    workspaceId,
    requestedAttributes: conceptAttributes,
    mappingsByType,
  });

  Logger.log("Retrieved requested attribute values", assertions);
  return assertions;
}
