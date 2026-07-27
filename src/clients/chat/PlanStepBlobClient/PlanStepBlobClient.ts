import { createDexieCrudClient } from "@/clients/dexie/createDexieCrudClient";
import { AvaDexie } from "@/db/dexie/AvaDexie";
import { PlanStepBlobParsers } from "@/models/chat/PlanStepBlob/PlanStepBlobParsers";
import { createUsableServiceClient } from "@/utils/createUsableServiceClient";
import type { PlanStepBlob } from "@/models/chat/PlanStepBlob/PlanStepBlob";

/** Values required to persist one materialized plan step. */
export type PutPlanStepBlobArgs = Pick<
  PlanStepBlob.T,
  "planId" | "stepId" | "parquet" | "schema" | "rowCount"
>;

/** Identifies one materialized plan step. */
export type GetPlanStepBlobArgs = Pick<PlanStepBlob.T, "planId" | "stepId">;

function _buildPlanStepBlobId(planId: string, stepId: string): PlanStepBlob.Id {
  return `${planId}|${stepId}` as PlanStepBlob.Id;
}

const planStepBlobClient = createDexieCrudClient({
  db: AvaDexie.DB,
  modelName: "PlanStepBlob",
  parsers: PlanStepBlobParsers,
  queries: ({ dbTable }) => {
    return {
      /** Gets one materialized plan step by its plan and step identifiers. */
      getPlanStepBlob: async (
        args: Readonly<GetPlanStepBlobArgs>,
      ): Promise<PlanStepBlob.T | undefined> => {
        const row = await dbTable.get(
          _buildPlanStepBlobId(args.planId, args.stepId),
        );
        return row ? PlanStepBlobParsers.fromDBReadToModelRead(row) : undefined;
      },

      /** Lists all materialized steps belonging to one plan. */
      listPlanStepBlobs: async (planId: string): Promise<PlanStepBlob.T[]> => {
        const rows = await dbTable.where("planId").equals(planId).toArray();
        return rows.map((row) => {
          return PlanStepBlobParsers.fromDBReadToModelRead(row);
        });
      },
    };
  },
  mutations: ({ dbTable }) => {
    return {
      /** Inserts or replaces one materialized plan step. */
      putPlanStepBlob: async (
        args: Readonly<PutPlanStepBlobArgs>,
      ): Promise<void> => {
        const row: PlanStepBlob.T = {
          ...args,
          id: _buildPlanStepBlobId(args.planId, args.stepId),
          savedAt: Date.now(),
        };
        await dbTable.put(PlanStepBlobParsers.fromModelInsertToDBInsert(row));
      },

      /** Deletes every materialized step belonging to one plan. */
      clearPlanStepBlobs: async (planId: string): Promise<void> => {
        await dbTable.where("planId").equals(planId).delete();
      },

      /** Deletes all materialized plan steps. */
      clearAllPlanStepBlobs: async (): Promise<void> => {
        await dbTable.clear();
      },
    };
  },
});

/** Hook-enabled client for browser-local plan step parquet Blobs. */
export const PlanStepBlobClient = createUsableServiceClient(
  planStepBlobClient,
  {
    queryFns: ["getPlanStepBlob", "listPlanStepBlobs"],
    mutationFns: [
      "putPlanStepBlob",
      "clearPlanStepBlobs",
      "clearAllPlanStepBlobs",
    ],
  },
);
