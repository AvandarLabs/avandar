import { ExternalDatasetError } from "@sbfn/connectors/connectors/ExternalDatasetConnector.ts";
import { toPostgresConnectionConfig } from "@sbfn/connectors/connectors/postgres/PostgresConnectionConfig.ts";
import type { PostgresDatabaseConnection } from "$/models/DatabaseConnection/PostgresDatabaseConnection/PostgresDatabaseConnection.ts";
import type { ExternalDatasetConnectorContext } from "@sbfn/connectors/connectors/ExternalDatasetConnector.ts";
import type { PostgresSql } from "@sbfn/connectors/connectors/postgres/PostgresSql.types.ts";

export type DbConnectionsPostgresRow = {
  connection_id: string;
  workspace_id: string;
  host: string;
  port: number;
  database_name: string;
  username: string;
  ssl_mode: PostgresDatabaseConnection.SslMode;
  vault_secret_id: string;
};

/**
 * Reads a saved connection's row, scoped to the caller's own workspace.
 *
 * `supabaseAdminClient` bypasses RLS entirely, so this filter is the only
 * thing enforcing tenant isolation here - every read/write this connector
 * does against `db_connections`/`db_connections__postgres` must scope by
 * `workspace_id` explicitly, never by `connection_id` alone, or a connection
 * id from a different workspace the caller also happens to have access to
 * could be read or mutated.
 */
export async function fetchConnectionRow(
  context: ExternalDatasetConnectorContext,
  connectionId: string,
): Promise<DbConnectionsPostgresRow> {
  const { data, error } = await context.supabaseAdminClient
    .from("db_connections__postgres")
    .select(
      "connection_id, workspace_id, host, port, database_name, username, ssl_mode, vault_secret_id",
    )
    .eq("connection_id", connectionId)
    .eq("workspace_id", context.workspaceId)
    .maybeSingle();

  if (error) {
    throw new ExternalDatasetError("unknown", error.message);
  }
  if (!data) {
    throw new ExternalDatasetError(
      "unknown",
      `No Postgres connection '${connectionId}' in this workspace`,
    );
  }
  return data;
}

/** Decrypts a saved connection's Vault-stored password. */
export async function decryptConnectionSecret(
  context: ExternalDatasetConnectorContext,
  vaultSecretId: string,
): Promise<string> {
  const { data, error } = await context.supabaseAdminClient.rpc(
    "rpc_db_connections__get_decrypted_secret",
    { p_vault_secret_id: vaultSecretId },
  );
  if (error || data === null) {
    throw new ExternalDatasetError(
      "unknown",
      `Failed to decrypt connection secret: ${error?.message ?? "not found"}`,
    );
  }
  return data;
}

/**
 * Opens a live connection for an already-saved connection, re-checking SSRF
 * every time - a stored host is never trusted as still-safe, since DNS can
 * change between when it was saved and when it is used again.
 */
export async function openSavedConnection(
  context: ExternalDatasetConnectorContext,
  connectionId: string,
  connect: (
    config: ReturnType<typeof toPostgresConnectionConfig>,
  ) => PostgresSql,
  assertHostIsSafeToConnect: (host: string) => Promise<void>,
): Promise<{ sql: PostgresSql; row: DbConnectionsPostgresRow }> {
  const row = await fetchConnectionRow(context, connectionId);
  const password = await decryptConnectionSecret(context, row.vault_secret_id);
  await assertHostIsSafeToConnect(row.host);

  const sql = connect(
    toPostgresConnectionConfig({
      host: row.host,
      port: row.port,
      databaseName: row.database_name,
      username: row.username,
      sslMode: row.ssl_mode,
      password,
    }),
  );
  return { sql, row };
}
