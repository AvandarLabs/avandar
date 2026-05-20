import { uuid } from "$/lib/uuid";
import { createAppStateManager } from "@/lib/utils/state/createAppStateManager";

/**
 * Phase 9 — Canvas Annotation + Export.
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

export type AnnotationKind = "text" | "sticky" | "arrow" | "stroke";

export type AnnotationBase = {
  id: string;
  /** Plan this annotation belongs to. */
  planId: string;
  createdAt: number;
  updatedAt: number;
  /** Optional plain text label / content. */
  text?: string;
  /** Colour as a CSS string. Default is theme-aware. */
  color?: string;
};

export type TextAnnotation = AnnotationBase & {
  kind: "text";
  x: number;
  y: number;
  fontSize: number;
  /** Rotation in degrees. */
  rotation?: number;
};

export type StickyAnnotation = AnnotationBase & {
  kind: "sticky";
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ArrowAnnotation = AnnotationBase & {
  kind: "arrow";
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
};

export type StrokeAnnotation = AnnotationBase & {
  kind: "stroke";
  /** Raw pointer samples; smoothed by perfect-freehand at render. */
  points: Array<[number, number, number?]>;
  strokeWidth: number;
};

export type Annotation =
  | TextAnnotation
  | StickyAnnotation
  | ArrowAnnotation
  | StrokeAnnotation;

export type AnnotationTool =
  | "pan"
  | "text"
  | "sticky"
  | "arrow"
  | "pen"
  | "erase";

const HISTORY_CAP = 50;

export type PlanAnnotationState = {
  /** All annotations across all plans, keyed by id. Filter by planId. */
  annotations: Record<string, Annotation>;
  /** Active drawing tool. */
  activeTool: AnnotationTool;
  /** Currently selected annotation id (for delete + edit). */
  selectedId: string | null;
  /** Undo stack — snapshots of `annotations` before each mutation. */
  undoStack: ReadonlyArray<Record<string, Annotation>>;
  /** Redo stack — snapshots produced by `undo`. */
  redoStack: ReadonlyArray<Record<string, Annotation>>;
};

const initialState: PlanAnnotationState = {
  annotations: {},
  activeTool: "pan",
  selectedId: null,
  undoStack: [],
  redoStack: [],
};

function _push(
  history: ReadonlyArray<Record<string, Annotation>>,
  next: Record<string, Annotation>,
): ReadonlyArray<Record<string, Annotation>> {
  const updated = [...history, next];
  if (updated.length > HISTORY_CAP) {
    return updated.slice(updated.length - HISTORY_CAP);
  }
  return updated;
}

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
      id: string | null,
    ): PlanAnnotationState => {
      return { ...state, selectedId: id };
    },

    addAnnotation: (
      state: PlanAnnotationState,
      args: { annotation: Omit<Annotation, "id" | "createdAt" | "updatedAt"> },
    ): PlanAnnotationState => {
      const now = Date.now();
      const id = uuid();
      // The discriminated union doesn't survive object spread without
      // a deliberate cast through unknown; we trust the caller's
      // `args.annotation.kind` to be consistent with its other fields.
      const next = {
        ...(args.annotation as object),
        id,
        createdAt: now,
        updatedAt: now,
      } as unknown as Annotation;
      return {
        ...state,
        annotations: { ...state.annotations, [id]: next },
        undoStack: _push(state.undoStack, state.annotations),
        redoStack: [],
        selectedId: id,
      };
    },

    updateAnnotation: (
      state: PlanAnnotationState,
      args: { id: string; patch: Partial<Annotation> },
    ): PlanAnnotationState => {
      const existing = state.annotations[args.id];
      if (!existing) {
        return state;
      }
      const next = {
        ...existing,
        ...args.patch,
        updatedAt: Date.now(),
      } as Annotation;
      return {
        ...state,
        annotations: { ...state.annotations, [args.id]: next },
        undoStack: _push(state.undoStack, state.annotations),
        redoStack: [],
      };
    },

    deleteAnnotation: (
      state: PlanAnnotationState,
      id: string,
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
        selectedId: state.selectedId === id ? null : state.selectedId,
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
      const next = state.redoStack[state.redoStack.length - 1]!;
      return {
        ...state,
        annotations: next,
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
      args: { planId: string; annotations: Annotation[] },
    ): PlanAnnotationState => {
      // Strip any annotations that don't belong to other plans we
      // still have loaded.
      const kept = Object.fromEntries(
        Object.entries(state.annotations).filter(([, a]) => {
          return a.planId !== args.planId;
        }),
      );
      const merged: Record<string, Annotation> = { ...kept };
      for (const a of args.annotations) {
        merged[a.id] = a;
      }
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
        selectedId: null,
      };
    },
  },
});
