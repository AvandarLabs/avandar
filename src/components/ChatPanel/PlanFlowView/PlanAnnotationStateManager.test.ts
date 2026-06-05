import { act, renderHook } from "@/test-utils";
import { describe, expect, test } from "vitest";
import { PlanAnnotationStateManager } from "@/components/ChatPanel/PlanFlowView/PlanAnnotationStateManager";
import type {
  Annotation,
  TextAnnotation,
} from "@/components/ChatPanel/PlanFlowView/PlanAnnotationStateManager";

function setup() {
  return renderHook(
    () => {
      return PlanAnnotationStateManager.useContext();
    },
    { wrapper: PlanAnnotationStateManager.Provider },
  );
}

type NewAnnotation = Omit<Annotation, "id" | "createdAt" | "updatedAt">;
type NewTextAnnotation = Omit<TextAnnotation, "id" | "createdAt" | "updatedAt">;

function textAnnotation(args: {
  planId: string;
  text: string;
  x?: number;
  y?: number;
}): NewAnnotation {
  const t: NewTextAnnotation = {
    kind: "text",
    planId: args.planId,
    x: args.x ?? 0,
    y: args.y ?? 0,
    fontSize: 14,
    text: args.text,
  };
  return t;
}

describe("PlanAnnotationStateManager", () => {
  test("addAnnotation inserts and selects the new annotation", () => {
    const { result } = setup();
    act(() => {
      result.current[1].addAnnotation({
        annotation: textAnnotation({ planId: "plan-a", text: "hi" }),
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
        annotation: textAnnotation({ planId: "plan-a", text: "first" }),
      });
    });
    act(() => {
      result.current[1].addAnnotation({
        annotation: textAnnotation({
          planId: "plan-a",
          text: "second",
          x: 5,
          y: 5,
        }),
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
        annotation: textAnnotation({ planId: "plan-a", text: "a" }),
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
        annotation: textAnnotation({ planId: "plan-a", text: "a" }),
      });
    });
    act(() => {
      result.current[1].addAnnotation({
        annotation: textAnnotation({ planId: "plan-b", text: "b" }),
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
