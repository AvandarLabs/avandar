import type { SupabaseCRUDClientModelSpec } from "@clients/SupabaseCRUDClient/SupabaseCRUDClient.types.ts";
import type { Model } from "@models/Model/Model.ts";
import type { UUID } from "@utils/types/common.ts";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn.types.ts";
import type { UserId, UserProfileId } from "$/models/User/User.types.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { Enums } from "$/types/database.types.ts";
import type { SetOptional } from "type-fest";

type ModelType = "Dataset";
export type DatasetId = UUID<ModelType>;
export type DatasetSourceType = Enums<"datasets__source_type">;

type DatasetRead = Model.Base<
  ModelType,
  {
    /** Timestamp of when the dataset was created. */
    createdAt: string;

    /** Timestamp of when the dataset was last synced. */
    dateOfLastSync: string | undefined;

    /** Description of the dataset. */
    description: string | undefined;

    /** Unique identifier of the dataset. */
    id: DatasetId;

    /** Name of the dataset. */
    name: string;

    /** Type of the dataset. */
    sourceType: DatasetSourceType;

    /** Unique identifier of the owner of the dataset. */
    ownerId: UserId;

    /** Unique identifier of the owner profile of the dataset. */
    ownerProfileId: UserProfileId;

    /** Unique identifier of the workspace the dataset belongs to. */
    workspaceId: Workspace.Id;

    /** Timestamp of when the dataset metadata was last updated. */
    updatedAt: string;
  }
>;

/**
 * CRUD type definitions for the Dataset model.
 */
export type DatasetModel = SupabaseCRUDClientModelSpec<
  {
    tableName: "datasets";
    modelName: "Dataset";
    modelPrimaryKeyType: DatasetId;
    modelTypes: {
      Read: DatasetRead;
      Insert: SetOptional<
        DatasetRead,
        | "createdAt"
        | "dateOfLastSync"
        | "description"
        | "id"
        | "ownerId"
        | "updatedAt"
      >;
      Update: Partial<DatasetRead>;
    };
  },
  {
    dbTablePrimaryKey: "id";
  }
>;

export type Dataset<K extends keyof DatasetModel = "Read"> = DatasetModel[K];

export type DatasetWithColumns = Dataset & {
  columns: readonly DatasetColumn[];
};
