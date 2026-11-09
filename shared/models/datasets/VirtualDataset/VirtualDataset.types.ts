import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types.ts";
import type { SupabaseCrudModelSpec } from "$/models/SupabaseCrudModelSpec.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { Model } from "@avandar/models";
import type { UUID } from "@avandar/utils";
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
     * True for a places dataset, whose `rawSql` is a `VALUES` list the map's
     * "Add a place" tool rewrites. Read by the GIS app to decide which
     * datasets it may edit; every other reader treats it as a plain query.
     */
    isPlaces: boolean;
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
      Insert: SetOptional<
        VirtualDatasetRead,
        "id" | "createdAt" | "updatedAt" | "isPlaces"
      >;

      Update: Partial<VirtualDatasetRead>;
    };
  },
  {
    dbTablePrimaryKey: "id";
  }
>;
