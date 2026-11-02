import type { DatasetColumnRead } from "$/models/datasets/DatasetColumn/DatasetColumn.types.ts";
import type { DatasetSource } from "$/models/datasets/DatasetSource/DatasetSource.ts";
import type { SupabaseCrudModelSpec } from "$/models/SupabaseCrudModelSpec.ts";
import type { UserId } from "$/models/User/User.types.ts";
import type { UserProfileId } from "$/models/User/UserProfile.types.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { Model } from "@avandar/models";
import type { UUID } from "@avandar/utils";
import type { SetOptional } from "type-fest";

type ModelType = "Dataset";
export type DatasetId = UUID<ModelType>;

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

    /** Restricted unless caller has explicit grants (RBAC). */
    isRestricted: boolean;

    /** Name of the dataset. */
    name: string;

    /** Type of the dataset. */
    sourceType: DatasetSource.SourceType;

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
export type DatasetModel = SupabaseCrudModelSpec<
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
        | "isRestricted"
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

export type DatasetWithColumns = DatasetModel["Read"] & {
  columns: readonly DatasetColumnRead[];
};
