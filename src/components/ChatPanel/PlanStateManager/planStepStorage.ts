import Dexie from "dexie";
import type { Table } from "dexie";

/**
 * IndexedDB-backed materialisation for plan step results.
 *
 * Each step writes its result as a parquet blob keyed by
 * `(planId, stepId)`. Materialising to IndexedDB (rather than only as a
 * DuckDB temp view) lets us:
 *
 *   1. Survive a page reload — DuckDB-WASM views are in-memory and die on
 *      refresh. With the parquet on disk we can re-register the view in
 *      DuckDB on next load without re-running the upstream LLM call.
 *   2. Save the analysis. When the user persists a virtual dataset, we
 *      know each step's exact bytes are reproducible.
 *
 * Deliberately a separate Dexie database from `AvandarDB` so adding /
 * removing this table doesn't bump the shared schema version.
 *
 * **Storage hygiene**: `clearPlan` is called when the user dismisses
 * the plan; `clearAll` is the nuclear option (workspace switch,
 * sign-out). We're holding parquet bytes, which can be large — never
 * keep them around longer than the analysis they belong to.
 */
export type PlanStepBlob = {
  /** Composite key as `${planId}|${stepId}`. */
  id: string;
  planId: string;
  stepId: string;
  /**
   * Parquet bytes from
   * `DuckDbClient.runRawQuery(..., { returnType: 'parquet' })`.
   * Stored as a Blob; Dexie uses structured-clone so this round-trips
   * fine across reloads.
   */
  parquet: Blob;
  schema: Array<{ name: string; type: string }>;
  rowCount: number;
  /** Wall-clock save time. We TTL nothing here — clearing is explicit. */
  savedAt: number;
};

class AvandarPlanStepDB extends Dexie {
  steps!: Table<PlanStepBlob, string>;

  constructor() {
    super("AvandarPlanStepDB");
    this.version(1).stores({
      steps: "id, planId, stepId, savedAt",
    });
  }
}

const db = new AvandarPlanStepDB();

function _key(planId: string, stepId: string): string {
  return `${planId}|${stepId}`;
}

export async function putPlanStepBlob(args: {
  planId: string;
  stepId: string;
  parquet: Blob;
  schema: Array<{ name: string; type: string }>;
  rowCount: number;
}): Promise<void> {
  await db.steps.put({
    id: _key(args.planId, args.stepId),
    planId: args.planId,
    stepId: args.stepId,
    parquet: args.parquet,
    schema: args.schema,
    rowCount: args.rowCount,
    savedAt: Date.now(),
  });
}

export async function getPlanStepBlob(args: {
  planId: string;
  stepId: string;
}): Promise<PlanStepBlob | undefined> {
  return await db.steps.get(_key(args.planId, args.stepId));
}

export async function listPlanStepBlobs(
  planId: string,
): Promise<PlanStepBlob[]> {
  return await db.steps.where("planId").equals(planId).toArray();
}

/**
 * Clear all step blobs for one plan. Call this when the user closes the
 * plan or when a new plan replaces the prior one.
 */
export async function clearPlanStepBlobs(planId: string): Promise<void> {
  await db.steps.where("planId").equals(planId).delete();
}

/** Wipe the entire materialisation cache. */
export async function clearAllPlanStepBlobs(): Promise<void> {
  await db.steps.clear();
}
