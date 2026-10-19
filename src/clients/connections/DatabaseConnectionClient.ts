import { createServiceClient } from "@avandar/clients";
import { withLogger } from "@avandar/logger";
import { withQueryHooks } from "@avandar/query-hooks";
import { AvaSupabase } from "$/db/supabase/AvaSupabase";
import { DatabaseConnectionParsers } from "$/models/DatabaseConnection/DatabaseConnectionParsers";
import { PostgresDatabaseConnectionParsers } from "$/models/DatabaseConnection/PostgresDatabaseConnection/PostgresDatabaseConnectionParsers";
import type { DatabaseConnection } from "$/models/DatabaseConnection/DatabaseConnection";
import type { PostgresDatabaseConnection } from "$/models/DatabaseConnection/PostgresDatabaseConnection/PostgresDatabaseConnection";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { ServiceClient } from "@avandar/clients";
import type { ILogger, WithLogger } from "@avandar/logger";
import type { WithQueryHooks } from "@avandar/query-hooks";

/**
 * A saved connection joined with its Postgres-specific details, for a
 * connector-specific picker.
 */
export type PostgresDatabaseConnectionWithDetails = {
  connection: DatabaseConnection.T;
  postgres: PostgresDatabaseConnection.T;
};

type DatabaseConnectionClientQueries = {
  /** Every saved connection in a workspace, for the connection picker. */
  getAll: (params: {
    workspaceId: Workspace.Id;
  }) => Promise<DatabaseConnection.T[]>;

  /** One saved connection by id, or `undefined` if it does not exist. */
  getById: (params: {
    id: DatabaseConnection.Id;
  }) => Promise<DatabaseConnection.T | undefined>;

  /**
   * Every saved Postgres connection in a workspace, joined with its
   * `db_connections__postgres` row, for the Postgres connector's own picker
   * (`"<name> - <host>:<port>/<database>"`, section 7 item 2). Connector-
   * specific rather than a generic join, since a future connector type's
   * picker will need its own satellite's fields, not these.
   */
  getAllPostgres: (params: {
    workspaceId: Workspace.Id;
  }) => Promise<PostgresDatabaseConnectionWithDetails[]>;
};

type IDatabaseConnectionClient = ServiceClient<"DatabaseConnectionClient"> &
  DatabaseConnectionClientQueries;

/**
 * Read/list only, deliberately. `db_connections` and its satellite tables
 * grant `insert`/`update`/`delete` to `service_role` only - only the
 * `connectors` edge function may create or change a saved connection,
 * since only it can create the matching Vault secret. Do not add a write
 * method here, even for internal convenience.
 */
function createDatabaseConnectionClient(): WithLogger<
  WithQueryHooks<
    IDatabaseConnectionClient,
    keyof DatabaseConnectionClientQueries,
    never
  >
> {
  const dbClient = AvaSupabase.db();
  const baseClient = createServiceClient("DatabaseConnectionClient");

  return withLogger(baseClient, (baseLogger: ILogger) => {
    const queries: DatabaseConnectionClientQueries = {
      getAll: async ({ workspaceId }) => {
        const logger = baseLogger.appendName("getAll");
        logger.log("Getting saved connections", { workspaceId });
        const { data } = await dbClient
          .from("db_connections")
          .select("*")
          .eq("workspace_id", workspaceId)
          .throwOnError();
        return data.map(DatabaseConnectionParsers.fromDBReadToModelRead);
      },

      getById: async ({ id }) => {
        const logger = baseLogger.appendName("getById");
        logger.log("Getting saved connection", { id });
        const { data } = await dbClient
          .from("db_connections")
          .select("*")
          .eq("id", id)
          .maybeSingle()
          .throwOnError();
        return data
          ? DatabaseConnectionParsers.fromDBReadToModelRead(data)
          : undefined;
      },

      getAllPostgres: async ({ workspaceId }) => {
        const logger = baseLogger.appendName("getAllPostgres");
        logger.log("Getting saved Postgres connections", { workspaceId });
        const { data } = await dbClient
          .from("db_connections")
          .select("*, postgres:db_connections__postgres(*)")
          .eq("workspace_id", workspaceId)
          .eq("connection_type", "postgres")
          .throwOnError();
        return data.flatMap(({ postgres, ...connectionRow }) => {
          if (postgres === null) {
            return [];
          }
          return [
            {
              connection:
                DatabaseConnectionParsers.fromDBReadToModelRead(connectionRow),
              postgres:
                PostgresDatabaseConnectionParsers.fromDBReadToModelRead(
                  postgres,
                ),
            },
          ];
        });
      },
    };

    return withQueryHooks(
      { ...baseClient, ...queries },
      { queryFns: ["getAll", "getById", "getAllPostgres"], mutationFns: [] },
    );
  });
}

/** Client for saved external-datasource connections (read/list only). */
export const DatabaseConnectionClient = createDatabaseConnectionClient();
