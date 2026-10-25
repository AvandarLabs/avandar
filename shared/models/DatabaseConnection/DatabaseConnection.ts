/* eslint-disable @typescript-eslint/no-namespace */
import type {
  DatabaseConnectionId,
  DatabaseConnectionModel,
  DatabaseConnectionType,
} from "$/models/DatabaseConnection/DatabaseConnection.types.ts";
import type {
  DatabaseConnectionSourceModel,
  DatabaseConnectionSourceRegistry,
} from "$/models/DatabaseConnection/DatabaseConnectionSource.types.ts";

export { DatabaseConnectionParsers } from "$/models/DatabaseConnection/DatabaseConnectionParsers.ts";

export namespace DatabaseConnection {
  export type T<K extends keyof DatabaseConnectionModel = "Read"> =
    DatabaseConnectionModel[K];
  export type Id = DatabaseConnectionId;
  export type ConnectionType = DatabaseConnectionType;
}

export namespace DatabaseConnectionSource {
  export type T<
    TConnectionType extends DatabaseConnectionType = DatabaseConnectionType,
    K extends "Read" | "Insert" | "Update" = "Read",
  > = DatabaseConnectionSourceModel<TConnectionType, K>;
  export type Registry = DatabaseConnectionSourceRegistry;
}
