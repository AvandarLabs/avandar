import { act, renderHook } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { PlanAnnotationStateManager } from "@/components/ChatPanel/PlanFlowView/PlanAnnotationStateManager";

function setup() {
  return renderHook(
    () => {
      return PlanAnnotationStateManager.useContext();
    },
    { wrapper: PlanAnnotationStateManager.Provider },
  );
}

describe("PlanAnnotationStateManager", () => {
  test("addAnnotation inserts and selects the new annotation", () => {
    const { result } = setup();
    act(() => {
      result.current[1].addAnnotation({
        annotation: {
          kind: "text",
          planId: "plan-a",
          x: 10,
          y: 10,
          fontSize: 14,
          text: "hi",
        },
      });
    });
    const [state] = result.current;
    const annotations = Object.values(state.annotations);
    expect(annotations.length).toBe(1);
    expect(state.selectedId).toBe(annotations[0]!.id);
  });

  test("undo restores prior state", () => {
    const { result } = setup();
    act(() => {
      result.current[1].addAnnotation({
        annotation: {
          kind: "text",
          planId: "plan-a",
          x: 0,
          y: 0,
          fontSize: 14,
          text: "first",
        },
      });
    });
    act(() => {
      result.current[1].addAnnotation({
        annotation: {
          kind: "text",
          planId: "plan-a",
          x: 5,
          y: 5,
          fontSize: 14,
          text: "second",
        },
      });
    });
    expect(Object.values(result.current[0].annotations).length).toBe(2);
    act(() => {
      result.current[1].undo();
    });
    expect(Object.values(result.current[0].annotations).length).toBe(1);
  });

  test("redo replays an undone change", () => {
    const { result } = setup();
    act(() => {
      result.current[1].addAnnotation({
        annotation: {
          kind: "text",
          planId: "plan-a",
          x: 0,
          y: 0,
          fontSize: 14,
          text: "a",
        },
      });
    });
    act(() => {
      result.current[1].undo();
    });
    expect(Object.values(result.current[0].annotations).length).toBe(0);
    act(() => {
      result.current[1].redo();
    });
    expect(Object.values(result.current[0].annotations).length).toBe(1);
  });

  test("clearPlanAnnotations only removes annotations for that plan", () => {
    const { result } = setup();
    act(() => {
      result.current[1].addAnnotation({
        annotation: {
          kind: "text",
          planId: "plan-a",
          x: 0,
          y: 0,
          fontSize: 14,
          text: "a",
        },
      });
    });
    act(() => {
      result.current[1].addAnnotation({
        annotation: {
          kind: "text",
          planId: "plan-b",
          x: 0,
          y: 0,
          fontSize: 14,
          text: "b",
        },
      });
    });
    act(() => {
      result.current[1].clearPlanAnnotations("plan-a");
    });
    const remaining = Object.values(result.current[0].annotations);
    expect(remaining.length).toBe(1);
    expect(remaining[0]!.planId).toBe("plan-b");
  });
});
