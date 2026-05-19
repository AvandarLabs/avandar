import { act, renderHook } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { PlanBranchStateManager } from "@/components/ChatPanel/PlanStateManager/PlanBranchStateManager";
import type { PlanNode } from "@/components/ChatPanel/PlanStateManager/PlanStateManager";

function setup() {
  return renderHook(
    () => {
      return PlanBranchStateManager.useContext();
    },
    { wrapper: PlanBranchStateManager.Provider },
  );
}

function makeStep(id: string): PlanNode {
  return {
    id,
    description: `step ${id}`,
    type: "sql",
    code: "SELECT 1",
    inputs: [],
    predictedSchema: [],
    status: "succeeded",
    viewName: `step_${id}`,
    actualSchema: [{ name: "x", type: "INTEGER" }],
    rowCount: 1,
  };
}

describe("PlanBranchStateManager", () => {
  test("openBranch installs a branch and makes it active", () => {
    const { result } = setup();
    act(() => {
      result.current[1].openBranch({
        parentPlanId: "p1",
        parentStep: makeStep("filter"),
        title: "what about North?",
      });
    });
    const [state] = result.current;
    const branches = Object.values(state.branches);
    expect(branches.length).toBe(1);
    expect(state.activeBranchId).toBe(branches[0]!.planId);
    expect(branches[0]!.parentStepId).toBe("filter");
    expect(branches[0]!.anchorViewName).toBe("step_filter");
  });

  test("setActiveBranch switches the active id", () => {
    const { result } = setup();
    act(() => {
      result.current[1].openBranch({
        parentPlanId: "p1",
        parentStep: makeStep("a"),
        title: "first",
      });
    });
    act(() => {
      result.current[1].openBranch({
        parentPlanId: "p1",
        parentStep: makeStep("b"),
        title: "second",
      });
    });
    const first = Object.values(result.current[0].branches)[0]!;
    act(() => {
      result.current[1].setActiveBranch(first.planId);
    });
    expect(result.current[0].activeBranchId).toBe(first.planId);
    act(() => {
      result.current[1].setActiveBranch(null);
    });
    expect(result.current[0].activeBranchId).toBeNull();
  });

  test("closeBranch removes the entry and resets active when it was active", () => {
    const { result } = setup();
    act(() => {
      result.current[1].openBranch({
        parentPlanId: "p1",
        parentStep: makeStep("a"),
        title: "only",
      });
    });
    const active = result.current[0].activeBranchId!;
    act(() => {
      result.current[1].closeBranch(active);
    });
    expect(Object.keys(result.current[0].branches).length).toBe(0);
    expect(result.current[0].activeBranchId).toBeNull();
  });

  test("clearAllBranches wipes everything", () => {
    const { result } = setup();
    act(() => {
      result.current[1].openBranch({
        parentPlanId: "p1",
        parentStep: makeStep("a"),
        title: "first",
      });
    });
    act(() => {
      result.current[1].openBranch({
        parentPlanId: "p1",
        parentStep: makeStep("b"),
        title: "second",
      });
    });
    act(() => {
      result.current[1].clearAllBranches();
    });
    expect(Object.keys(result.current[0].branches).length).toBe(0);
    expect(result.current[0].activeBranchId).toBeNull();
  });
});
