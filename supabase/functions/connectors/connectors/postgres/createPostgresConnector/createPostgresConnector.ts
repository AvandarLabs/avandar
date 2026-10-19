import { prop } from "@avandar/utils";
import { quoteQualifiedPostgresIdentifier } from "@sbfn/_shared/quotePostgresIdentifier.ts";
import { assertHostIsSafeToConnect } from "@sbfn/_shared/validateHostNotPrivate.ts";
import {
  ExternalDatasetError,
  type ExternalDatasetConnector,
} from "@sbfn/connectors/connectors/ExternalDatasetConnector.ts";
import { classifyPostgresConnectionError } from "@sbfn/connectors/connectors/postgres/classifyPostgresConnectionError.ts";
import { connectToPostgres as defaultConnectToPostgres } from "@sbfn/connectors/connectors/postgres/connectToPostgres.ts";
import {
  assertRelationStillExists,
  listCatalogRelations,
  parseRelationId,
} from "@sbfn/connectors/connectors/postgres/createPostgresConnector/postgresCatalog.ts";
import { openSavedConnection } from "@sbfn/connectors/connectors/postgres/createPostgresConnector/postgresConnectionRow.ts";
import { rowsToCsv } from "@sbfn/connectors/connectors/postgres/createPostgresConnector/postgresCsv.ts";
import { testAndSaveConnection } from "@sbfn/connectors/connectors/postgres/createPostgresConnector/testAndSaveConnection.ts";
import { toPostgresConnectionConfig } from "@sbfn/connectors/connectors/postgres/PostgresConnectionConfig.ts";
import type { PostgresSql } from "@sbfn/connectors/connectors/postgres/PostgresSql.types.ts";

/**
 * A configured ceiling, not "unbounded": this connector acquires a relation
 * as a single whole-table CSV rather than paging, so a cap here is what keeps
 * one oversized table from blocking the request indefinitely.
 */
const POSTGRES_MAX_ROWS_PER_ACQUIRE = 200_000;
const POSTGRES_MAX_BYTES_PER_ACQUIRE = 100 * 1024 * 1024;
const MAX_PREVIEW_ROWS = 50;

type CreatePostgresConnectorOptions = {
  /** Injectable for tests - defaults to opening a real connection. */
  connectToPostgres?: (
    config: ReturnType<typeof toPostgresConnectionConfig>,
  ) => PostgresSql;
};

/**
 * Builds the `postgres` {@link ExternalDatasetConnector}: test-and-save a
 * connection, list a connection's tables/views, preview one, and read its
 * full rows as CSV. Every method re-validates the target host against
 * {@link assertHostIsSafeToConnect} before opening a connection (never trusts
 * a previously-saved host as still safe, closing the DNS-rebinding gap), and
 * every read/write against `db_connections`/`db_connections__postgres` scopes
 * explicitly by `workspaceId` so one workspace's connection can never be
 * read, previewed, or mutated through another workspace's session. The
 * credential itself is never held here - it round-trips through Supabase
 * Vault via `rpc_db_connections__{create,update,get_decrypted}_secret`.
 */
export function createPostgresConnector(
  options: CreatePostgresConnectorOptions = {},
): ExternalDatasetConnector {
  const connect = options.connectToPostgres ?? defaultConnectToPostgres;

  return {
    testAndSaveConnection: (context, rawInput) => {
      return testAndSaveConnection(context, rawInput, connect);
    },

    listRelations: async (context, connectionId) => {
      const { sql } = await openSavedConnection(
        context,
        connectionId,
        connect,
        assertHostIsSafeToConnect,
      );
      try {
        const relations = await listCatalogRelations(sql);
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
      const { schemaName, tableName } = parseRelationId(relationId);
      const { sql } = await openSavedConnection(
        context,
        connectionId,
        connect,
        assertHostIsSafeToConnect,
      );
      try {
        await assertRelationStillExists(sql, schemaName, tableName);

        // `quoteQualifiedPostgresIdentifier` already throws on a NUL byte or
        // empty segment - its return value is a fully quoted,
        // injection-safe identifier, safe to splice into the query text
        // below because every character that could otherwise break out of
        // it (an embedded `"`) is already doubled.
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
      const { schemaName, tableName } = parseRelationId(relationId);
      const { sql } = await openSavedConnection(
        context,
        connectionId,
        connect,
        assertHostIsSafeToConnect,
      );
      try {
        await assertRelationStillExists(sql, schemaName, tableName);
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
        const csv = rowsToCsv(columns.map(prop("column_name")), rows);

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
