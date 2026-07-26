import { makeIdLookupMap } from "@utils";
import { useCallback, useEffect } from "react";
import {
  executePlan,
  executePlanStep,
} from "@/components/ChatPanel/PlanStateManager/planExecutor";
import { PlanStateManager } from "@/components/ChatPanel/PlanStateManager/PlanStateManager";
import type {
  PlanNode,
  PlanState,
} from "@/components/ChatPanel/PlanStateManager/PlanStateManager";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { ChatPlan } from "$/types/chat.types";

type PlanDispatch = ReturnType<typeof PlanStateManager.useDispatch>;

/**
 * Plan-run orchestration for the plan canvas.
 *
 * Owns `runAll` (execute the whole plan), `runSingle` (execute one
 * step), and the auto-run effect that fires `runAll` exactly once when
 * an `auto`-mode plan is approved. Lifted out of `PlanFlowCanvas` as a
 * self-contained hook: the callables' dependency arrays and the
 * effect's timing are identical to the inline versions.
 *
 * The `stateRef` and `runOnceRef` refs are owned by the caller (so the
 * caller can also reset `runOnceRef` on close) and passed in unchanged.
 */
export function usePlanRun(params: {
  planId: string | null;
  state: PlanState;
  dispatch: PlanDispatch;
  workspaceId: Workspace.Id;
  stateRef: React.RefObject<PlanState>;
  runOnceRef: React.RefObject<string | null>;
}): {
  runAll: () => Promise<void>;
  runSingle: (node: PlanNode) => Promise<void>;
} {
  const { planId, state, dispatch, workspaceId, stateRef, runOnceRef } = params;

  const runAll = useCallback(async (): Promise<void> => {
    if (!planId) {
      return;
    }
    // Approval gate. The button caller is already gated by the
    // banner UI, but `runAll` is also fired by the auto-run effect
    // (that effect has its own gate). This is the belt for the
    // braces.
    if (stateRef.current.approvalStatus !== "approved") {
      return;
    }
    await executePlan({
      planId,
      nodes: state.nodes,
      dispatch,
      workspaceId,
      driftRegen: {
        workspaceId,
        getLatestPlan: (): ChatPlan => {
          const cur = stateRef.current;
          return {
            rootMessage: cur.rootMessage,
            steps: cur.nodes,
          };
        },
      },
    });
  }, [planId, state.nodes, dispatch, workspaceId]);

  const runSingle = useCallback(
    async (node: PlanNode): Promise<void> => {
      if (!planId) {
        return;
      }
      if (stateRef.current.approvalStatus !== "approved") {
        return;
      }
      const nodeById = makeIdLookupMap(stateRef.current.nodes);
      await executePlanStep({
        planId,
        step: node,
        dispatch,
        workspaceId,
        nodeById,
      });
    },
    [planId, dispatch, workspaceId],
  );

  // Auto-run on first load when runMode === 'auto' AND the user has
  // approved the plan. Approval is the gate that distinguishes
  // "LLM just proposed this" from "user wants this to run." Key off
  // the planId so a brand-new plan triggers exactly one run.
  useEffect(function runApprovedPlan() {
    if (state.nodes.length === 0 || !state.isVisible || !planId) {
      return;
    }
    if (state.runMode !== "auto") {
      return;
    }
    if (state.approvalStatus !== "approved") {
      return;
    }
    const allPending = state.nodes.every((n) => {
      return n.status === "pending";
    });
    if (allPending && runOnceRef.current !== planId) {
      runOnceRef.current = planId;
      void runAll();
    }
  }, [
    state.nodes,
    state.isVisible,
    state.runMode,
    state.approvalStatus,
    planId,
    runAll,
  ]);

  return { runAll, runSingle };
}
