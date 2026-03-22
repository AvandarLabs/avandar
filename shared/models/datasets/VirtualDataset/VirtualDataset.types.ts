import type { DatasetId } from "../Dataset/Dataset.types.ts";
import type { SupabaseCRUDModelSpec } from "@clients/SupabaseCRUDClient/SupabaseCRUDClient.types.ts";
import type { UUID } from "@utils/types/common.types.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { SetOptional } from "type-fest";

export type VirtualDatasetId = UUID<"VirtualDataset">;

export type VirtualDatasetRead = {
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
  rawSQL: string;
};

/**
 * CRUD type definitions for the VirtualDataset model.
 */
export type VirtualDatasetModel = SupabaseCRUDModelSpec<
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
