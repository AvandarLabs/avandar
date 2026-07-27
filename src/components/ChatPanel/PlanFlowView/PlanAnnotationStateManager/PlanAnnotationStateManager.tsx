import { uuid } from "$/lib/uuid";
import { createAppStateManager } from "@/lib/utils/state/createAppStateManager/createAppStateManager";
import type { PlanAnnotation } from "@/models/chat/PlanAnnotation/PlanAnnotation";

/**
 * Canvas Annotation + Export.
 *
 * Annotations are user-drawn overlays on the plan canvas. They live
 * alongside the plan in IndexedDB (keyed by `planId`), serialise into
 * a JSONB column on `datasets__virtual` when the dataset is saved,
 * and never reach the LLM.
 *
 * Four kinds:
 *   - text: a positioned, optionally-rotated string.
 *   - sticky: a small coloured note rectangle with text inside.
 *   - arrow: two endpoints + optional label, drawn with RoughJS so
 *     it matches the auto-laid-out plan edges visually.
 *   - stroke: a freehand pen path; the points are the raw pointer
 *     samples, smoothed by `perfect-freehand` at render time.
 *
 * Undo/redo is a fixed-depth in-memory stack (50 entries). Clearing
 * the plan clears the redo stack too.
 */

/** Interaction tools available on the plan annotation canvas. */
export type AnnotationTool =
  | "pan"
  | "text"
  | "sticky"
  | "arrow"
  | "pen"
  | "erase";

const HISTORY_CAP = 50;

/** In-memory editing state for annotations across loaded plans. */
export type PlanAnnotationState = {
  /** All annotations across all plans, keyed by id. Filter by planId. */
  annotations: Record<string, PlanAnnotation.T>;
  /** Active drawing tool. */
  activeTool: AnnotationTool;
  /** Currently selected annotation id (for delete + edit). */
  selectedId: PlanAnnotation.Id | undefined;
  /** Undo stack: snapshots of `annotations` before each mutation. */
  undoStack: ReadonlyArray<Record<string, PlanAnnotation.T>>;
  /** Redo stack: snapshots produced by `undo`. */
  redoStack: ReadonlyArray<Record<string, PlanAnnotation.T>>;
};

const initialState: PlanAnnotationState = {
  annotations: {},
  activeTool: "pan",
  selectedId: undefined,
  undoStack: [],
  redoStack: [],
};

function _push(
  history: ReadonlyArray<Record<string, PlanAnnotation.T>>,
  next: Record<string, PlanAnnotation.T>,
): ReadonlyArray<Record<string, PlanAnnotation.T>> {
  const updated = [...history, next];
  if (updated.length > HISTORY_CAP) {
    return updated.slice(updated.length - HISTORY_CAP);
  }
  return updated;
}

/** State manager for plan annotation editing, selection, and history. */
export const PlanAnnotationStateManager = createAppStateManager({
  name: "ChatPlanAnnotations",
  initialState,
  actions: {
    setTool: (
      state: PlanAnnotationState,
      tool: AnnotationTool,
    ): PlanAnnotationState => {
      return { ...state, activeTool: tool };
    },

    selectAnnotation: (
      state: PlanAnnotationState,
      id?: PlanAnnotation.Id,
    ): PlanAnnotationState => {
      return { ...state, selectedId: id };
    },

    addAnnotation: (
      state: PlanAnnotationState,
      args: {
        annotation: Omit<PlanAnnotation.T, "id" | "createdAt" | "updatedAt">;
      },
    ): PlanAnnotationState => {
      const now = Date.now();
      const id = uuid() as PlanAnnotation.Id;
      // The discriminated union doesn't survive object spread without
      // a deliberate cast through unknown; we trust the caller's
      // `args.annotation.kind` to be consistent with its other fields.
      const nextState = {
        ...(args.annotation as object),
        id,
        createdAt: now,
        updatedAt: now,
      } as unknown as PlanAnnotation.T;
      return {
        ...state,
        annotations: { ...state.annotations, [id]: nextState },
        undoStack: _push(state.undoStack, state.annotations),
        redoStack: [],
        selectedId: id,
      };
    },

    updateAnnotation: (
      state: PlanAnnotationState,
      args: { id: PlanAnnotation.Id; patch: Partial<PlanAnnotation.T> },
    ): PlanAnnotationState => {
      const existing = state.annotations[args.id];
      if (!existing) {
        return state;
      }
      const nextState = {
        ...existing,
        ...args.patch,
        updatedAt: Date.now(),
      } as PlanAnnotation.T;
      return {
        ...state,
        annotations: { ...state.annotations, [args.id]: nextState },
        undoStack: _push(state.undoStack, state.annotations),
        redoStack: [],
      };
    },

    deleteAnnotation: (
      state: PlanAnnotationState,
      id: PlanAnnotation.Id,
    ): PlanAnnotationState => {
      if (!state.annotations[id]) {
        return state;
      }
      const { [id]: _removed, ...rest } = state.annotations;
      return {
        ...state,
        annotations: rest,
        undoStack: _push(state.undoStack, state.annotations),
        redoStack: [],
        selectedId: state.selectedId === id ? undefined : state.selectedId,
      };
    },

    undo: (state: PlanAnnotationState): PlanAnnotationState => {
      if (state.undoStack.length === 0) {
        return state;
      }
      const last = state.undoStack[state.undoStack.length - 1]!;
      return {
        ...state,
        annotations: last,
        undoStack: state.undoStack.slice(0, -1),
        redoStack: _push(state.redoStack, state.annotations),
      };
    },

    redo: (state: PlanAnnotationState): PlanAnnotationState => {
      if (state.redoStack.length === 0) {
        return state;
      }
      const nextState = state.redoStack[state.redoStack.length - 1]!;
      return {
        ...state,
        annotations: nextState,
        redoStack: state.redoStack.slice(0, -1),
        undoStack: _push(state.undoStack, state.annotations),
      };
    },

    /**
     * Replace all annotations for the given plan. Used when loading a
     * persisted annotation set from a virtual dataset. Wipes undo/redo.
     */
    loadAnnotations: (
      state: PlanAnnotationState,
      args: { planId: string; annotations: PlanAnnotation.T[] },
    ): PlanAnnotationState => {
      // Strip any annotations that don't belong to other plans we
      // still have loaded.
      const kept = Object.fromEntries(
        Object.entries(state.annotations).filter(([, a]) => {
          return a.planId !== args.planId;
        }),
      );
      const merged: Record<string, PlanAnnotation.T> = {
        ...kept,
        ...Object.fromEntries(
          args.annotations.map((a) => {
            return [a.id, a];
          }),
        ),
      };
      return {
        ...state,
        annotations: merged,
        undoStack: [],
        redoStack: [],
      };
    },

    /** Drop every annotation for a plan. */
    clearPlanAnnotations: (
      state: PlanAnnotationState,
      planId: string,
    ): PlanAnnotationState => {
      const filtered = Object.fromEntries(
        Object.entries(state.annotations).filter(([, a]) => {
          return a.planId !== planId;
        }),
      );
      return {
        ...state,
        annotations: filtered,
        undoStack: _push(state.undoStack, state.annotations),
        redoStack: [],
        selectedId: undefined,
      };
    },
  },
});
