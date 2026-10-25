import type { DatabaseConnectionType } from "$/models/connections/DatabaseConnection/DatabaseConnection.types.ts";
import type { PostgresDatabaseConnectionModel } from "$/models/connections/PostgresDatabaseConnection/PostgresDatabaseConnection.types.ts";

/**
 * One satellite-table model per `DatabaseConnectionType`, mirroring
 * `DatasetSourceRegistry` one layer up. A second connector type (MySQL,
 * MSSQL, ...) only ever adds a new key here plus a new
 * `connections__connection_type` enum value, never a new "connections"
 * concept.
 */
export type DatabaseConnectionSourceRegistry<
  K extends "Read" | "Insert" | "Update" = "Read",
> = {
  postgres: PostgresDatabaseConnectionModel[K];
};

export type DatabaseConnectionSourceModel<
  TConnectionType extends DatabaseConnectionType = DatabaseConnectionType,
  K extends "Read" | "Insert" | "Update" = "Read",
> = DatabaseConnectionSourceRegistry<K>[TConnectionType];
