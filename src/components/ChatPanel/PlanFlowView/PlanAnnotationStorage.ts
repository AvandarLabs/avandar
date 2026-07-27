import { createModule } from "@modules";
import Dexie from "dexie";
import type { Annotation } from "@/components/ChatPanel/PlanFlowView/PlanAnnotationStateManager/PlanAnnotationStateManager";
import type { Table } from "dexie";

/**
 * IndexedDB-backed persistence for plan annotations.
 *
 * Lives in its own Dexie database (separate from `AvandarPlanStepDB`)
 * so we can independently version annotation schema changes without
 * touching the parquet blob keyspace.
 *
 * Storage hygiene: same as plan step blobs, explicit cleanup on
 * Close / replace, never TTL.
 */
class AvandarPlanAnnotationDB extends Dexie {
  annotations!: Table<Annotation, string>;

  constructor() {
    super("AvandarPlanAnnotationDB");
    this.version(1).stores({
      annotations: "id, planId, createdAt",
    });
  }
}

const db = new AvandarPlanAnnotationDB();

/**
 * IndexedDB-backed store for plan annotations. Grouped as a module because
 * every method shares the one `AvandarPlanAnnotationDB` Dexie backend.
 */
export const PlanAnnotationStorage = createModule("PlanAnnotationStorage", {
  builder: () => {
    return {
      putAnnotation: async (a: Annotation): Promise<void> => {
        await db.annotations.put(a);
      },

      putAnnotations: async (items: Annotation[]): Promise<void> => {
        if (items.length === 0) {
          return;
        }
        await db.annotations.bulkPut(items);
      },

      listAnnotationsForPlan: async (planId: string): Promise<Annotation[]> => {
        return await db.annotations.where("planId").equals(planId).toArray();
      },

      deleteAnnotation: async (id: string): Promise<void> => {
        await db.annotations.delete(id);
      },

      clearAnnotationsForPlan: async (planId: string): Promise<void> => {
        await db.annotations.where("planId").equals(planId).delete();
      },

      clearAllAnnotations: async (): Promise<void> => {
        await db.annotations.clear();
      },
    };
  },
});
