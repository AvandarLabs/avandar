import type { Model } from "@models/Model/Model.ts";
import type { UUID } from "@utils/types/common.types.ts";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types.ts";
import type { SupabaseCrudModelSpec } from "$/models/SupabaseCrudModelSpec.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { ChatPlan } from "$/types/chat.types.ts";
import type { SetOptional } from "type-fest";

export type VirtualDatasetId = UUID<"VirtualDataset">;

export type VirtualDatasetRead = Model.Base<
  "VirtualDataset",
  {
    /** Unique identifier for this VirtualDataset */
    id: VirtualDatasetId;

    /** Unique identifier for the dataset this VirtualDataset belongs to. */
    datasetId: DatasetId;

    /** Unique identifier for the workspace this VirtualDataset belongs to. */
    workspaceId: Workspace.Id;

    /** Timestamp of when the VirtualDataset was created. */
    createdAt: string;

    /** Timestamp of when the VirtualDataset was last updated. */
    updatedAt: string;

    /** The raw SQL query that was used to generate the dataset. */
    rawSql: string;

    /**
     * When the dataset was produced by a multi-step LLM analytic plan
     * (Phase 3), the plan that produced it. Reopening the dataset
     * rehydrates this plan into the canvas. `null` for one-shot SQL.
     */
    planSteps: ChatPlan | null;
  }
>;

/**
 * CRUD type definitions for the VirtualDataset model.
 */
export type VirtualDatasetModel = SupabaseCrudModelSpec<
  {
    tableName: "datasets__virtual";
    modelName: "VirtualDataset";
    modelPrimaryKeyType: VirtualDatasetId;
    modelTypes: {
      Read: VirtualDatasetRead;
      Insert: SetOptional<VirtualDatasetRead, "id" | "createdAt" | "updatedAt">;

      Update: Partial<VirtualDatasetRead>;
    };
  },
  {
    dbTablePrimaryKey: "id";
  }
>;
