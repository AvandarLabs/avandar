import { quoteQualifiedPostgresIdentifier } from "@sbfn/_shared/quotePostgresIdentifier.ts";
import { assertHostIsSafeToConnect } from "@sbfn/_shared/validateHostNotPrivate.ts";
import {
  ExternalDatasetError,
  type ExternalDatasetConnector,
  type ExternalDatasetConnectorContext,
  type ExternalDatasetRelation,
} from "@sbfn/external-datasets/connectors/ExternalDatasetConnector.ts";
import { classifyPostgresConnectionError } from "@sbfn/external-datasets/connectors/postgres/classifyPostgresConnectionError.ts";
import { connectToPostgres as defaultConnectToPostgres } from "@sbfn/external-datasets/connectors/postgres/connectToPostgres.ts";
import {
  toPostgresConnectionConfig,
  type DecryptedPostgresConnection,
} from "@sbfn/external-datasets/connectors/postgres/PostgresConnectionConfig.ts";
import { postgresTestAndSaveInputSchema } from "@sbfn/external-datasets/connectors/postgres/PostgresConnectorInput.ts";
import type { PostgresSql } from "@sbfn/external-datasets/connectors/postgres/PostgresSql.ts";

/** A configured ceiling, not "unbounded" - spec section 5.3. */
const POSTGRES_MAX_ROWS_PER_ACQUIRE = 200_000;
const POSTGRES_MAX_BYTES_PER_ACQUIRE = 100 * 1024 * 1024;
const MAX_PREVIEW_ROWS = 50;

type CreatePostgresConnectorOptions = {
  /** Injectable for tests - defaults to opening a real connection. */
  connectToPostgres?: (
    config: ReturnType<typeof toPostgresConnectionConfig>,
  ) => PostgresSql;
};

type DbConnectionsPostgresRow = {
  connection_id: string;
  workspace_id: string;
  host: string;
  port: number;
  database_name: string;
  username: string;
  ssl_mode: "disable" | "require";
  vault_secret_id: string;
};

function _toRelation(row: {
  table_schema: string;
  table_name: string;
  table_type: string;
}): ExternalDatasetRelation {
  const relationId = `${row.table_schema}.${row.table_name}`;
  return {
    relationId,
    label: relationId,
    kind: row.table_type === "VIEW" ? "view" : "table",
  };
}

/** A single CSV field, quoted only when it needs to be (a comma, quote, or newline is present). */
function _csvField(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  const text = typeof value === "string" ? value : JSON.stringify(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

/**
 * Builds CSV text from an explicit, ordered column-name list rather than
 * `Object.keys(rows[0])`, so the header is correct even when the relation
 * has zero rows (and so column order matches the table's own column order,
 * not whatever order the driver happens to return object keys in).
 */
function _rowsToCsv(
  columnNames: string[],
  rows: Array<Record<string, unknown>>,
): string {
  const header = columnNames.map(_csvField).join(",");
  const lines = rows.map((row) => {
    return columnNames
      .map((columnName) => {
        return _csvField(row[columnName]);
      })
      .join(",");
  });
  return [header, ...lines].join("\r\n");
}

function _parseRelationId(relationId: string): {
  schemaName: string;
  tableName: string;
} {
  const separatorIndex = relationId.indexOf(".");
  if (separatorIndex === -1) {
    throw new ExternalDatasetError(
      "unknown",
      `Malformed relationId '${relationId}' - expected 'schema.table'`,
    );
  }
  return {
    schemaName: relationId.slice(0, separatorIndex),
    tableName: relationId.slice(separatorIndex + 1),
  };
}

export function createPostgresConnector(
  options: CreatePostgresConnectorOptions = {},
): ExternalDatasetConnector {
  const connect = options.connectToPostgres ?? defaultConnectToPostgres;

  async function _fetchConnectionRow(
    context: ExternalDatasetConnectorContext,
    connectionId: string,
  ): Promise<DbConnectionsPostgresRow> {
    // `supabaseAdminClient` bypasses RLS entirely, so this filter is the
    // only thing enforcing tenant isolation here - every read/write this
    // connector does against `db_connections`/`db_connections__postgres`
    // must scope by `workspace_id` explicitly, never by `connection_id`
    // alone, or a connection id from a different workspace the caller also
    // happens to have access to could be read or mutated.
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

  async function _decryptSecret(
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

  /** Opens a live connection for an already-saved connection, re-checking SSRF every time (spec section 5.2 item 4 - never trust a stored host as still-safe). */
  async function _openSavedConnection(
    context: ExternalDatasetConnectorContext,
    connectionId: string,
  ): Promise<{ sql: PostgresSql; row: DbConnectionsPostgresRow }> {
    const row = await _fetchConnectionRow(context, connectionId);
    const password = await _decryptSecret(context, row.vault_secret_id);
    await assertHostIsSafeToConnect(row.host);

    const decrypted: DecryptedPostgresConnection = {
      host: row.host,
      port: row.port,
      databaseName: row.database_name,
      username: row.username,
      sslMode: row.ssl_mode,
      password,
    };
    const sql = connect(toPostgresConnectionConfig(decrypted));
    return { sql, row };
  }

  async function _listCatalogRelations(
    sql: PostgresSql,
  ): Promise<ExternalDatasetRelation[]> {
    const rows = await sql<{
      table_schema: string;
      table_name: string;
      table_type: string;
    }>`
      select table_schema, table_name, table_type
      from information_schema.tables
      where table_schema not in ('pg_catalog', 'information_schema')
      order by table_schema, table_name
    `;
    return rows.map(_toRelation);
  }

  /** Re-checks the schema/table pair against the live catalog (spec section 5.2 item 5) - never trust that a previously-picked relation still exists. */
  async function _assertRelationStillExists(
    sql: PostgresSql,
    schemaName: string,
    tableName: string,
  ): Promise<"table" | "view"> {
    const rows = await sql<{ table_type: string }>`
      select table_type
      from information_schema.tables
      where table_schema = ${schemaName} and table_name = ${tableName}
      limit 1
    `;
    const row = rows[0];
    if (!row) {
      throw new ExternalDatasetError(
        "unknown",
        `'${schemaName}.${tableName}' was not found - it may have been dropped or renamed`,
      );
    }
    return row.table_type === "VIEW" ? "view" : "table";
  }

  return {
    testAndSaveConnection: async (context, rawInput) => {
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
            sslMode: input.sslMode as "disable" | "require",
          }),
        );

        // The connection succeeding, and this catalog read, together are
        // the "test" - there is no separate test step (spec section 5.4).
        const relations = await _listCatalogRelations(sql);

        const nowIso = new Date().toISOString();
        let connectionId: string;

        if (input.connectionId) {
          // Rotate: derive the owning workspace from the existing row
          // itself, never from the client-submitted `workspaceId` alone -
          // `_fetchConnectionRow` already scopes by `context.workspaceId`,
          // so a `connectionId` belonging to a different workspace simply
          // will not be found, rather than silently updating someone
          // else's connection.
          const existing = await _fetchConnectionRow(
            context,
            input.connectionId,
          );
          connectionId = existing.connection_id;

          const { error: updateSecretError } =
            await context.supabaseAdminClient.rpc(
              "rpc_db_connections__update_vault_secret",
              {
                p_secret_id: existing.vault_secret_id,
                p_new_secret: input.password,
              },
            );
          if (updateSecretError) {
            throw new ExternalDatasetError("unknown", updateSecretError.message);
          }

          const { error: updateDbConnectionsError } =
            await context.supabaseAdminClient
              .from("db_connections")
              .update({ name: input.name })
              .eq("id", connectionId)
              .eq("workspace_id", context.workspaceId);
          if (updateDbConnectionsError) {
            throw new ExternalDatasetError(
              "unknown",
              updateDbConnectionsError.message,
            );
          }

          const { error: updatePostgresRowError } =
            await context.supabaseAdminClient
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
            throw new ExternalDatasetError(
              "unknown",
              updatePostgresRowError.message,
            );
          }
        } else {
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
          connectionId = connectionRow.id;

          const { error: insertPostgresRowError } =
            await context.supabaseAdminClient
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
            throw new ExternalDatasetError(
              "unknown",
              insertPostgresRowError.message,
            );
          }
        }

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
    },

    listRelations: async (context, connectionId) => {
      const { sql } = await _openSavedConnection(context, connectionId);
      try {
        const relations = await _listCatalogRelations(sql);
        await context.supabaseAdminClient
          .from("db_connections__postgres")
          .update({ last_verified_at: new Date().toISOString() })
          .eq("connection_id", connectionId)
          .eq("workspace_id", context.workspaceId);
        return relations;
      } catch (error) {
        throw new ExternalDatasetError(
          classifyPostgresConnectionError(error),
          error instanceof Error ? error.message : String(error),
        );
      } finally {
        await sql.end({ timeout: 5 });
      }
    },

    previewRelation: async (context, connectionId, relationId) => {
      const { schemaName, tableName } = _parseRelationId(relationId);
      const { sql } = await _openSavedConnection(context, connectionId);
      try {
        await _assertRelationStillExists(sql, schemaName, tableName);

        // `quoteQualifiedPostgresIdentifier` already throws on a NUL byte or
        // empty segment (spec section 5.2 item 5) - its return value is a
        // fully quoted, injection-safe identifier, safe to splice into the
        // query text below because every character that could otherwise
        // break out of it (an embedded `"`) is already doubled.
        const quotedRelation = quoteQualifiedPostgresIdentifier(
          schemaName,
          tableName,
        );

        const columns = await sql<{
          column_name: string;
          data_type: string;
        }>`
          select column_name, data_type
          from information_schema.columns
          where table_schema = ${schemaName} and table_name = ${tableName}
          order by ordinal_position
        `;

        const previewRows = await sql.unsafe<Record<string, unknown>>(
          `select * from ${quotedRelation} limit $1`,
          [MAX_PREVIEW_ROWS],
        );

        return {
          columns: columns.map((column) => {
            return {
              columnName: column.column_name,
              sourceType: column.data_type,
            };
          }),
          previewRows,
        };
      } catch (error) {
        if (error instanceof ExternalDatasetError) {
          throw error;
        }
        throw new ExternalDatasetError(
          classifyPostgresConnectionError(error),
          error instanceof Error ? error.message : String(error),
        );
      } finally {
        await sql.end({ timeout: 5 });
      }
    },

    getRelationRows: async (context, connectionId, relationId) => {
      const { schemaName, tableName } = _parseRelationId(relationId);
      const { sql } = await _openSavedConnection(context, connectionId);
      try {
        await _assertRelationStillExists(sql, schemaName, tableName);
        const quotedRelation = quoteQualifiedPostgresIdentifier(
          schemaName,
          tableName,
        );

        const [countRow] = await sql.unsafe<{ exact_count: number }>(
          `select count(*)::int as exact_count from ${quotedRelation}`,
        );
        const rowCount = countRow?.exact_count ?? 0;
        if (rowCount > POSTGRES_MAX_ROWS_PER_ACQUIRE) {
          throw new ExternalDatasetError(
            "too_large",
            `'${schemaName}.${tableName}' has ${rowCount} rows, over the ${POSTGRES_MAX_ROWS_PER_ACQUIRE}-row limit for a single acquisition`,
          );
        }

        const columns = await sql<{ column_name: string }>`
          select column_name
          from information_schema.columns
          where table_schema = ${schemaName} and table_name = ${tableName}
          order by ordinal_position
        `;
        const rows = await sql.unsafe<Record<string, unknown>>(
          `select * from ${quotedRelation}`,
        );
        const csv = _rowsToCsv(
          columns.map((column) => {
            return column.column_name;
          }),
          rows,
        );

        const byteLength = new TextEncoder().encode(csv).length;
        if (byteLength > POSTGRES_MAX_BYTES_PER_ACQUIRE) {
          throw new ExternalDatasetError(
            "too_large",
            `'${schemaName}.${tableName}' is ${byteLength} bytes as CSV, over the ${POSTGRES_MAX_BYTES_PER_ACQUIRE}-byte limit for a single acquisition`,
          );
        }

        return csv;
      } catch (error) {
        if (error instanceof ExternalDatasetError) {
          throw error;
        }
        throw new ExternalDatasetError(
          classifyPostgresConnectionError(error),
          error instanceof Error ? error.message : String(error),
        );
      } finally {
        await sql.end({ timeout: 5 });
      }
    },
  };
}
