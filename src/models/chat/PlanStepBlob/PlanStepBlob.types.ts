import type { DexieCrudModelSpec } from "@/clients/dexie/DexieCrudClient.types";
import type { Brand } from "@utils/types/common.types";

/** Branded composite identifier for a persisted plan step Blob. */
export type PlanStepBlobId = Brand<string, "PlanStepBlob">;

/** A field in the schema stored with a plan step Blob. */
export type PlanStepBlobSchemaField = {
  name: string;
  type: string;
};

/** Complete browser-local plan step Blob row. */
export type PlanStepBlobRead = {
  id: PlanStepBlobId;
  planId: string;
  stepId: string;
  parquet: Blob;
  schema: PlanStepBlobSchemaField[];
  rowCount: number;
  savedAt: number;
};

/** Dexie CRUD specification for browser-local plan step Blobs. */
export type PlanStepBlobModel = DexieCrudModelSpec<{
  modelName: "PlanStepBlob";
  primaryKey: "id";
  primaryKeyType: PlanStepBlobId;
  dbTypes: {
    DBRead: PlanStepBlobRead;
    DBUpdate: Partial<PlanStepBlobRead>;
  };
  modelTypes: {
    Read: PlanStepBlobRead;
    Update: Partial<PlanStepBlobRead>;
  };
}>;
