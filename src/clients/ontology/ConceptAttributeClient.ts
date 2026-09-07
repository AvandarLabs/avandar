import {
  makeBucketRecord,
  objectKeys,
  promiseFlatMap,
  prop,
  where,
} from "@avandar/utils";
import { match } from "ts-pattern";
import { ConceptAttributeParsers } from "$/models/ontology/ConceptAttribute/ConceptAttributeParsers";
import { createRdbCrudClient } from "$/RdbCrudClient/createRdbCrudClient";
import { DatasetColumnMappingClient } from "@/clients/ontology/DatasetColumnMappingClient";
import { ManualEntryMappingClient } from "@/clients/ontology/ManualEntryMappingClient";
import { removeDuplicates } from "@/lib/utils/arrays/removeDuplicates/removeDuplicates";
import { createUsableServiceClient } from "@/utils/createUsableServiceClient";
import type {
  AttributeMapping,
  AttributeMappingType,
} from "$/models/ontology/AttributeMapping/AttributeMapping.types";
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";

export const ConceptAttributeClient = createUsableServiceClient(
  createRdbCrudClient({
    modelName: "ConceptAttribute",
    tableName: "concept_attributes",
    dbTablePrimaryKey: "id",
    parsers: ConceptAttributeParsers,
    queries: ({ clientLogger }) => {
      /**
       * Given a list of concept attributes, fetch all the mappings that
       * populate them.
       */
      return {
        getAllAttributeMappings: async (params: {
          attributes: readonly ConceptAttribute.T[] | undefined;
        }): Promise<AttributeMapping[]> => {
          const logger = clientLogger.appendName("getAllAttributeMappings");
          const { attributes: inputAttributes } = params;
          if (!inputAttributes) {
            return [];
          }
          const attributes = removeDuplicates(inputAttributes, {
            hashFn: prop("id"),
          });
          const attributeIds = attributes.map(prop("id"));

          // Bucket each attribute by value mapping type, so we only query for
          // the mapping types that we need
          const attributesByMappingType = makeBucketRecord(attributes, {
            keyFn: prop("mappingType"),
          });

          logger.log("Fetching value mappings for attributes", {
            attributeIds,
          });

          // Now make one query per mapping type
          const mappings = await promiseFlatMap(
            objectKeys(attributesByMappingType),
            async (
              mappingType: AttributeMappingType,
            ): Promise<AttributeMapping[]> => {
              const mappingsOfType = await match(mappingType)
                .with("manual_entry", () => {
                  return ManualEntryMappingClient.getAll(
                    where("concept_attribute_id", "in", attributeIds),
                  );
                })
                .with("dataset_column", () => {
                  return DatasetColumnMappingClient.getAll(
                    where("concept_attribute_id", "in", attributeIds),
                  );
                })
                .exhaustive();
              return mappingsOfType;
            },
          );

          logger.log("Received value mappings", mappings);
          return mappings;
        },
      };
    },
  }),
  {
    queryFns: ["getAllAttributeMappings"],
  },
);
