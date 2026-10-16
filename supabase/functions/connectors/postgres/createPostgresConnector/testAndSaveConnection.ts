import { assertHostIsSafeToConnect } from "@sbfn/_shared/validateHostNotPrivate.ts";
import {
  ConnectorError,
  type ConnectorContext,
  type ConnectorRelation,
} from "@sbfn/connectors/Connector.ts";
import { classifyPostgresConnectionError } from "@sbfn/connectors/postgres/classifyPostgresConnectionError.ts";
import { listCatalogRelations } from "@sbfn/connectors/postgres/createPostgresConnector/postgresCatalog.ts";
import { fetchConnectionRow } from "@sbfn/connectors/postgres/createPostgresConnector/postgresConnectionRow.ts";
import { toPostgresConnectionConfig } from "@sbfn/connectors/postgres/PostgresConnectionConfig.ts";
import {
  postgresTestAndSaveInputSchema,
  type PostgresTestAndSaveInput,
} from "@sbfn/connectors/postgres/PostgresConnectorInput.ts";
import type { PostgresSql } from "@sbfn/connectors/postgres/PostgresSql.types.ts";

type ConnectFn = (
  config: ReturnType<typeof toPostgresConnectionConfig>,
) => PostgresSql;

/**
 * Opens a connection with the submitted credentials and, if it succeeds,
 * persists it: updates an existing saved connection when `connectionId` is
 * given, otherwise creates a new one. The connection succeeding and the
 * catalog read below are the "test" themselves - there is no separate test
 * step.
 */
export async function testAndSaveConnection(
  context: ConnectorContext,
  rawInput: Record<string, unknown>,
  connect: ConnectFn,
): Promise<{ connectionId: string; relations: ConnectorRelation[] }> {
  const input = postgresTestAndSaveInputSchema.parse(rawInput);

  let sql: PostgresSql | undefined;
  try {
    await assertHostIsSafeToConnect(input.host);

    sql = connect(
      toPostgresConnectionConfig({
        host: input.host,
        port: input.port,
        databaseName: input.databaseName,
        username: input.username,
        password: input.password,
        sslMode: input.sslMode,
      }),
    );

    const relations = await listCatalogRelations(sql);
    const nowIso = new Date().toISOString();
    const connectionId = input.connectionId
      ? await _rotateConnection(context, input.connectionId, input, nowIso)
      : await _createConnection(context, input, nowIso);

    return { connectionId, relations };
  } catch (error) {
    if (error instanceof ConnectorError) {
      throw error;
    }
    throw new ConnectorError(
      classifyPostgresConnectionError(error),
      error instanceof Error ? error.message : String(error),
    );
  } finally {
    await sql?.end({ timeout: 5 });
  }
}

/** Throws a classified `ConnectorError` for a Supabase client error, if any. */
function _throwIfSupabaseError(error: { message: string } | null): void {
  if (error) {
    throw new ConnectorError("unknown", error.message);
  }
}

/**
 * Updates an existing saved connection's credentials and metadata. Derives
 * the owning workspace from the existing row itself, never from the
 * client-submitted `workspaceId` alone - `fetchConnectionRow` already scopes
 * by `context.workspaceId`, so a `connectionId` belonging to a different
 * workspace simply will not be found, rather than silently updating someone
 * else's connection.
 */
async function _rotateConnection(
  context: ConnectorContext,
  connectionId: string,
  input: PostgresTestAndSaveInput,
  nowIso: string,
): Promise<string> {
  const existing = await fetchConnectionRow(context, connectionId);

  const { error: updateSecretError } = await context.supabaseAdminClient.rpc(
    "rpc_connections__update_vault_secret",
    {
      p_secret_id: existing.vault_secret_id,
      p_new_secret: input.password,
      p_workspace_id: context.workspaceId,
    },
  );
  _throwIfSupabaseError(updateSecretError);

  const { error: updateDbConnectionsError } = await context.supabaseAdminClient
    .from("connections")
    .update({ name: input.name })
    .eq("id", connectionId)
    .eq("workspace_id", context.workspaceId);
  _throwIfSupabaseError(updateDbConnectionsError);

  const { error: updatePostgresRowError } = await context.supabaseAdminClient
    .from("connections__postgres")
    .update({
      host: input.host,
      port: input.port,
      database_name: input.databaseName,
      username: input.username,
      ssl_mode: input.sslMode,
      last_verified_at: nowIso,
    })
    .eq("connection_id", connectionId)
    .eq("workspace_id", context.workspaceId);
  _throwIfSupabaseError(updatePostgresRowError);

  return connectionId;
}

/**
 * Deletes a Vault secret this request itself just created, after a later
 * step in the same creation failed. Best-effort: a failure here must never
 * mask the original error the caller is about to throw, but is worth
 * logging - it means a secret is now orphaned for real, not just at risk of
 * it.
 */
async function _rollbackOrphanedVaultSecret(
  context: ConnectorContext,
  secretId: string,
): Promise<void> {
  const { error } = await context.supabaseAdminClient.rpc(
    "rpc_connections__delete_vault_secret",
    { p_secret_id: secretId, p_workspace_id: context.workspaceId },
  );
  if (error) {
    console.error(
      `Failed to roll back orphaned Vault secret '${secretId}' after a failed connection creation`,
      error,
    );
  }
}

/** Creates the Vault secret that will hold a new connection's password. */
async function _createVaultSecretForConnection(
  context: ConnectorContext,
  input: PostgresTestAndSaveInput,
): Promise<string> {
  const { data: secretId, error } = await context.supabaseAdminClient.rpc(
    "rpc_connections__create_vault_secret",
    {
      p_secret: input.password,
      p_name: `connections__postgres:${crypto.randomUUID()}`,
      p_description: `Postgres connection password for '${input.name}'`,
    },
  );
  if (error || !secretId) {
    throw new ConnectorError(
      "unknown",
      error?.message ?? "Failed to create Vault secret",
    );
  }
  return secretId;
}

/**
 * Inserts the generic `connections` row for a new connection, rolling back
 * the just-created Vault secret if it fails - nothing yet points at that
 * secret, so it would otherwise be orphaned.
 */
async function _insertConnectionRow(
  context: ConnectorContext,
  input: PostgresTestAndSaveInput,
  secretId: string,
): Promise<string> {
  const { data: connectionRow, error } = await context.supabaseAdminClient
    .from("connections")
    .insert({
      workspace_id: context.workspaceId,
      connection_type: "postgres",
      name: input.name,
    })
    .select("id")
    .single();
  if (error || !connectionRow) {
    await _rollbackOrphanedVaultSecret(context, secretId);
    throw new ConnectorError(
      "unknown",
      error?.message ?? "Failed to create connection",
    );
  }
  return connectionRow.id;
}

/**
 * Inserts the Postgres-specific satellite row, rolling back both the Vault
 * secret and the just-inserted `connections` row if it fails - without this,
 * every failed creation would leave a connection that looks real (it has a
 * name and a type) but has no host, port, or credential behind it at all.
 */
async function _insertPostgresConnectionRow(
  context: ConnectorContext,
  input: PostgresTestAndSaveInput,
  nowIso: string,
  connectionId: string,
  secretId: string,
): Promise<void> {
  const { error } = await context.supabaseAdminClient
    .from("connections__postgres")
    .insert({
      connection_id: connectionId,
      workspace_id: context.workspaceId,
      host: input.host,
      port: input.port,
      database_name: input.databaseName,
      username: input.username,
      ssl_mode: input.sslMode,
      vault_secret_id: secretId,
      last_verified_at: nowIso,
    });
  if (!error) {
    return;
  }

  await _rollbackOrphanedVaultSecret(context, secretId);
  const { error: deleteConnectionError } = await context.supabaseAdminClient
    .from("connections")
    .delete()
    .eq("id", connectionId);
  if (deleteConnectionError) {
    console.error(
      `Failed to roll back orphaned connection '${connectionId}' after a failed connection creation`,
      deleteConnectionError,
    );
  }
  throw new ConnectorError("unknown", error.message);
}

/** Creates a new Vault secret and a new saved connection pointing at it. */
async function _createConnection(
  context: ConnectorContext,
  input: PostgresTestAndSaveInput,
  nowIso: string,
): Promise<string> {
  const secretId = await _createVaultSecretForConnection(context, input);
  const connectionId = await _insertConnectionRow(context, input, secretId);
  await _insertPostgresConnectionRow(
    context,
    input,
    nowIso,
    connectionId,
    secretId,
  );
  return connectionId;
}
