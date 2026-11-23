import { DatasetColumnMappingParsers } from "$/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMappingParsers";
import { ManualEntryMappingParsers } from "$/models/ontology/AttributeMapping/ManualEntryMapping/ManualEntryMappingParsers";
import { ConceptParsers } from "$/models/ontology/Concept/ConceptParsers";
import { ConceptAttributeParsers } from "$/models/ontology/ConceptAttribute/ConceptAttributeParsers";
import { ConceptStatusParsers } from "$/models/ontology/ConceptStatus/ConceptStatus";
import { createRdbCrudClient } from "$/RdbCrudClient/createRdbCrudClient";
import { createUsableServiceClient } from "@/utils/createUsableServiceClient";
import type { AttributeMapping } from "$/models/ontology/AttributeMapping/AttributeMapping.types";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";
import type { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";

function _isDatasetColumnMapping(
  mapping: AttributeMapping<"Insert">,
): mapping is AttributeMapping<"Insert", "dataset_column"> {
  return mapping.type === "dataset_column";
}

function _isManualEntryMapping(
  mapping: AttributeMapping<"Insert">,
): mapping is AttributeMapping<"Insert", "manual_entry"> {
  return mapping.type === "manual_entry";
}

/**
 * Reads and writes case types. A new case type is created through `create`,
 * which writes it with its statuses, attributes, and mappings at once.
 */
export const ConceptClient = createUsableServiceClient(
  createRdbCrudClient({
    modelName: "Concept",
    tableName: "concepts",
    dbTablePrimaryKey: "id",
    parsers: ConceptParsers,
    mutations: ({ clientLogger, dbClient, parsers }) => {
      return {
        /**
         * Creates a case type with its statuses, attributes, and mappings in
         * one transaction, and returns its id. Nothing is written if any
         * part fails.
         */
        create: async (params: {
          concept: Concept.T<"Insert">;
          statuses: ReadonlyArray<ConceptStatus.T<"Insert">>;
          attributes: ReadonlyArray<ConceptAttribute.T<"Insert">>;
          mappings: ReadonlyArray<AttributeMapping<"Insert">>;
        }): Promise<Concept.Id> => {
          const logger = clientLogger.appendName("create");
          logger.log("Creating case type", params);
          const { data: conceptId } = await dbClient
            .rpc("rpc_concepts__create", {
              p_concept: parsers.fromModelInsertToDBInsert(params.concept),
              p_statuses: params.statuses.map((status) => {
                return ConceptStatusParsers.fromModelInsertToDBInsert(status);
              }),
              p_attributes: params.attributes.map((attribute) => {
                return ConceptAttributeParsers.fromModelInsertToDBInsert(
                  attribute,
                );
              }),
              p_dataset_column_mappings: params.mappings
                .filter(_isDatasetColumnMapping)
                .map((mapping) => {
                  return DatasetColumnMappingParsers.fromModelInsertToDBInsert(
                    mapping,
                  );
                }),
              p_manual_entry_mappings: params.mappings
                .filter(_isManualEntryMapping)
                .map((mapping) => {
                  return ManualEntryMappingParsers.fromModelInsertToDBInsert(
                    mapping,
                  );
                }),
            })
            .throwOnError();
          return conceptId as Concept.Id;
        },
      };
    },
  }),
  {
    mutationFns: ["create"],
  },
);
