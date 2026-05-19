import { uuid } from "$/lib/uuid";
import { createAppStateManager } from "@/lib/utils/state/createAppStateManager";
import type {
  PlanNode,
  PlanStepStatus,
} from "@/components/ChatPanel/PlanStateManager/PlanStateManager";
import type { ChatPlan } from "$/types/chat.types";

/**
 * Phase 5 — Branching.
 *
 * Each branch is an independent plan that forks off a parent plan's
 * step. It carries:
 *   - Its own `planId`, `nodes`, `runMode`, etc. (a full PlanState
 *     copy, minus the `parentBranch` field which is the anchor).
 *   - A back-pointer to the parent step (`parentPlanId`,
 *     `parentStepId`) so the canvas can render the lineage.
 *
 * The "active" plan is whichever the user is currently looking at:
 * the root plan (entry created by `proposePlan` from chat) or any
 * branch. `activeBranchId === null` means the root plan.
 *
 * Branches share the same IndexedDB step blob keyspace as the root
 * (each branch has its own `planId`, so blob keys never collide),
 * which means closing the root drops the root's blobs but leaves
 * branches alone — by design. To wipe everything, the user clicks
 * "Clear all branches".
 */

export type BranchRecord = {
  /** Unique plan id for this branch. */
  planId: string;
  /** Parent plan id this branch forks off of. */
  parentPlanId: string;
  /** Step id in the parent plan that this branch is anchored at. */
  parentStepId: string;
  /** Schema of the parent step at the time the branch was created. */
  anchorSchema: Array<{ name: string; type: string }>;
  /** View name registered in DuckDB at the time of branching. */
  anchorViewName: string;
  /** User-derived title — first user message, truncated. */
  title: string;
  /** Plan-state snapshot. Mirrors `PlanState` minus the lifecycle bits. */
  plan: ChatPlan;
  /** Per-step status overlay. */
  statuses: ReadonlyArray<{
    stepId: string;
    status: PlanStepStatus;
    viewName?: string;
    actualSchema?: Array<{ name: string; type: string }>;
    rowCount?: number;
  }>;
  createdAt: number;
};

export type PlanBranchState = {
  /**
   * All branches across all plans in this session. Keyed by branch
   * planId.
   */
  branches: Record<string, BranchRecord>;
  /**
   * Currently-displayed branch planId. `null` = the root plan in
   * `PlanStateManager` is what's showing.
   */
  activeBranchId: string | null;
};

const initialState: PlanBranchState = {
  branches: {},
  activeBranchId: null,
};

export const PlanBranchStateManager = createAppStateManager({
  name: "ChatPlanBranches",
  initialState,
  actions: {
    /**
     * Create a new branch off a parent step. Caller is responsible for
     * priming the parent step's view into DuckDB if it isn't already
     * registered (it usually is, since the step succeeded for branching
     * to make sense).
     */
    openBranch: (
      state: PlanBranchState,
      args: {
        parentPlanId: string;
        parentStep: PlanNode;
        title: string;
      },
    ): PlanBranchState => {
      const planId = uuid();
      const record: BranchRecord = {
        planId,
        parentPlanId: args.parentPlanId,
        parentStepId: args.parentStep.id,
        anchorSchema: args.parentStep.actualSchema ?? [],
        anchorViewName:
          args.parentStep.viewName ??
          `step_${args.parentStep.id.replace(/[^a-zA-Z0-9_]/g, "_")}`,
        title: args.title.slice(0, 80),
        plan: { steps: [], rootMessage: "" },
        statuses: [],
        createdAt: Date.now(),
      };
      return {
        ...state,
        branches: { ...state.branches, [planId]: record },
        activeBranchId: planId,
      };
    },

    /**
     * Replace a branch's plan + statuses snapshot. Called by the chat
     * runtime when the LLM proposes a plan on the branch thread.
     */
    updateBranch: (
      state: PlanBranchState,
      args: {
        branchId: string;
        plan: ChatPlan;
        statuses: BranchRecord["statuses"];
      },
    ): PlanBranchState => {
      const existing = state.branches[args.branchId];
      if (!existing) {
        return state;
      }
      return {
        ...state,
        branches: {
          ...state.branches,
          [args.branchId]: {
            ...existing,
            plan: args.plan,
            statuses: args.statuses,
          },
        },
      };
    },

    /** Switch which branch is rendered in the canvas. */
    setActiveBranch: (
      state: PlanBranchState,
      branchId: string | null,
    ): PlanBranchState => {
      return { ...state, activeBranchId: branchId };
    },

    /** Delete one branch. Does not touch its IndexedDB blobs — caller
     *  is responsible for cleanup via `clearPlanStepBlobs(planId)`. */
    closeBranch: (
      state: PlanBranchState,
      branchId: string,
    ): PlanBranchState => {
      if (!state.branches[branchId]) {
        return state;
      }
      const { [branchId]: _removed, ...rest } = state.branches;
      return {
        ...state,
        branches: rest,
        activeBranchId:
          state.activeBranchId === branchId ? null : state.activeBranchId,
      };
    },

    clearAllBranches: (state: PlanBranchState): PlanBranchState => {
      return { ...state, branches: {}, activeBranchId: null };
    },
  },
});
