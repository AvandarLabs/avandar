import type { DataCatalogListingId } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing.types.ts";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types.ts";
import type { SupabaseCrudModelSpec } from "$/models/SupabaseCrudModelSpec.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { Model } from "@avandar/models";
import type { UUID } from "@avandar/utils";
import type { SetOptional } from "type-fest";

export type OpenDataDatasetId = UUID<"OpenDataDataset">;

export type OpenDataDatasetRead = Model.Base<
  "OpenDataDataset",
  {
    /** Unique identifier for this OpenDataDataset row. */
    id: OpenDataDatasetId;

    /** Dataset this open-data link belongs to. */
    datasetId: DatasetId;

    /** Workspace that owns this dataset. */
    workspaceId: Workspace.Id;

    /** Public catalog listing for this open dataset. */
    catalogListingId: DataCatalogListingId;

    createdAt: string;

    updatedAt: string;
  }
>;

/**
 * CRUD type definitions for the OpenDataDataset model.
 */
export type OpenDataDatasetModel = SupabaseCrudModelSpec<
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
