import { UUID } from "$/lib/types/common";
import { Enums } from "$/types/database.types";
import { SetOptional } from "type-fest";
import { SupabaseModelCRUDTypes } from "@/lib/models/SupabaseModelCRUDTypes";
import { Model } from "@/models/Model";
import { WorkspaceId } from "@/models/Workspace/Workspace.types";
import { UserId, UserProfileId } from "../../User/User.types";
import { DatasetColumn } from "../DatasetColumn";

type ModelType = "Dataset";
export type DatasetId = UUID<ModelType>;
export type DatasetSourceType = Enums<"datasets__source_type">;

type DatasetRead = Model<
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
    workspaceId: WorkspaceId;

    /** Timestamp of when the dataset metadata was last updated. */
    updatedAt: string;
  }
>;

/**
 * CRUD type definitions for the Dataset model.
 */
export type DatasetModel = SupabaseModelCRUDTypes<
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
