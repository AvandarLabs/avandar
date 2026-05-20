import Dexie from "dexie";
import type { Annotation } from "@/components/ChatPanel/PlanFlowView/PlanAnnotationStateManager";
import type { Table } from "dexie";

/**
 * IndexedDB-backed persistence for plan annotations (Phase 9).
 *
 * Lives in its own Dexie database (separate from `AvandarPlanStepDB`)
 * so we can independently version annotation schema changes without
 * touching the parquet blob keyspace.
 *
 * Storage hygiene: same as plan step blobs — explicit cleanup on
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

export async function putAnnotation(a: Annotation): Promise<void> {
  await db.annotations.put(a);
}

export async function putAnnotations(items: Annotation[]): Promise<void> {
  if (items.length === 0) {
    return;
  }
  await db.annotations.bulkPut(items);
}

export async function listAnnotationsForPlan(
  planId: string,
): Promise<Annotation[]> {
  return await db.annotations.where("planId").equals(planId).toArray();
}

export async function deleteAnnotation(id: string): Promise<void> {
  await db.annotations.delete(id);
}

export async function clearAnnotationsForPlan(planId: string): Promise<void> {
  await db.annotations.where("planId").equals(planId).delete();
}

export async function clearAllAnnotations(): Promise<void> {
  await db.annotations.clear();
}
