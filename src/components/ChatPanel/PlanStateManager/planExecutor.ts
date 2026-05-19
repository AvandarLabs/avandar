import { DuckDbClient } from "@/clients/DuckDbClient/DuckDbClient";
import {
  clearPlanStepBlobs,
  putPlanStepBlob,
} from "@/components/ChatPanel/PlanStateManager/planStepStorage";
import {
  findAffectedDownstream,
  isSchemaDrift,
  MAX_REGEN_ATTEMPTS,
  regenerateOnDrift,
} from "@/components/ChatPanel/PlanStateManager/schemaDrift";
import type {
  PlanNode,
  PlanStateManager,
} from "@/components/ChatPanel/PlanStateManager/PlanStateManager";
import type { PlanStepBlob } from "@/components/ChatPanel/PlanStateManager/planStepStorage";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { ChatPlan } from "$/types/chat.types";

/**
 * Run a plan end-to-end in DuckDB, writing each step's output to a temp
 * view named `step_<id>` AND to IndexedDB as parquet bytes. Later steps
 * reference earlier ones by the view name in their SQL. Caps:
 *
 *   - Aborts the run on the first failure; downstream steps marked
 *     `skipped` (Phase 4 schema-drift regen can re-issue them).
 *   - Steps with `type !== "sql"` are marked `skipped` for now (Python
 *     and R are Phase 6).
 *
 * The IndexedDB write is what lets us survive page reloads, save plans
 * to virtual datasets, and re-open analyses without re-running every
 * upstream step. The DuckDB temp view is what lets SQL in downstream
 * steps reference the result. Both forms must stay in sync.
 */
export type PlanExecutorDispatch = ReturnType<
  typeof PlanStateManager.useDispatch
>;

const STEP_VIEW_PREFIX = "step_";
const PREVIEW_ROW_CAP = 50;

export function stepViewName(stepId: string): string {
  return `${STEP_VIEW_PREFIX}${stepId.replace(/[^a-zA-Z0-9_]/g, "_")}`;
}

export async function executePlanStep(args: {
  planId: string;
  step: PlanNode;
  dispatch: PlanExecutorDispatch;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { planId, step, dispatch } = args;
  if (step.type !== "sql") {
    // Non-SQL steps (Python / R / clarification) aren't executable in
    // Phase 3; mark them skipped so the UI can show why.
    dispatch.markStepSkipped(step.id);
    return { ok: true };
  }

  dispatch.markStepRunning(step.id);

  const viewName = stepViewName(step.id);
  // CREATE OR REPLACE so a manual re-run doesn't trip "view already exists".
  const wrappedSql = `CREATE OR REPLACE TEMP VIEW "${viewName}" AS\n${step.code}`;

  try {
    await DuckDbClient.runRawQuery(wrappedSql);
    // Pull schema + preview rows for the DAG node.
    const previewQuery = `SELECT * FROM "${viewName}" LIMIT ${PREVIEW_ROW_CAP}`;
    const result =
      await DuckDbClient.runRawQuery<Record<string, unknown>>(previewQuery);
    const actualSchema = result.columns.map((c) => {
      return { name: c.name, type: String(c.dataType ?? "unknown") };
    });
    const countResult = await DuckDbClient.runRawQuery<{
      rc: bigint | number;
    }>(`SELECT COUNT(*) AS rc FROM "${viewName}"`);
    const firstRow = countResult.data[0];
    const rowCount =
      firstRow && firstRow.rc !== undefined && firstRow.rc !== null ?
        Number(firstRow.rc)
      : result.data.length;

    // Materialise the FULL result to IndexedDB as parquet. The DuckDB
    // temp view above is enough for SQL referencing within this
    // session, but the parquet blob is what lets us reopen the
    // analysis after a reload, or save it onto a virtual dataset.
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
    } catch (e) {
      // Materialisation failure is non-fatal; we still mark the step
      // succeeded since the in-memory view works. The user just won't
      // be able to reopen the step after a reload.
      console.warn(
        `[plan] failed to materialise step ${step.id} to IndexedDB:`,
        e,
      );
    }

    dispatch.markStepSucceeded({
      stepId: step.id,
      viewName,
      actualSchema,
      rowCount,
      previewRows: result.data,
    });
    return { ok: true };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    dispatch.markStepFailed({ stepId: step.id, error });
    return { ok: false, error };
  }
}

/**
 * Optional Phase 4 — schema-drift regen — context. Pass this to
 * `executePlan` to enable automatic regeneration of downstream steps
 * when an executed step produces a schema different from what the LLM
 * predicted. The runtime hits the `/regenerate-plan` endpoint, swaps
 * the affected step code in, and re-runs them.
 *
 * `getLatestPlan()` returns the current plan from the state manager
 * each call. We accept a callable rather than a snapshot because the
 * plan mutates as `replaceStepCode` fires.
 */
export type DriftRegenContext = {
  workspaceId: Workspace.Id;
  getLatestPlan: () => ChatPlan;
  model?: string;
};

export async function executePlan(args: {
  planId: string;
  nodes: readonly PlanNode[];
  dispatch: PlanExecutorDispatch;
  /** Optional Phase 4 drift-regen behaviour. */
  driftRegen?: DriftRegenContext;
}): Promise<void> {
  const { planId, nodes, dispatch, driftRegen } = args;

  // Track how many regen attempts we've spent on each (step) — capped
  // by MAX_REGEN_ATTEMPTS so a misbehaving LLM can't burn through
  // tokens. `replaceStepCode` bumps `regenAttempts` on the node, so
  // the next pass through reads it from the live plan.
  const regenCountByStep = new Map<string, number>();

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]!;
    const outcome = await executePlanStep({ planId, step: node, dispatch });
    if (!outcome.ok) {
      // Mark all subsequent nodes as skipped. We bail on first failure
      // rather than dependency-resolving forward.
      for (let j = i + 1; j < nodes.length; j++) {
        dispatch.markStepSkipped(nodes[j]!.id);
      }
      return;
    }
    if (!driftRegen) {
      continue;
    }
    // Phase 4 drift check: pull the freshly-executed step out of the
    // latest plan so we can read its `actualSchema`.
    const latestPlan = driftRegen.getLatestPlan();
    const latestNode = (latestPlan.steps as PlanNode[]).find((n) => {
      return n.id === node.id;
    });
    if (!latestNode || !latestNode.actualSchema) {
      continue;
    }
    if (!isSchemaDrift(node.predictedSchema, latestNode.actualSchema)) {
      continue;
    }
    const previousAttempts = regenCountByStep.get(node.id) ?? 0;
    if (previousAttempts >= MAX_REGEN_ATTEMPTS) {
      // Cap reached: leave the rest of the plan alone and let the
      // user manually intervene via the failed-step banner.
      console.warn(
        `[plan] step ${node.id} drifted again after ${previousAttempts} regen attempt(s); skipping further regens`,
      );
      continue;
    }
    const affected = findAffectedDownstream({
      plan: latestPlan,
      driftedStepId: node.id,
    });
    if (affected.length === 0) {
      continue;
    }
    try {
      regenCountByStep.set(node.id, previousAttempts + 1);
      await regenerateOnDrift({
        workspaceId: driftRegen.workspaceId,
        plan: latestPlan,
        driftedStep: latestNode,
        affectedStepIds: affected,
        model: driftRegen.model,
        dispatch,
        runStep: async (stepId) => {
          const latest = driftRegen.getLatestPlan();
          const target = (latest.steps as PlanNode[]).find((n) => {
            return n.id === stepId;
          });
          if (!target) {
            return;
          }
          await executePlanStep({ planId, step: target, dispatch });
        },
      });
    } catch (e) {
      console.warn("[plan] drift regen failed:", e);
    }
  }
}

/**
 * Best-effort cleanup. Drops the DuckDB temp views AND clears the
 * IndexedDB parquet blobs for the given plan. Call when:
 *
 *   - A new plan replaces the prior one
 *   - The user clicks "Close plan"
 *   - The chat panel unmounts (defensive — Plan provider cleanup
 *     should already have run)
 *
 * Idempotent; failures on either side are swallowed.
 */
export async function dropPlanTempViews(args: {
  planId?: string;
  nodes: readonly PlanNode[];
}): Promise<void> {
  for (const node of args.nodes) {
    const viewName = stepViewName(node.id);
    try {
      await DuckDbClient.runRawQuery(`DROP VIEW IF EXISTS "${viewName}"`);
    } catch {
      // Swallow — view cleanup is best-effort.
    }
  }
  if (args.planId) {
    try {
      await clearPlanStepBlobs(args.planId);
    } catch {
      // Swallow.
    }
  }
}

/**
 * Reload a previously-materialised plan from IndexedDB into DuckDB.
 *
 * Reads each step's parquet blob from `planStepStorage` and registers
 * a fresh temp view (`step_<id>`) for it. Returns the rehydrated
 * `actualSchema` / `rowCount` per step so the caller can dispatch
 * `markStepSucceeded` on the plan state.
 *
 * Used when:
 *   - The user re-opens a virtual dataset that was saved with a plan
 *   - A page reload brings the plan back from local storage
 */
export async function rehydratePlanStep(args: { blob: PlanStepBlob }): Promise<{
  viewName: string;
  schema: PlanStepBlob["schema"];
  rowCount: number;
}> {
  const { blob } = args;
  const viewName = stepViewName(blob.stepId);

  // DuckDbClient.loadParquet drops + re-registers under the given
  // tableName and creates a view we can read back from. We pass the
  // step's view name directly so downstream SQL can reference it
  // without further setup.
  await DuckDbClient.loadParquet({ tableName: viewName, blob: blob.parquet });

  return {
    viewName,
    schema: blob.schema,
    rowCount: blob.rowCount,
  };
}
