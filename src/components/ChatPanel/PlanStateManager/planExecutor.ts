import { DuckDbClient } from "@/clients/DuckDbClient/DuckDbClient";
import type {
  PlanNode,
  PlanStateManager,
} from "@/components/ChatPanel/PlanStateManager/PlanStateManager";

/**
 * Run a plan end-to-end in DuckDB, writing each step's output to a temp
 * view named `step_<id>`. Later steps reference earlier ones by that
 * name in their SQL. Caps:
 *
 *   - Aborts the entire run on the first failure; downstream steps are
 *     marked `skipped`.
 *   - Steps with `type !== "sql"` are marked `skipped` for now (Python
 *     and R are deferred to Phase 6).
 *
 * Returns the final node list so callers can inspect results.
 */
export type PlanExecutorDispatch = ReturnType<
  typeof PlanStateManager.useDispatch
>;

const STEP_VIEW_PREFIX = "step_";
const PREVIEW_ROW_CAP = 50;

function _stepViewName(stepId: string): string {
  return `${STEP_VIEW_PREFIX}${stepId.replace(/[^a-zA-Z0-9_]/g, "_")}`;
}

export async function executePlanStep(args: {
  step: PlanNode;
  dispatch: PlanExecutorDispatch;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { step, dispatch } = args;
  if (step.type !== "sql") {
    // Non-SQL steps (Python / R / clarification) aren't executable in
    // Phase 3; mark them skipped so the UI can show why.
    dispatch.markStepSkipped(step.id);
    return { ok: true };
  }

  dispatch.markStepRunning(step.id);

  const viewName = _stepViewName(step.id);
  // CREATE OR REPLACE so a manual re-run doesn't trip "view already exists".
  // The user's SQL is wrapped in parens so we can safely append clauses
  // around it without needing to parse the statement.
  const wrappedSql = `CREATE OR REPLACE TEMP VIEW "${viewName}" AS\n${step.code}`;

  try {
    await DuckDbClient.runRawQuery(wrappedSql);
    // Pull schema + preview rows for the DAG node.
    const previewQuery = `SELECT * FROM "${viewName}" LIMIT ${PREVIEW_ROW_CAP}`;
    const result = await DuckDbClient.runRawQuery<Record<string, unknown>>(
      previewQuery,
    );
    const actualSchema = result.columns.map((c) => {
      return { name: c.name, type: String(c.dataType ?? "unknown") };
    });
    const countResult = await DuckDbClient.runRawQuery<{ rc: bigint | number }>(
      `SELECT COUNT(*) AS rc FROM "${viewName}"`,
    );
    const firstRow = countResult.data[0];
    const rowCount =
      firstRow && firstRow.rc !== undefined && firstRow.rc !== null ?
        Number(firstRow.rc)
      : result.data.length;

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

export async function executePlan(args: {
  nodes: readonly PlanNode[];
  dispatch: PlanExecutorDispatch;
}): Promise<void> {
  const { nodes, dispatch } = args;
  for (const node of nodes) {
    const outcome = await executePlanStep({ step: node, dispatch });
    if (!outcome.ok) {
      // Mark all subsequent nodes as skipped. We bail on first failure
      // rather than trying to dependency-resolve forward; Phase 4
      // (schema-drift regen) will replace this with targeted re-runs.
      const idx = nodes.findIndex((n) => {
        return n.id === node.id;
      });
      for (let i = idx + 1; i < nodes.length; i++) {
        dispatch.markStepSkipped(nodes[i]!.id);
      }
      return;
    }
  }
}

/**
 * Best-effort cleanup of temp views created by a plan. Called when a new
 * plan replaces the prior one or when the chat panel unmounts.
 */
export async function dropPlanTempViews(args: {
  nodes: readonly PlanNode[];
}): Promise<void> {
  for (const node of args.nodes) {
    const viewName = _stepViewName(node.id);
    try {
      await DuckDbClient.runRawQuery(`DROP VIEW IF EXISTS "${viewName}"`);
    } catch {
      // Swallow — view cleanup is best-effort, the DuckDB session is
      // ephemeral anyway.
    }
  }
}
