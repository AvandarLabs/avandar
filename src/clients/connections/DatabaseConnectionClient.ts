import { createServiceClient } from "@avandar/clients";
import { withLogger } from "@avandar/logger";
import { withQueryHooks } from "@avandar/query-hooks";
import { AvaSupabase } from "$/db/supabase/AvaSupabase";
import { DatabaseConnectionParsers } from "$/models/DatabaseConnection/DatabaseConnectionParsers";
import type { DatabaseConnection } from "$/models/DatabaseConnection/DatabaseConnection";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { ServiceClient } from "@avandar/clients";
import type { ILogger, WithLogger } from "@avandar/logger";
import type { WithQueryHooks } from "@avandar/query-hooks";

type DatabaseConnectionClientQueries = {
  /** Every saved connection in a workspace, for the connection picker. */
  getAll: (params: {
    workspaceId: Workspace.Id;
  }) => Promise<DatabaseConnection.T[]>;

  /** One saved connection by id, or `undefined` if it does not exist. */
  getById: (params: {
    id: DatabaseConnection.Id;
  }) => Promise<DatabaseConnection.T | undefined>;
};

type IDatabaseConnectionClient = ServiceClient<"DatabaseConnectionClient"> &
  DatabaseConnectionClientQueries;

/**
 * Read/list only, deliberately. `db_connections` and its satellite tables
 * grant `insert`/`update`/`delete` to `service_role` only (design spec
 * section 5.2/5.4) - only the `external-datasets` edge function may create
 * or change a saved connection, since only it can create the matching Vault
 * secret. Do not add a write method here, even for internal convenience.
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
    };

    return withQueryHooks(
      { ...baseClient, ...queries },
      { queryFns: ["getAll", "getById"], mutationFns: [] },
    );
  });
}

/** Client for saved external-datasource connections (read/list only). */
export const DatabaseConnectionClient = createDatabaseConnectionClient();
