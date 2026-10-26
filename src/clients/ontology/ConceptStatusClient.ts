import { ConceptStatusParsers } from "$/models/ontology/ConceptStatus/ConceptStatus";
import { createRdbCrudClient } from "$/RdbCrudClient/createRdbCrudClient";
import { createUsableServiceClient } from "@/utils/createUsableServiceClient";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";

/**
 * Reads a case type's statuses and saves its status set. A set is saved
 * whole through `saveStatusSet`, never row by row, so renames, removals, and
 * the default change land together.
 */
export const ConceptStatusClient = createUsableServiceClient(
  createRdbCrudClient({
    modelName: "ConceptStatus",
    tableName: "concept_statuses",
    dbTablePrimaryKey: "id",
    parsers: ConceptStatusParsers,
    queries: ({ clientLogger, dbClient }) => {
      return {
        /** Counts each status's records in one case type, by status id. */
        getRecordCounts: async (params: {
          conceptId: Concept.Id;
        }): Promise<Partial<Record<ConceptStatus.Id, number>>> => {
          const logger = clientLogger.appendName("getRecordCounts");
          logger.log("Counting records per status", params);
          const { data: statuses } = await dbClient
            .from("concept_statuses")
            .select("id")
            .eq("concept_id", params.conceptId)
            .throwOnError();
          const counts = await Promise.all(
            statuses.map(async (status) => {
              const { count } = await dbClient
                .from("individuals")
                .select("id", { count: "exact", head: true })
                .eq("concept_id", params.conceptId)
                .eq("status_id", status.id)
                .throwOnError();
              return { statusId: status.id as ConceptStatus.Id, count };
            }),
          );
          const recordCounts: Partial<Record<ConceptStatus.Id, number>> = {};
          counts.forEach(({ statusId, count }) => {
            recordCounts[statusId] = count ?? 0;
          });
          return recordCounts;
        },
      };
    },
    mutations: ({ clientLogger, dbClient }) => {
      return {
        /**
         * Replaces a case type's statuses in one transaction. A refusal
         * rejects with the RPC's `hint`; read it with
         * `ConceptStatus.toSaveErrorHint`.
         */
        saveStatusSet: async (
          payload: ConceptStatus.SavePayload,
        ): Promise<void> => {
          const logger = clientLogger.appendName("saveStatusSet");
          logger.log("Saving status set", payload);
          await dbClient
            .rpc("rpc_concept_statuses__save", {
              p_concept_id: payload.conceptId,
              p_statuses: payload.statuses,
              p_default_status_id: payload.defaultStatusId,
              p_replacements: payload.replacements,
            })
            .throwOnError();
        },
      };
    },
  }),
  {
    queryFns: ["getRecordCounts"],
    mutationFns: ["saveStatusSet"],
  },
);
