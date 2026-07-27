import type { DexieCrudModelSpec } from "@/clients/dexie/DexieCrudClient.types";
import type { UUID } from "@utils/types/common.types";

/** Branded identifier for a persisted plan annotation. */
export type PlanAnnotationId = UUID<"PlanAnnotation">;

/** Supported persisted plan annotation kinds. */
export type PlanAnnotationKind = "text" | "sticky" | "arrow" | "stroke";

/** Fields shared by every persisted plan annotation. */
export type PlanAnnotationBase = {
  id: PlanAnnotationId;
  planId: string;
  createdAt: number;
  updatedAt: number;
  text?: string;
  color?: string;
};

/** Persisted positioned text annotation. */
export type PlanTextAnnotation = PlanAnnotationBase & {
  kind: "text";
  x: number;
  y: number;
  fontSize: number;
  rotation?: number;
};

/** Persisted rectangular sticky-note annotation. */
export type PlanStickyAnnotation = PlanAnnotationBase & {
  kind: "sticky";
  x: number;
  y: number;
  width: number;
  height: number;
};

/** Persisted arrow annotation with two endpoints. */
export type PlanArrowAnnotation = PlanAnnotationBase & {
  kind: "arrow";
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
};

/** Persisted freehand stroke annotation. */
export type PlanStrokeAnnotation = PlanAnnotationBase & {
  kind: "stroke";
  points: Array<[number, number, number?]>;
  strokeWidth: number;
};

/** Complete persisted plan annotation discriminated union. */
export type PlanAnnotationRead =
  | PlanTextAnnotation
  | PlanStickyAnnotation
  | PlanArrowAnnotation
  | PlanStrokeAnnotation;

/** Dexie CRUD specification for browser-local plan annotations. */
export type PlanAnnotationModel = DexieCrudModelSpec<{
  modelName: "PlanAnnotation";
  primaryKey: "id";
  primaryKeyType: PlanAnnotationId;
  dbTypes: {
    DBRead: PlanAnnotationRead;
    DBUpdate: Partial<PlanAnnotationRead>;
  };
  modelTypes: {
    Read: PlanAnnotationRead;
    Update: Partial<PlanAnnotationRead>;
  };
}>;
