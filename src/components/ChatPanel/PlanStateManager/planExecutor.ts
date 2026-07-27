import { makeIdLookupMap } from "@utils";
import { DuckDbClient } from "@/clients/DuckDbClient/DuckDbClient";
import { WorkspaceQETLClient } from "@/clients/qetl/WorkspaceQETLClient";
import { PlanStepStorage } from "@/components/ChatPanel/PlanStateManager/PlanStepStorage";
import {
  findAffectedDownstream,
  isSchemaDrift,
  MAX_REGEN_ATTEMPTS,
  regenerateOnDrift,
} from "@/components/ChatPanel/PlanStateManager/schemaDrift/schemaDrift";
import { runInSandbox } from "@/sandbox/sandboxClient";
import type {
  PlanNode,
  PlanStateManager,
} from "@/components/ChatPanel/PlanStateManager/PlanStateManager";
import type { PlanStepBlob } from "@/components/ChatPanel/PlanStateManager/PlanStepStorage";
import type { SandboxRuntime } from "@/sandbox/SandboxProtocol";
import type * as duckdb from "@duckdb/duckdb-wasm";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { ChatPlan } from "$/types/chat.types";

/**
 * Run a plan end-to-end in DuckDB, writing each step's output to a temp
 * view named `step_<id>` AND to IndexedDB as parquet bytes. Later steps
 * reference earlier ones by the view name in their SQL. Caps:
 *
 *   - Aborts the run on the first failure; downstream steps marked
 *     `skipped` (schema-drift regen can re-issue them).
 *   - Steps with `type !== "sql"` are marked `skipped` for now (Python
 *     and R run in the sandbox iframe).
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

/** Matches dataset UUIDs referenced in plan step SQL. */
const DATASET_ID_IN_SQL_RE =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

export function stepViewName(stepId: string): string {
  return `${STEP_VIEW_PREFIX}${stepId.replace(/[^a-zA-Z0-9_]/g, "_")}`;
}

/**
 * Plan steps call `DuckDbClient` directly, bypassing the canvas QETL path
 * that registers workspace dataset tables. Probe each referenced dataset
 * through `WorkspaceQETLClient` so parquet is loaded before we create
 * `step_*` temp views.
 */
async function ensureWorkspaceDatasetsLoadedForPlanSql(options: {
  workspaceId: Workspace.Id;
  rawSql: string;
}): Promise<void> {
  const matches = options.rawSql.match(DATASET_ID_IN_SQL_RE);
  if (!matches) {
    return;
  }
  const uniqueDatasetIds = [...new Set(matches)];
  await Promise.all(
    uniqueDatasetIds.map(async (datasetId) => {
      await WorkspaceQETLClient.runQuery({
        workspaceId: options.workspaceId,
        rawSql: `SELECT 1 AS "_ava_probe" FROM "${datasetId}" LIMIT 1`,
      });
    }),
  );
}

export async function executePlanStep(args: {
  planId: string;
  step: PlanNode;
  dispatch: PlanExecutorDispatch;
  workspaceId: Workspace.Id;
  /** When running a full plan, pass one connection for all steps. */
  duckDbConnection?: duckdb.AsyncDuckDBConnection;
  /**
   * View-name → upstream PlanNode lookup used by python/r steps to
   * pull the source Arrow IPC bytes out of DuckDB before handing them
   * to the sandbox. Required for non-SQL steps; SQL steps ignore.
   */
  nodeById?: ReadonlyMap<string, PlanNode>;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { planId, step, dispatch, workspaceId, duckDbConnection, nodeById } =
    args;
  if (step.type === "clarification") {
    // Clarification steps are presentational: the plan was supposed
    // to pause here for user input. We mark them skipped so the user
    // can read what was requested and resume manually.
    dispatch.markStepSkipped(step.id);
    return { ok: true };
  }

  if (step.type === "python" || step.type === "r") {
    return await _executeSandboxStep({
      planId,
      step,
      runtime: step.type as SandboxRuntime,
      dispatch,
      nodeById,
      duckDbConnection,
    });
  }

  // SQL
  dispatch.markStepRunning(step.id);

  const viewName = stepViewName(step.id);
  // CREATE OR REPLACE so a manual re-run doesn't trip "view already exists".
  const wrappedSql = `CREATE OR REPLACE TEMP VIEW "${viewName}" AS\n${step.code}`;

  try {
    await ensureWorkspaceDatasetsLoadedForPlanSql({
      workspaceId,
      rawSql: step.code,
    });

    const runOnConnection = async (
      conn: duckdb.AsyncDuckDBConnection,
    ): Promise<{
      actualSchema: Array<{ name: string; type: string }>;
      rowCount: number;
      previewRows: Array<Record<string, unknown>>;
    }> => {
      await DuckDbClient.runRawQuery(wrappedSql, { conn });
      const previewQuery = `SELECT * FROM "${viewName}" LIMIT ${PREVIEW_ROW_CAP}`;
      const result = await DuckDbClient.runRawQuery<Record<string, unknown>>(
        previewQuery,
        {
          conn,
        },
      );
      const schema = result.columns.map((column) => {
        return {
          name: column.name,
          type: String(column.dataType ?? "unknown"),
        };
      });
      const countResult = await DuckDbClient.runRawQuery<{
        rc: bigint | number;
      }>(`SELECT COUNT(*) AS rc FROM "${viewName}"`, { conn });
      const firstRow = countResult.data[0];
      const resolvedRowCount =
        firstRow && firstRow.rc !== undefined && firstRow.rc !== null ?
          Number(firstRow.rc)
        : result.data.length;

      return {
        actualSchema: schema,
        rowCount: resolvedRowCount,
        previewRows: result.data,
      };
    };

    const { actualSchema, rowCount, previewRows } =
      duckDbConnection ?
        await runOnConnection(duckDbConnection)
      : await DuckDbClient.withConnection(runOnConnection);

    // Materialise the FULL result to IndexedDB as parquet. The DuckDB
    // temp view above is enough for SQL referencing within this
    // session, but the parquet blob is what lets us reopen the
    // analysis after a reload, or save it onto a virtual dataset.
    try {
      const materializeParquet = async (conn: duckdb.AsyncDuckDBConnection) => {
        return await DuckDbClient.runRawQuery(`SELECT * FROM "${viewName}"`, {
          returnType: "parquet",
          conn,
        });
      };
      const parquetBlob =
        duckDbConnection ?
          await materializeParquet(duckDbConnection)
        : await DuckDbClient.withConnection(materializeParquet);
      await PlanStepStorage.putPlanStepBlob({
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
      previewRows,
    });
    return { ok: true };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    dispatch.markStepFailed({ stepId: step.id, error });
    return { ok: false, error };
  }
}

/**
 * Run a python or r plan step inside the sandboxed
 * iframe. Pulls input views out of DuckDB as Arrow IPC bytes,
 * dispatches to the sandbox via `runInSandbox`, then registers the
 * result back into DuckDB as a parquet-backed view so downstream
 * steps can reference it like any other step.
 */
async function _executeSandboxStep(args: {
  planId: string;
  step: PlanNode;
  runtime: SandboxRuntime;
  dispatch: PlanExecutorDispatch;
  nodeById?: ReadonlyMap<string, PlanNode>;
  duckDbConnection?: duckdb.AsyncDuckDBConnection;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { planId, step, runtime, dispatch, nodeById, duckDbConnection } = args;
  dispatch.markStepRunning(step.id);

  try {
    // Gather each upstream view as parquet bytes. We use parquet for
    // both directions of the sandbox boundary because (a) DuckDB-WASM
    // already exports parquet via runRawQuery's returnType, (b)
    // pyarrow can read parquet natively, and (c) it round-trips via
    // DuckDb's existing `loadParquet` on the way back. Avoids adding
    // Arrow-IPC-specific paths to the client.
    const inputs: Array<{ name: string; arrow: Uint8Array }> = [];
    for (const inputId of step.inputs) {
      const upstream = nodeById?.get(inputId);
      const viewName = upstream?.viewName ?? stepViewName(inputId);
      const runParquetQuery = async (
        conn: duckdb.AsyncDuckDBConnection,
      ): Promise<Blob> => {
        return await DuckDbClient.runRawQuery(`SELECT * FROM "${viewName}"`, {
          returnType: "parquet",
          conn,
        });
      };
      const parquetBlob =
        duckDbConnection ?
          await runParquetQuery(duckDbConnection)
        : await DuckDbClient.withConnection(runParquetQuery);
      const bytes = new Uint8Array(await parquetBlob.arrayBuffer());
      // We send under the upstream's view name so user code can
      // reference each input as a local variable in Python / R.
      inputs.push({ name: viewName, arrow: bytes });
    }

    const result = await runInSandbox({
      runtime,
      code: step.code,
      inputs,
    });

    // Bring the result back into DuckDB as a parquet-backed view.
    const viewName = stepViewName(step.id);
    const resultBlob = new Blob([result.arrow.buffer as ArrayBuffer], {
      type: "application/vnd.apache.parquet",
    });
    await DuckDbClient.loadParquet({
      tableName: viewName,
      blob: resultBlob,
    });

    // Pull schema + preview.
    const previewResult = await DuckDbClient.runRawQuery<
      Record<string, unknown>
    >(`SELECT * FROM "${viewName}" LIMIT ${PREVIEW_ROW_CAP}`);
    const actualSchema = previewResult.columns.map((c) => {
      return { name: c.name, type: String(c.dataType ?? "unknown") };
    });
    const countResult = await DuckDbClient.runRawQuery<{
      rc: bigint | number;
    }>(`SELECT COUNT(*) AS rc FROM "${viewName}"`);
    const firstRow = countResult.data[0];
    const rowCount =
      firstRow && firstRow.rc !== undefined && firstRow.rc !== null ?
        Number(firstRow.rc)
      : previewResult.data.length;

    // Persist to IndexedDB so the analysis is reloadable across page
    // refreshes: same pattern as SQL steps.
    try {
      await PlanStepStorage.putPlanStepBlob({
        planId,
        stepId: step.id,
        parquet: resultBlob,
        schema: actualSchema,
        rowCount,
      });
    } catch (e) {
      console.warn(
        `[plan] failed to persist sandbox step ${step.id} as parquet:`,
        e,
      );
    }

    dispatch.markStepSucceeded({
      stepId: step.id,
      viewName,
      actualSchema,
      rowCount,
      previewRows: previewResult.data,
    });
    return { ok: true };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    dispatch.markStepFailed({ stepId: step.id, error });
    return { ok: false, error };
  }
}

/**
 * Optional schema-drift regen context. Pass this to
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
  workspaceId: Workspace.Id;
  /** Optional drift-regen behaviour. */
  driftRegen?: DriftRegenContext;
}): Promise<void> {
  const { planId, nodes, dispatch, workspaceId, driftRegen } = args;

  // Track how many regen attempts we've spent on each (step): capped
  // by MAX_REGEN_ATTEMPTS so a misbehaving LLM can't burn through
  // tokens. `replaceStepCode` bumps `regenAttempts` on the node, so
  // the next pass through reads it from the live plan.
  const regenCountByStep = new Map<string, number>();

  await DuckDbClient.withConnection(async (duckDbConnection) => {
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i]!;
      const nodeById = new Map<string, PlanNode>();
      for (let j = 0; j < i; j++) {
        const earlier = nodes[j]!;
        nodeById.set(earlier.id, earlier);
      }
      const outcome = await executePlanStep({
        planId,
        step: node,
        dispatch,
        workspaceId,
        duckDbConnection,
        nodeById,
      });
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
      // Drift check: pull the freshly-executed step out of the
      // latest plan so we can read its `actualSchema`.
      const latestPlan = driftRegen.getLatestPlan();
      const latestNode = (latestPlan.steps as PlanNode[]).find((planNode) => {
        return planNode.id === node.id;
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
            const regenNodeById = makeIdLookupMap(latest.steps as PlanNode[]);
            const target = regenNodeById.get(stepId);
            if (!target) {
              return;
            }
            await executePlanStep({
              planId,
              step: target,
              dispatch,
              workspaceId: driftRegen.workspaceId,
              duckDbConnection,
              nodeById: regenNodeById,
            });
          },
        });
      } catch (e) {
        console.warn("[plan] drift regen failed:", e);
      }
    }
  });
}

/**
 * Best-effort cleanup. Drops the DuckDB temp views AND clears the
 * IndexedDB parquet blobs for the given plan. Call when:
 *
 *   - A new plan replaces the prior one
 *   - The user clicks "Close plan"
 *   - The chat panel unmounts (defensive: Plan provider cleanup
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
      // Swallow: view cleanup is best-effort.
    }
  }
  if (args.planId) {
    try {
      await PlanStepStorage.clearPlanStepBlobs(args.planId);
    } catch {
      // Swallow.
    }
  }
}

/**
 * Reload a previously-materialised plan from IndexedDB into DuckDB.
 *
 * Reads each step's parquet blob from `PlanStepStorage` and registers
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
