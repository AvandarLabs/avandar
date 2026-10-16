import type { SupabaseCrudModelSpec } from "$/models/SupabaseCrudModelSpec.ts";
import type { UserId } from "$/models/User/User.types.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { Enums } from "$/types/database.types.ts";
import type { Model } from "@avandar/models";
import type { UUID } from "@avandar/utils";
import type { SetOptional } from "type-fest";

type ModelType = "DatabaseConnection";
export type DatabaseConnectionId = UUID<ModelType>;

/**
 * Which connector type a saved connection is for. The actual connection
 * details live in the matching `db_connections__<type>` satellite table -
 * see `DatabaseConnectionSourceRegistry`.
 */
export type DatabaseConnectionType = Enums<"db_connections__connection_type">;

export type DatabaseConnectionRead = Model.Base<
  ModelType,
  {
    /** Which connector type this connection is for. */
    connectionType: DatabaseConnectionType;

    /** Timestamp of when the connection was created. */
    createdAt: string;

    /** User who created this connection. */
    createdBy: UserId | undefined;

    /** Unique identifier of the connection. */
    id: DatabaseConnectionId;

    /** User-chosen label, e.g. "Prod reporting replica". */
    name: string;

    /** Timestamp of when the connection was last updated. */
    updatedAt: string;

    /** Unique identifier of the workspace this connection belongs to. */
    workspaceId: Workspace.Id;
  }
>;

/**
 * CRUD type definitions for the DatabaseConnection model.
 */
export type DatabaseConnectionModel = SupabaseCrudModelSpec<
  {
    tableName: "db_connections";
    modelName: "DatabaseConnection";
    modelPrimaryKeyType: DatabaseConnectionId;
    modelTypes: {
      Read: DatabaseConnectionRead;
      Insert: SetOptional<
        DatabaseConnectionRead,
        "createdAt" | "createdBy" | "id" | "updatedAt"
      >;
      Update: Partial<DatabaseConnectionRead>;
    };
  },
  {
    dbTablePrimaryKey: "id";
  }
>;
