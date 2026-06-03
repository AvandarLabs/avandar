import { uuid } from "$/lib/uuid";
import { createAppStateManager } from "@/lib/utils/state/createAppStateManager/createAppStateManager";
import type { ChatPlan, ChatPlanStep } from "$/types/chat.types";

/**
 * Runtime status of a single plan step.
 *
 * - `pending`: queued but not yet started.
 * - `running`: DuckDB / Pyodide / WebR query is in-flight.
 * - `succeeded`: query returned, the temp view exists.
 * - `failed`: query threw; `error` populated.
 * - `skipped`: an upstream step failed so this step never ran.
 */
export type PlanStepStatus =
  | "pending"
  | "running"
  | "succeeded"
  | "failed"
  | "skipped";

export type PlanRunMode = "auto" | "step";

/**
 * Lifecycle of a plan from "LLM proposed it" to "user approved it"
 * to "actively running". The user has to opt in before any step
 * touches their data — a plan can be way off and re-running blindly
 * burns DuckDB resources for nothing.
 */
export type PlanApprovalStatus = "awaiting_approval" | "approved" | "rejected";

/**
 * Canvas zoom modes. `overview` is the zoomed-out xyflow DAG; `focused`
 * zooms into a single step's preview (typically pushed onto the Data
 * Explorer canvas via `setRawSql`).
 */
export type PlanCanvasView = "overview" | "focused";

/**
 * Phase 5 — Branching. Each plan can be branched from any succeeded
 * step into a child plan. The branch carries the parent step's
 * `actualSchema` as its anchor so the LLM can write SQL against it
 * without re-running the parent chain.
 */
export type PlanBranchRef = {
  /** Unique id of the child plan (= `planId` for the child PlanState). */
  planId: string;
  /** Step id in the parent plan that this branch forks off of. */
  parentStepId: string;
  /** Auto-derived title from the first user message in the branch. */
  title: string;
  createdAt: number;
};

/** Runtime annotations attached to each step as the plan executes. */
export type PlanNode = ChatPlanStep & {
  status: PlanStepStatus;
  /** Error message from DuckDB / Pyodide / WebR when the step failed. */
  error?: string;
  /** Name of the temp view created in DuckDB for downstream steps. */
  viewName?: string;
  /** Actual schema observed after execution. */
  actualSchema?: Array<{ name: string; type: string }>;
  /** Row count returned by the query. */
  rowCount?: number;
  /** First few rows for preview. Never sent back over the wire. */
  previewRows?: ReadonlyArray<Record<string, unknown>>;
  /** Schema-drift regen attempts that have been applied to this step. */
  regenAttempts?: number;
  /** Phase 5 — child branches forked off this step. */
  branches?: PlanBranchRef[];
};

export type PlanState = {
  /**
   * Stable identifier for the current plan. Used as the key for
   * IndexedDB materialisation and for the JSON blob saved onto virtual
   * datasets.
   */
  planId: string | null;
  /** The plan emitted by the LLM, with runtime status per step. */
  nodes: PlanNode[];
  /** The "rootMessage" the LLM emitted with the plan. */
  rootMessage: string;
  /**
   * Auto-run all steps sequentially, or pause between steps for the user
   * to inspect / confirm. Defaults to `auto`.
   */
  runMode: PlanRunMode;
  /** Active step id when the user clicks a node — drives canvas focus. */
  focusedStepId: string | null;
  /** Whether the plan panel is currently visible on the canvas. */
  isVisible: boolean;
  /** Overview (zoomed-out DAG) vs focused (single-step canvas). */
  canvasView: PlanCanvasView;
  /**
   * Approval gate. A freshly-loaded plan starts in `awaiting_approval`;
   * the executor refuses to start until the user calls
   * `approvePlan`. Existing tests + virtual-dataset rehydration call
   * `approvePlan` directly so the auto-run path keeps working.
   */
  approvalStatus: PlanApprovalStatus;
  /** Phase 5 — when this plan is a branch, the parent ref. */
  parentBranch?: {
    parentPlanId: string;
    parentStepId: string;
    /** Actual schema of the parent step at the time of branching. */
    anchorSchema: Array<{ name: string; type: string }>;
    /** View name on which the branch was anchored (`step_<parentStepId>`). */
    anchorViewName: string;
  };
};

const initialState: PlanState = {
  planId: null,
  nodes: [],
  rootMessage: "",
  runMode: "auto",
  focusedStepId: null,
  isVisible: false,
  canvasView: "overview",
  approvalStatus: "awaiting_approval",
  parentBranch: undefined,
};

/**
 * State for the multi-step analytic plan view (Phase 3+).
 *
 * Plans are proposed by the LLM via the `proposePlan` tool. The runtime
 * fans the steps out across DuckDB-WASM (and, for `python`/`r` steps
 * after user approval, the sandboxed iframe in Phase 6). Each step's
 * result is persisted to IndexedDB as parquet so the analysis can be
 * reopened across reloads and saved into virtual datasets. The xyflow
 * DAG view reads from this manager.
 */
export const PlanStateManager = createAppStateManager({
  name: "ChatPlan",
  initialState,
  actions: {
    /**
     * Load a fresh plan from the LLM and reset all runtime state to
     * `pending`. Drops any prior plan; the caller is responsible for
     * dropping any DuckDB temp views + IndexedDB blobs via
     * `dropPlanTempViews`. The plan lands in `awaiting_approval` — the
     * user must explicitly approve before any step runs.
     */
    loadPlan: (state: PlanState, plan: ChatPlan): PlanState => {
      return {
        ...state,
        planId: uuid(),
        nodes: plan.steps.map((step) => {
          return { ...step, status: "pending" as const };
        }),
        rootMessage: plan.rootMessage,
        focusedStepId: plan.steps[0]?.id ?? null,
        isVisible: true,
        canvasView: "overview",
        approvalStatus: "awaiting_approval",
        parentBranch: undefined,
      };
    },

    /**
     * Hydrate a previously-persisted plan (e.g. when reopening a saved
     * virtual dataset). Caller is responsible for running
     * `rehydratePlanStep` against each blob. The plan lands in
     * `approved` because the user already gave consent on the
     * original save.
     */
    hydratePlan: (
      state: PlanState,
      args: {
        planId: string;
        plan: ChatPlan;
        statuses: ReadonlyArray<{
          stepId: string;
          status: PlanStepStatus;
          viewName?: string;
          actualSchema?: Array<{ name: string; type: string }>;
          rowCount?: number;
        }>;
      },
    ): PlanState => {
      const statusByStep = new Map(
        args.statuses.map((s) => {
          return [s.stepId, s] as const;
        }),
      );
      return {
        ...state,
        planId: args.planId,
        nodes: args.plan.steps.map((step) => {
          const meta = statusByStep.get(step.id);
          return {
            ...step,
            status: meta?.status ?? "pending",
            viewName: meta?.viewName,
            actualSchema: meta?.actualSchema,
            rowCount: meta?.rowCount,
          };
        }),
        rootMessage: args.plan.rootMessage,
        focusedStepId: args.plan.steps[0]?.id ?? null,
        isVisible: true,
        canvasView: "overview",
        approvalStatus: "approved",
        parentBranch: undefined,
      };
    },

    /** User approved the plan; the executor can run it. */
    approvePlan: (state: PlanState): PlanState => {
      return { ...state, approvalStatus: "approved" };
    },

    /** User rejected the plan; the canvas stays visible for inspection. */
    rejectPlan: (state: PlanState): PlanState => {
      return { ...state, approvalStatus: "rejected" };
    },

    /** Mark a step as running. Idempotent. */
    markStepRunning: (state: PlanState, stepId: string): PlanState => {
      return {
        ...state,
        nodes: state.nodes.map((n) => {
          return n.id === stepId ?
              { ...n, status: "running" as const, error: undefined }
            : n;
        }),
      };
    },

    /** Mark a step as succeeded and attach its result metadata. */
    markStepSucceeded: (
      state: PlanState,
      args: {
        stepId: string;
        viewName: string;
        actualSchema: Array<{ name: string; type: string }>;
        rowCount: number;
        previewRows: ReadonlyArray<Record<string, unknown>>;
      },
    ): PlanState => {
      return {
        ...state,
        nodes: state.nodes.map((n) => {
          if (n.id !== args.stepId) {
            return n;
          }
          return {
            ...n,
            status: "succeeded" as const,
            viewName: args.viewName,
            actualSchema: args.actualSchema,
            rowCount: args.rowCount,
            previewRows: args.previewRows,
            error: undefined,
          };
        }),
      };
    },

    /** Mark a step as failed and surface its error. */
    markStepFailed: (
      state: PlanState,
      args: { stepId: string; error: string },
    ): PlanState => {
      return {
        ...state,
        nodes: state.nodes.map((n) => {
          return n.id === args.stepId ?
              { ...n, status: "failed" as const, error: args.error }
            : n;
        }),
      };
    },

    /** Mark a step as skipped because an upstream step failed. */
    markStepSkipped: (state: PlanState, stepId: string): PlanState => {
      return {
        ...state,
        nodes: state.nodes.map((n) => {
          return n.id === stepId ? { ...n, status: "skipped" as const } : n;
        }),
      };
    },

    /**
     * Replace a step's `code` after a Phase 4 schema-drift regen. The
     * regenerated step is set back to `pending` so the executor picks
     * it up again; `regenAttempts` is incremented to honour the cap.
     */
    replaceStepCode: (
      state: PlanState,
      args: { stepId: string; code: string },
    ): PlanState => {
      return {
        ...state,
        nodes: state.nodes.map((n) => {
          if (n.id !== args.stepId) {
            return n;
          }
          return {
            ...n,
            code: args.code,
            status: "pending" as const,
            error: undefined,
            viewName: undefined,
            actualSchema: undefined,
            rowCount: undefined,
            previewRows: undefined,
            regenAttempts: (n.regenAttempts ?? 0) + 1,
          };
        }),
      };
    },

    /**
     * Phase 5 — Branching. Attach a child branch ref onto the
     * parent step. The ChatBranchStateManager owns the actual thread
     * + plan; this is just the back-pointer the parent node renders
     * in its "branches" list.
     */
    addBranch: (state: PlanState, branch: PlanBranchRef): PlanState => {
      return {
        ...state,
        nodes: state.nodes.map((n) => {
          if (n.id !== branch.parentStepId) {
            return n;
          }
          const existing = n.branches ?? [];
          return { ...n, branches: [...existing, branch] };
        }),
      };
    },

    /**
     * Install the parent-branch anchor when loading this plan AS A
     * branch. The chat backend will prepend the anchor schema +
     * view name to the system prompt so the LLM can write SQL that
     * starts from the parent step's output.
     */
    setParentBranch: (
      state: PlanState,
      parentBranch: PlanState["parentBranch"],
    ): PlanState => {
      return { ...state, parentBranch };
    },

    setRunMode: (state: PlanState, runMode: PlanRunMode): PlanState => {
      return { ...state, runMode };
    },

    setFocusedStep: (state: PlanState, stepId: string | null): PlanState => {
      return { ...state, focusedStepId: stepId };
    },

    setCanvasView: (
      state: PlanState,
      canvasView: PlanCanvasView,
    ): PlanState => {
      return { ...state, canvasView };
    },

    setVisible: (state: PlanState, isVisible: boolean): PlanState => {
      return { ...state, isVisible };
    },

    /** Clear the plan. The caller should also drop temp views in DuckDB. */
    clear: (state: PlanState): PlanState => {
      return { ...state, ...initialState };
    },
  },
});
