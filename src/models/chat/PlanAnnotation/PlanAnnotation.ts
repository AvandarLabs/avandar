/* eslint-disable @typescript-eslint/no-namespace */
import type {
  PlanAnnotationBase,
  PlanAnnotationId,
  PlanAnnotationKind,
  PlanAnnotationModel,
  PlanArrowAnnotation,
  PlanStickyAnnotation,
  PlanStrokeAnnotation,
  PlanTextAnnotation,
} from "./PlanAnnotation.types";

/** Namespace entry point for the plan annotation AvaModel. */
export namespace PlanAnnotation {
  /** Dexie CRUD model specification for plan annotations. */
  export type Model = PlanAnnotationModel;

  /** A plan annotation model shape for the requested CRUD operation. */
  export type T<K extends keyof PlanAnnotationModel = "Read"> =
    PlanAnnotationModel[K];

  /** Branded identifier for a persisted plan annotation. */
  export type Id = PlanAnnotationId;

  /** Supported persisted plan annotation kinds. */
  export type Kind = PlanAnnotationKind;

  /** Fields shared by all persisted plan annotations. */
  export type Base = PlanAnnotationBase;

  /** Persisted positioned text annotation. */
  export type Text = PlanTextAnnotation;

  /** Persisted rectangular sticky-note annotation. */
  export type Sticky = PlanStickyAnnotation;

  /** Persisted arrow annotation with two endpoints. */
  export type Arrow = PlanArrowAnnotation;

  /** Persisted freehand stroke annotation. */
  export type Stroke = PlanStrokeAnnotation;
}
