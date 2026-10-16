import { prop } from "@avandar/utils";
import { quoteQualifiedPostgresIdentifier } from "@sbfn/_shared/quotePostgresIdentifier.ts";
import { assertHostIsSafeToConnect } from "@sbfn/_shared/validateHostNotPrivate.ts";
import { ConnectorError, type Connector } from "@sbfn/connectors/Connector.ts";
import { classifyPostgresConnectionError } from "@sbfn/connectors/postgres/classifyPostgresConnectionError.ts";
import { connectToPostgres as defaultConnectToPostgres } from "@sbfn/connectors/postgres/connectToPostgres.ts";
import {
  assertRelationStillExists,
  listCatalogRelations,
  parseRelationId,
} from "@sbfn/connectors/postgres/createPostgresConnector/postgresCatalog.ts";
import { openSavedConnection } from "@sbfn/connectors/postgres/createPostgresConnector/postgresConnectionRow.ts";
import { rowsToCsv } from "@sbfn/connectors/postgres/createPostgresConnector/postgresCsv.ts";
import { estimateRelationCsvBytes } from "@sbfn/connectors/postgres/createPostgresConnector/estimateRelationCsvBytes.ts";
import { testAndSaveConnection } from "@sbfn/connectors/postgres/createPostgresConnector/testAndSaveConnection.ts";
import { toPostgresConnectionConfig } from "@sbfn/connectors/postgres/PostgresConnectionConfig.ts";
import type { PostgresSql } from "@sbfn/connectors/postgres/PostgresSql.types.ts";

/**
 * A configured ceiling, not "unbounded": this connector acquires a relation
 * as a single whole-table CSV rather than paging, so a cap here is what keeps
 * one oversized table from blocking the request indefinitely.
 *
 * This number is bounded above by the Supabase Edge Function runtime itself,
 * not chosen freely: an isolate is killed with a 546 at 250MB of memory or
 * 2s of actual CPU time, whichever comes first
 * (https://supabase.com/docs/guides/functions/limits), and this connector
 * holds the raw driver rows, the CSV string, and the HTTP response body at
 * once - several times the eventual CSV's own byte size. 150MB of CSV stays
 * comfortably under the memory ceiling with that overhead included, but a
 * row count anywhere near "1 million" is likely to blow the 2-second CPU
 * budget on the CSV-serialization loop alone, regardless of this byte cap -
 * there is no cap value that makes this architecture handle a table that
 * size. Serving a materially larger relation needs the connector running
 * somewhere without these ceilings (see the Open question this links to in
 * the design walkthrough, §4.4), not a bigger number here.
 */
const POSTGRES_MAX_BYTES_PER_ACQUIRE = 150 * 1024 * 1024;
const MAX_PREVIEW_ROWS = 50;

type CreatePostgresConnectorOptions = {
  /** Injectable for tests - defaults to opening a real connection. */
  connectToPostgres?: (
    config: ReturnType<typeof toPostgresConnectionConfig>,
  ) => PostgresSql;
};

/**
 * Builds the `postgres` {@link Connector}: test-and-save a
 * connection, list a connection's tables/views, preview one, and read its
 * full rows as CSV. Every method re-validates the target host against
 * {@link assertHostIsSafeToConnect} before opening a connection (never trusts
 * a previously-saved host as still safe, closing the DNS-rebinding gap), and
 * every read/write against `connections`/`connections__postgres` scopes
 * explicitly by `workspaceId` so one workspace's connection can never be
 * read, previewed, or mutated through another workspace's session. The
 * credential itself is never held here - it round-trips through Supabase
 * Vault via `rpc_connections__{create,update,get_decrypted}_secret`.
 */
export function createPostgresConnector(
  options: CreatePostgresConnectorOptions = {},
): Connector {
  const connect = options.connectToPostgres ?? defaultConnectToPostgres;

  return {
    testAndSaveConnection: (context, rawInput) => {
      return testAndSaveConnection(context, rawInput, connect);
    },

    listRelations: async (context, connectionId) => {
      let sql: PostgresSql | undefined;
      try {
        ({ sql } = await openSavedConnection(
          context,
          connectionId,
          connect,
          assertHostIsSafeToConnect,
        ));
        const relations = await listCatalogRelations(sql);
        await context.supabaseAdminClient
          .from("connections__postgres")
          .update({ last_verified_at: new Date().toISOString() })
          .eq("connection_id", connectionId)
          .eq("workspace_id", context.workspaceId);
        return relations;
      } catch (error) {
        throw new ConnectorError(
          classifyPostgresConnectionError(error),
          error instanceof Error ? error.message : String(error),
        );
      } finally {
        await sql?.end({ timeout: 5 });
      }
    },

    previewRelation: async (context, connectionId, relationId) => {
      const { schemaName, tableName } = parseRelationId(relationId);
      let sql: PostgresSql | undefined;
      try {
        ({ sql } = await openSavedConnection(
          context,
          connectionId,
          connect,
          assertHostIsSafeToConnect,
        ));
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
    },

    getRelationRows: async (context, connectionId, relationId) => {
      const { schemaName, tableName } = parseRelationId(relationId);
      let sql: PostgresSql | undefined;
      try {
        ({ sql } = await openSavedConnection(
          context,
          connectionId,
          connect,
          assertHostIsSafeToConnect,
        ));
        await assertRelationStillExists(sql, schemaName, tableName);
        const quotedRelation = quoteQualifiedPostgresIdentifier(
          schemaName,
          tableName,
        );

        const [countRow] = await sql.unsafe<{ exact_count: number }>(
          `select count(*)::int as exact_count from ${quotedRelation}`,
        );
        const rowCount = countRow?.exact_count ?? 0;

        // A raw row count is not a usable size signal on its own - a
        // 50-column table of `text` and a 2-column table of `boolean` can
        // have the same row count and wildly different CSV sizes. Estimate
        // the actual CSV footprint from the columns' own declared types
        // (and, where there is no declared bound, a name-based guess - see
        // `estimateRelationCsvBytes.ts`) multiplied by the exact row count,
        // and refuse before reading a single row if that estimate alone is
        // already over the cap.
        const columns = await sql<{
          column_name: string;
          data_type: string;
          character_maximum_length: number | null;
        }>`
          select column_name, data_type, character_maximum_length
          from information_schema.columns
          where table_schema = ${schemaName} and table_name = ${tableName}
          order by ordinal_position
        `;
        const columnSizeInfo = columns.map((column) => {
          return {
            columnName: column.column_name,
            dataType: column.data_type,
            characterMaximumLength: column.character_maximum_length,
          };
        });
        const estimatedBytes = estimateRelationCsvBytes({
          columns: columnSizeInfo,
          rowCount,
        });
        if (estimatedBytes > POSTGRES_MAX_BYTES_PER_ACQUIRE) {
          throw new ConnectorError(
            "too_large",
            `'${schemaName}.${tableName}' is estimated at ~${estimatedBytes} bytes as CSV (${rowCount} rows), over the ${POSTGRES_MAX_BYTES_PER_ACQUIRE}-byte limit for a single acquisition`,
          );
        }

        const rows = await sql.unsafe<Record<string, unknown>>(
          `select * from ${quotedRelation}`,
        );
        const csv = rowsToCsv(columnSizeInfo.map(prop("columnName")), rows);

        const byteLength = new TextEncoder().encode(csv).length;
        if (byteLength > POSTGRES_MAX_BYTES_PER_ACQUIRE) {
          throw new ConnectorError(
            "too_large",
            `'${schemaName}.${tableName}' is ${byteLength} bytes as CSV, over the ${POSTGRES_MAX_BYTES_PER_ACQUIRE}-byte limit for a single acquisition`,
          );
        }

        return csv;
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
    },
  };
}
