import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types.ts";
import type { DatabaseConnection } from "$/models/DatabaseConnection/DatabaseConnection.ts";
import type { SupabaseCrudModelSpec } from "$/models/SupabaseCrudModelSpec.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { Enums } from "$/types/database.types.ts";
import type { Model } from "@avandar/models";
import type { UUID } from "@avandar/utils";
import type { SetOptional } from "type-fest";

type ModelType = "PostgresTableDataset";
export type PostgresTableDatasetId = UUID<ModelType>;

/** Whether the picked relation is a table or a view. */
export type PostgresTableRelationKind =
  Enums<"datasets__postgres_table_relation_kind">;

export type PostgresTableDatasetRead = Model.Base<
  ModelType,
  {
    /** Timestamp of when the dataset was created. */
    createdAt: string;

    /** The saved connection this dataset reads through. */
    connectionId: DatabaseConnection.Id;

    /** Unique identifier of the dataset this metadata belongs to. */
    datasetId: DatasetId;

    /** Unique identifier of the Postgres table dataset in our system. */
    id: PostgresTableDatasetId;

    /** Whether `tableName` names a table or a view. */
    relationKind: PostgresTableRelationKind;

    /** The Postgres schema the table/view lives in. */
    schemaName: string;

    /** The Postgres table or view name. */
    tableName: string;

    /** Timestamp of when the Postgres table metadata was last updated. */
    updatedAt: string;

    /** Unique identifier of the workspace the dataset belongs to. */
    workspaceId: Workspace.Id;
  }
>;

/**
 * CRUD type definitions for the PostgresTableDataset model.
 */
export type PostgresTableDatasetModel = SupabaseCrudModelSpec<
  {
    tableName: "datasets__postgres_table";
    modelName: "PostgresTableDataset";
    modelPrimaryKeyType: PostgresTableDatasetId;
    modelTypes: {
      Read: PostgresTableDatasetRead;
      Insert: SetOptional<
        PostgresTableDatasetRead,
        "createdAt" | "id" | "updatedAt"
      >;
      Update: Partial<PostgresTableDatasetRead>;
    };
  },
  {
    dbTablePrimaryKey: "id";
  }
>;
