import { ConnectorError } from "@sbfn/connectors/Connector.ts";
import { toPostgresConnectionConfig } from "@sbfn/connectors/postgres/PostgresConnectionConfig.ts";
import type { PostgresDatabaseConnection } from "$/models/connections/PostgresDatabaseConnection/PostgresDatabaseConnection.ts";
import type { ConnectorContext } from "@sbfn/connectors/Connector.ts";
import type { PostgresSql } from "@sbfn/connectors/postgres/PostgresSql.types.ts";

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
 * does against `connections`/`connections__postgres` must scope by
 * `workspace_id` explicitly, never by `connection_id` alone, or a connection
 * id from a different workspace the caller also happens to have access to
 * could be read or mutated.
 */
export async function fetchConnectionRow(
  context: ConnectorContext,
  connectionId: string,
): Promise<DbConnectionsPostgresRow> {
  const { data, error } = await context.supabaseAdminClient
    .from("connections__postgres")
    .select(
      "connection_id, workspace_id, host, port, database_name, username, ssl_mode, vault_secret_id",
    )
    .eq("connection_id", connectionId)
    .eq("workspace_id", context.workspaceId)
    .maybeSingle();

  if (error) {
    throw new ConnectorError("unknown", error.message);
  }
  if (!data) {
    throw new ConnectorError(
      "unknown",
      `No Postgres connection '${connectionId}' in this workspace`,
    );
  }
  return data;
}

/**
 * Decrypts a saved connection's Vault-stored password.
 *
 * Passes `context.workspaceId` through to the RPC itself, not only using it
 * to scope the row lookup that found `vaultSecretId` in the first place -
 * the RPC re-checks that the id actually belongs to a connection in this
 * workspace before decrypting, so this call staying correctly scoped does
 * not depend solely on this function always being the only caller.
 */
export async function decryptConnectionSecret(
  context: ConnectorContext,
  vaultSecretId: string,
): Promise<string> {
  const { data, error } = await context.supabaseAdminClient.rpc(
    "rpc_connections__get_decrypted_secret",
    { p_vault_secret_id: vaultSecretId, p_workspace_id: context.workspaceId },
  );
  if (error || data === null) {
    throw new ConnectorError(
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
  context: ConnectorContext,
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
