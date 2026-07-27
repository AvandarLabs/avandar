/* eslint-disable @typescript-eslint/no-namespace */
import type {
  PlanStepBlobId,
  PlanStepBlobModel,
  PlanStepBlobSchemaField,
} from "./PlanStepBlob.types";

/** Namespace entry point for the plan step Blob AvaModel. */
export namespace PlanStepBlob {
  /** Dexie CRUD model specification for plan step Blobs. */
  export type Model = PlanStepBlobModel;

  /** A plan step Blob model shape for the requested CRUD operation. */
  export type T<K extends keyof PlanStepBlobModel = "Read"> =
    PlanStepBlobModel[K];

  /** Branded composite identifier for a persisted plan step Blob. */
  export type Id = PlanStepBlobId;

  /** A field in the schema stored with a plan step Blob. */
  export type SchemaField = PlanStepBlobSchemaField;
}
