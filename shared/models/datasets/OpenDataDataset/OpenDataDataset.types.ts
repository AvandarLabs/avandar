import type { UUID } from "@utils/types/common.types.ts";
import type { OpenDataCatalogEntryId } from "$/models/catalog-entries/OpenDataCatalogEntry/OpenDataCatalogEntry.types.ts";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types.ts";
import type { SupabaseCRUDModelSpec } from "$/models/SupabaseCRUDModelSpec.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { SetOptional } from "type-fest";

export type OpenDataDatasetId = UUID<"OpenDataDataset">;

export type OpenDataDatasetRead = {
  /** Unique identifier for this OpenDataDataset row. */
  id: OpenDataDatasetId;

  /** Dataset this open-data link belongs to. */
  datasetId: DatasetId;

  /** Workspace that owns this dataset. */
  workspaceId: Workspace.Id;

  /** Public catalog entry for this open dataset. */
  catalogEntryId: OpenDataCatalogEntryId;

  createdAt: string;

  updatedAt: string;
};

/**
 * CRUD type definitions for the OpenDataDataset model.
 */
export type OpenDataDatasetModel = SupabaseCRUDModelSpec<
  {
    tableName: "datasets__open_data";
    modelName: "OpenDataDataset";
    modelPrimaryKeyType: OpenDataDatasetId;
    modelTypes: {
      Read: OpenDataDatasetRead;
      Insert: SetOptional<
        OpenDataDatasetRead,
        "id" | "createdAt" | "updatedAt"
      >;
      Update: Partial<OpenDataDatasetRead>;
    };
  },
  {
    dbTablePrimaryKey: "id";
  }
>;
