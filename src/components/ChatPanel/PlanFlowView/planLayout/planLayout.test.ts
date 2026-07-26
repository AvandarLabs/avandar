import { prop } from "@utils";
import { describe, expect, test } from "vitest";
import { layoutPlan } from "@/components/ChatPanel/PlanFlowView/planLayout/planLayout";
import type { PlanNode } from "@/components/ChatPanel/PlanStateManager/PlanStateManager";

function makeNode(args: { id: string; inputs?: string[] }): PlanNode {
  return {
    id: args.id,
    description: `step ${args.id}`,
    type: "sql",
    code: "",
    inputs: args.inputs ?? [],
    predictedSchema: [],
    status: "pending",
  };
}

describe("layoutPlan", () => {
  test("assigns nodes with no inputs to layer 0", () => {
    const { rfNodes } = layoutPlan({
      nodes: [makeNode({ id: "a" }), makeNode({ id: "b" })],
      focusedStepId: undefined,
    });
    expect(rfNodes.length).toBe(2);
    expect(rfNodes[0]!.position.x).toBe(0);
    expect(rfNodes[1]!.position.x).toBe(0);
  });

  test("places dependents one layer to the right of their input", () => {
    const { rfNodes } = layoutPlan({
      nodes: [
        makeNode({ id: "filter" }),
        makeNode({ id: "agg", inputs: ["filter"] }),
        makeNode({ id: "rank", inputs: ["agg"] }),
      ],
      focusedStepId: undefined,
    });
    const xs = rfNodes
      .map((n) => {
        return [n.id, n.position.x] as const;
      })
      .reduce<Record<string, number>>((acc, [id, x]) => {
        acc[id] = x;
        return acc;
      }, {});
    expect(xs.filter).toBe(0);
    expect(xs.agg).toBeGreaterThan(xs.filter ?? 0);
    expect(xs.rank).toBeGreaterThan(xs.agg ?? 0);
  });

  test("emits one edge per declared input", () => {
    const { rfEdges } = layoutPlan({
      nodes: [
        makeNode({ id: "a" }),
        makeNode({ id: "b" }),
        makeNode({ id: "c", inputs: ["a", "b"] }),
      ],
      focusedStepId: undefined,
    });
    expect(rfEdges.length).toBe(2);
    expect(rfEdges.map(prop("id")).sort()).toEqual(["a->c", "b->c"]);
  });

  test("ignores inputs that reference missing steps", () => {
    const { rfEdges } = layoutPlan({
      nodes: [
        makeNode({ id: "a" }),
        makeNode({ id: "b", inputs: ["does_not_exist"] }),
      ],
      focusedStepId: undefined,
    });
    expect(rfEdges.length).toBe(0);
  });

  test("marks the focused node and its edges as selected", () => {
    const { rfEdges } = layoutPlan({
      nodes: [
        makeNode({ id: "a" }),
        makeNode({ id: "b", inputs: ["a"] }),
        makeNode({ id: "c", inputs: ["b"] }),
      ],
      focusedStepId: "b",
    });
    const aToB = rfEdges.find((e) => {
      return e.id === "a->b";
    });
    const bToC = rfEdges.find((e) => {
      return e.id === "b->c";
    });
    expect(aToB?.selected).toBe(true);
    expect(bToC?.selected).toBe(true);
  });
});
