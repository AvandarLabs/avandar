import { createDexieCrudClient } from "@/clients/dexie/createDexieCrudClient";
import { AvaDexie } from "@/db/dexie/AvaDexie";
import { PlanAnnotationParsers } from "@/models/chat/PlanAnnotation/PlanAnnotationParsers";
import { createUsableServiceClient } from "@/utils/createUsableServiceClient";
import type { PlanAnnotation } from "@/models/chat/PlanAnnotation/PlanAnnotation";

const planAnnotationClient = createDexieCrudClient({
  db: AvaDexie.DB,
  modelName: "PlanAnnotation",
  parsers: PlanAnnotationParsers,
  queries: ({ dbTable }) => {
    return {
      /** Lists persisted annotations for one plan. */
      listAnnotationsForPlan: async (
        planId: string,
      ): Promise<PlanAnnotation.T[]> => {
        const rows = await dbTable.where("planId").equals(planId).toArray();
        return rows.map((row) => {
          return PlanAnnotationParsers.fromDBReadToModelRead(row);
        });
      },
    };
  },
  mutations: ({ dbTable }) => {
    return {
      /** Inserts or replaces one annotation by its primary key. */
      putAnnotation: async (annotation: PlanAnnotation.T): Promise<void> => {
        await dbTable.put(
          PlanAnnotationParsers.fromModelInsertToDBInsert(annotation),
        );
      },

      /** Inserts or replaces annotations by their primary keys. */
      putAnnotations: async (
        annotations: readonly PlanAnnotation.T[],
      ): Promise<void> => {
        if (annotations.length === 0) {
          return;
        }
        await dbTable.bulkPut(
          annotations.map((annotation) => {
            return PlanAnnotationParsers.fromModelInsertToDBInsert(annotation);
          }),
        );
      },

      /** Deletes one annotation by its primary key. */
      deleteAnnotation: async (id: PlanAnnotation.Id): Promise<void> => {
        await dbTable.delete(id);
      },

      /** Deletes every persisted annotation belonging to one plan. */
      clearAnnotationsForPlan: async (planId: string): Promise<void> => {
        await dbTable.where("planId").equals(planId).delete();
      },

      /** Deletes every persisted plan annotation. */
      clearAllAnnotations: async (): Promise<void> => {
        await dbTable.clear();
      },
    };
  },
});

/** Hook-enabled client for browser-local plan annotations. */
export const PlanAnnotationClient = createUsableServiceClient(
  planAnnotationClient,
  {
    queryFns: ["listAnnotationsForPlan"],
    mutationFns: [
      "putAnnotation",
      "putAnnotations",
      "deleteAnnotation",
      "clearAnnotationsForPlan",
      "clearAllAnnotations",
    ],
  },
);
