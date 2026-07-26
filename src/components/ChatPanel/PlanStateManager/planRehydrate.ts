import { DuckDbClient } from "@/clients/DuckDbClient/DuckDbClient";
import {
  rehydratePlanStep,
  stepViewName,
} from "@/components/ChatPanel/PlanStateManager/planExecutor";
import {
  listPlanStepBlobs,
  putPlanStepBlob,
} from "@/components/ChatPanel/PlanStateManager/planStepStorage";
import type {
  PlanStateManager,
  PlanStepStatus,
} from "@/components/ChatPanel/PlanStateManager/PlanStateManager";
import type { ChatPlan, ChatPlanStep } from "$/types/chat.types";

export type RehydrateDispatch = ReturnType<typeof PlanStateManager.useDispatch>;

/**
 * Rehydrate a previously-persisted analytic plan into the canvas.
 *
 * Steps:
 *   1. Install the plan structure in PlanStateManager via
 *      `hydratePlan`, so the DAG renders immediately with everything
 *      marked `pending`.
 *   2. For each step we already have a parquet blob for in
 *      IndexedDB, re-register it as a DuckDB temp view and mark the
 *      step `succeeded`. The user sees the prior analysis without any
 *      LLM round-trip.
 *   3. For steps with no blob (e.g. opened from a virtual dataset on
 *      a fresh device), re-run the SQL locally — this only touches
 *      DuckDB-WASM, no LLM call.
 *
 * The caller passes the plan plus the planId to use. For
 * virtual-dataset opens, the planId is derived from the virtual
 * dataset id so the IndexedDB cache is stable across sessions.
 */
export async function rehydratePlan(args: {
  planId: string;
  plan: ChatPlan;
  dispatch: RehydrateDispatch;
}): Promise<void> {
  const { planId, plan, dispatch } = args;

  // Step 1: install the plan structure. Statuses are all `pending`
  // for steps we haven't rehydrated yet.
  dispatch.hydratePlan({
    planId,
    plan,
    statuses: plan.steps.map((step: ChatPlanStep) => {
      return { stepId: step.id, status: "pending" as PlanStepStatus };
    }),
  });

  const existingBlobs = await listPlanStepBlobs(planId);
  const blobsByStep = new Map(
    existingBlobs.map((b) => {
      return [b.stepId, b] as const;
    }),
  );

  // Step 2 + 3: re-register parquet blobs we already have, run SQL
  // for the rest. We do this in plan order so step N's view exists
  // when step N+1 needs it.
  for (const step of plan.steps) {
    if (step.type !== "sql") {
      continue;
    }
    const blob = blobsByStep.get(step.id);
    if (blob) {
      try {
        const result = await rehydratePlanStep({ blob });
        dispatch.markStepSucceeded({
          stepId: step.id,
          viewName: result.viewName,
          actualSchema: result.schema,
          rowCount: result.rowCount,
          previewRows: [],
        });
        continue;
      } catch (e) {
        console.warn(
          `[plan] failed to rehydrate step ${step.id} from blob; re-running:`,
          e,
        );
      }
    }
    // Fallback: re-run the SQL. Mirrors `executePlanStep` but cuts
    // the bias against IndexedDB write — we'll cache the result on
    // success so the next reload is fast.
    dispatch.markStepRunning(step.id);
    try {
      const viewName = stepViewName(step.id);
      await DuckDbClient.runRawQuery(
        `CREATE OR REPLACE TEMP VIEW "${viewName}" AS\n${step.code}`,
      );
      const result = await DuckDbClient.runRawQuery<Record<string, unknown>>(
        `SELECT * FROM "${viewName}" LIMIT 50`,
      );
      const actualSchema = result.columns.map((c) => {
        return { name: c.name, type: String(c.dataType ?? "unknown") };
      });
      const countResult = await DuckDbClient.runRawQuery<{
        rc: bigint | number;
      }>(`SELECT COUNT(*) AS rc FROM "${viewName}"`);
      const firstRow = countResult.data[0];
      const rowCount =
        firstRow?.rc !== undefined && firstRow.rc !== null ?
          Number(firstRow.rc)
        : result.data.length;

      // Cache it for the next reload.
      try {
        const parquetBlob = await DuckDbClient.runRawQuery(
          `SELECT * FROM "${viewName}"`,
          { returnType: "parquet" },
        );
        await putPlanStepBlob({
          planId,
          stepId: step.id,
          parquet: parquetBlob,
          schema: actualSchema,
          rowCount,
        });
      } catch {
        // Best-effort.
      }

      dispatch.markStepSucceeded({
        stepId: step.id,
        viewName,
        actualSchema,
        rowCount,
        previewRows: result.data,
      });
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      dispatch.markStepFailed({ stepId: step.id, error });
      // Stop on first failure — downstream steps depend on this one's
      // view.
      return;
    }
  }
}
