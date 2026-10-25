import { assertHostIsSafeToConnect } from "@sbfn/_shared/validateHostNotPrivate.ts";
import {
  ExternalDatasetError,
  type ExternalDatasetConnectorContext,
  type ExternalDatasetRelation,
} from "@sbfn/connectors/connectors/ExternalDatasetConnector.ts";
import { classifyPostgresConnectionError } from "@sbfn/connectors/connectors/postgres/classifyPostgresConnectionError.ts";
import { listCatalogRelations } from "@sbfn/connectors/connectors/postgres/createPostgresConnector/postgresCatalog.ts";
import { fetchConnectionRow } from "@sbfn/connectors/connectors/postgres/createPostgresConnector/postgresConnectionRow.ts";
import { toPostgresConnectionConfig } from "@sbfn/connectors/connectors/postgres/PostgresConnectionConfig.ts";
import {
  postgresTestAndSaveInputSchema,
  type PostgresTestAndSaveInput,
} from "@sbfn/connectors/connectors/postgres/PostgresConnectorInput.ts";
import type { PostgresSql } from "@sbfn/connectors/connectors/postgres/PostgresSql.types.ts";

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
  context: ExternalDatasetConnectorContext,
  rawInput: Record<string, unknown>,
  connect: ConnectFn,
): Promise<{ connectionId: string; relations: ExternalDatasetRelation[] }> {
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
    if (error instanceof ExternalDatasetError) {
      throw error;
    }
    throw new ExternalDatasetError(
      classifyPostgresConnectionError(error),
      error instanceof Error ? error.message : String(error),
    );
  } finally {
    await sql?.end({ timeout: 5 });
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
  context: ExternalDatasetConnectorContext,
  connectionId: string,
  input: PostgresTestAndSaveInput,
  nowIso: string,
): Promise<string> {
  const existing = await fetchConnectionRow(context, connectionId);

  const { error: updateSecretError } = await context.supabaseAdminClient.rpc(
    "rpc_db_connections__update_vault_secret",
    {
      p_secret_id: existing.vault_secret_id,
      p_new_secret: input.password,
    },
  );
  if (updateSecretError) {
    throw new ExternalDatasetError("unknown", updateSecretError.message);
  }

  const { error: updateDbConnectionsError } = await context.supabaseAdminClient
    .from("db_connections")
    .update({ name: input.name })
    .eq("id", connectionId)
    .eq("workspace_id", context.workspaceId);
  if (updateDbConnectionsError) {
    throw new ExternalDatasetError("unknown", updateDbConnectionsError.message);
  }

  const { error: updatePostgresRowError } = await context.supabaseAdminClient
    .from("db_connections__postgres")
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
  if (updatePostgresRowError) {
    throw new ExternalDatasetError("unknown", updatePostgresRowError.message);
  }

  return connectionId;
}

/** Creates a new Vault secret and a new saved connection pointing at it. */
async function _createConnection(
  context: ExternalDatasetConnectorContext,
  input: PostgresTestAndSaveInput,
  nowIso: string,
): Promise<string> {
  const { data: secretId, error: createSecretError } =
    await context.supabaseAdminClient.rpc(
      "rpc_db_connections__create_vault_secret",
      {
        p_secret: input.password,
        p_name: `db_connections__postgres:${crypto.randomUUID()}`,
        p_description: `Postgres connection password for '${input.name}'`,
      },
    );
  if (createSecretError || !secretId) {
    throw new ExternalDatasetError(
      "unknown",
      createSecretError?.message ?? "Failed to create Vault secret",
    );
  }

  const { data: connectionRow, error: insertConnectionError } =
    await context.supabaseAdminClient
      .from("db_connections")
      .insert({
        workspace_id: context.workspaceId,
        connection_type: "postgres",
        name: input.name,
      })
      .select("id")
      .single();
  if (insertConnectionError || !connectionRow) {
    throw new ExternalDatasetError(
      "unknown",
      insertConnectionError?.message ?? "Failed to create connection",
    );
  }
  const connectionId = connectionRow.id;

  const { error: insertPostgresRowError } = await context.supabaseAdminClient
    .from("db_connections__postgres")
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
  if (insertPostgresRowError) {
    throw new ExternalDatasetError("unknown", insertPostgresRowError.message);
  }

  return connectionId;
}
