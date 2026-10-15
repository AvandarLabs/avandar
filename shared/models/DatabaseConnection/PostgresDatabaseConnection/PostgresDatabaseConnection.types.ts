import type { DatabaseConnectionId } from "$/models/DatabaseConnection/DatabaseConnection.types.ts";
import type { SupabaseCrudModelSpec } from "$/models/SupabaseCrudModelSpec.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { Enums } from "$/types/database.types.ts";
import type { Model } from "@avandar/models";
import type { UUID } from "@avandar/utils";
import type { SetOptional } from "type-fest";

type ModelType = "PostgresDatabaseConnection";

/** A Vault secret id (`vault.secrets.id`) - never the password itself. */
export type VaultSecretId = UUID<"VaultSecret">;

export type PostgresSslMode = Enums<"db_connections__postgres_ssl_mode">;

export type PostgresDatabaseConnectionRead = Model.Base<
  ModelType,
  {
    /**
     * One row per postgres connection, keyed to its generic `db_connections`
     * row - there is no separate id column for this satellite table.
     */
    connectionId: DatabaseConnectionId;

    /** Timestamp of when the connection was created. */
    createdAt: string;

    /** The Postgres database name on the server. */
    databaseName: string;

    /** The Postgres server hostname. */
    host: string;

    /**
     * Set on every successful test-and-save or table listing; drives
     * "last connected" UI copy. `undefined` until the first successful check.
     */
    lastVerifiedAt: string | undefined;

    /** The Postgres server port. */
    port: number;

    /** Which TLS mode to connect with. */
    sslMode: PostgresSslMode;

    /** Timestamp of when the connection details were last updated. */
    updatedAt: string;

    /** The Postgres role to authenticate as. */
    username: string;

    /**
     * Points at the Vault secret holding the password alone - never the
     * password itself. Only ever written by the `external-datasets` edge
     * function (section 5.2 of the design spec); nothing in this model layer
     * reads or writes the decrypted value.
     */
    vaultSecretId: VaultSecretId;

    /** Unique identifier of the workspace this connection belongs to. */
    workspaceId: Workspace.Id;
  }
>;

/**
 * CRUD type definitions for the PostgresDatabaseConnection model.
 */
export type PostgresDatabaseConnectionModel = SupabaseCrudModelSpec<
  {
    tableName: "db_connections__postgres";
    modelName: "PostgresDatabaseConnection";
    modelPrimaryKeyType: DatabaseConnectionId;
    modelTypes: {
      Read: PostgresDatabaseConnectionRead;
      Insert: SetOptional<
        PostgresDatabaseConnectionRead,
        "createdAt" | "lastVerifiedAt" | "updatedAt"
      >;
      Update: Partial<PostgresDatabaseConnectionRead>;
    };
  },
  {
    dbTablePrimaryKey: "connection_id";
  }
>;
