import { createAppStateManager } from "@/lib/utils/state/createAppStateManager";
import type { ChatPlan, ChatPlanStep } from "$/types/chat.types";

/**
 * Runtime status of a single plan step.
 *
 * - `pending`: queued but not yet started.
 * - `running`: DuckDB query is in-flight.
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

/** Runtime annotations attached to each step as the plan executes. */
export type PlanNode = ChatPlanStep & {
  status: PlanStepStatus;
  /** Error message from DuckDB when the step failed. */
  error?: string;
  /** Name of the temp view created in DuckDB for downstream steps. */
  viewName?: string;
  /** Actual schema observed after execution. */
  actualSchema?: Array<{ name: string; type: string }>;
  /** Row count returned by the query. */
  rowCount?: number;
  /** First few rows for preview. Never sent back over the wire. */
  previewRows?: ReadonlyArray<Record<string, unknown>>;
};

export type PlanState = {
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
};

const initialState: PlanState = {
  nodes: [],
  rootMessage: "",
  runMode: "auto",
  focusedStepId: null,
  isVisible: false,
};

/**
 * State for the multi-step analytic plan view (Phase 3).
 *
 * Plans are proposed by the LLM via the `proposePlan` tool. The runtime
 * fans the steps out across DuckDB-WASM, materialising each as a temp
 * view (`step_<id>`) so that downstream steps can join against it. The
 * xyflow DAG view reads from this manager.
 */
export const PlanStateManager = createAppStateManager({
  name: "ChatPlan",
  initialState,
  actions: {
    /**
     * Load a fresh plan from the LLM and reset all runtime state to
     * `pending`. Drops any prior plan; the caller is responsible for
     * dropping any DuckDB temp views via `dropAllTempViews`.
     */
    loadPlan: (state: PlanState, plan: ChatPlan): PlanState => {
      return {
        ...state,
        nodes: plan.steps.map((step) => {
          return { ...step, status: "pending" as const };
        }),
        rootMessage: plan.rootMessage,
        focusedStepId: plan.steps[0]?.id ?? null,
        isVisible: true,
      };
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

    setRunMode: (state: PlanState, runMode: PlanRunMode): PlanState => {
      return { ...state, runMode };
    },

    setFocusedStep: (state: PlanState, stepId: string | null): PlanState => {
      return { ...state, focusedStepId: stepId };
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
