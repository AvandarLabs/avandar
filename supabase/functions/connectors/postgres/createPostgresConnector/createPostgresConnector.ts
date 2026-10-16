import { prop } from "@avandar/utils";
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
import { testAndSaveConnection } from "@sbfn/connectors/postgres/createPostgresConnector/testAndSaveConnection.ts";
import { toPostgresConnectionConfig } from "@sbfn/connectors/postgres/PostgresConnectionConfig.ts";
import {
  estimateRelationCsvBytes,
  estimateRowCsvBytes,
  POSTGRES_MAX_BYTES_PER_ACQUIRE,
  postgresMaxRowsPerCall,
} from "$/connectors/postgres/estimateRelationCsvBytes.ts";
import { isWithinRelationCallCaps } from "$/models/relations/RelationCapabilities/isWithinRelationCallCaps.ts";
import type { ColumnSizeInfo } from "$/connectors/postgres/estimateRelationCsvBytes.ts";
import type { RelationRowDescriptor } from "$/models/relations/RelationCapabilities/RelationCapabilities.types.ts";
import type { PostgresSql } from "@sbfn/connectors/postgres/PostgresSql.types.ts";

const MAX_PREVIEW_ROWS = 50;

type CreatePostgresConnectorOptions = {
  /** Injectable for tests - defaults to opening a real connection. */
  connectToPostgres?: (
    config: ReturnType<typeof toPostgresConnectionConfig>,
  ) => PostgresSql;
};

/**
 * Throws `too_large` unless `byteCount`/`rowCount` both stay within the
 * shared Postgres cap contract (`postgresMaxRowsPerCall`,
 * `POSTGRES_MAX_BYTES_PER_ACQUIRE`) for the relation `descriptor` describes -
 * the same contract `PostgresTableWrapper.ts`'s capability record advertises,
 * so the edge function enforces exactly what it advertises rather than a
 * second, separately-maintained threshold check.
 */
function _assertWithinPostgresCallCaps(options: {
  rowCount: number;
  byteCount: number;
  descriptor: RelationRowDescriptor;
  message: string;
}): void {
  const withinCaps = isWithinRelationCallCaps({
    rowCount: options.rowCount,
    byteCount: options.byteCount,
    maxRowsPerCall: postgresMaxRowsPerCall,
    maxBytesPerCall: POSTGRES_MAX_BYTES_PER_ACQUIRE,
    descriptor: options.descriptor,
  });
  if (!withinCaps) {
    throw new ConnectorError("too_large", options.message);
  }
}

/**
 * Reads one relation's columns with enough type metadata to estimate its CSV
 * width, for the cap check in {@link _readRelationRowsWithinCaps} - a
 * separate, wider `select` than `previewRelation`'s own columns query, which
 * only needs a column's name and type to show in the picker, not its
 * declared length bound.
 */
async function _getColumnSizeInfo(
  sql: PostgresSql,
  schemaName: string,
  tableName: string,
): Promise<ColumnSizeInfo[]> {
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
  return columns.map((column) => {
    return {
      columnName: column.column_name,
      dataType: column.data_type,
      characterMaximumLength: column.character_maximum_length,
    };
  });
}

/**
 * Reads one relation's full rows as CSV, refusing before and after the read
 * if its size is outside the shared call caps. The pre-read refusal (from an
 * exact row count and an estimated row width, never reading a row) is the
 * common case; the post-read refusal is the backstop for when that estimate
 * turns out wrong.
 */
async function _readRelationRowsWithinCaps(
  sql: PostgresSql,
  schemaName: string,
  tableName: string,
): Promise<string> {
  const [countRow] = await sql<{ exact_count: number }>`
    select count(*)::int as exact_count
    from ${sql(schemaName)}.${sql(tableName)}
  `;
  const rowCount = countRow?.exact_count ?? 0;

  // A raw row count alone says nothing about row width - estimate the CSV
  // footprint from the columns' own declared types instead (see
  // `estimateRelationCsvBytes.ts`), multiplied by the exact row count.
  const columnSizeInfo = await _getColumnSizeInfo(sql, schemaName, tableName);
  const descriptor = {
    columnCount: columnSizeInfo.length,
    estimatedRowBytes: estimateRowCsvBytes(columnSizeInfo),
  };
  const estimatedBytes = estimateRelationCsvBytes({
    columns: columnSizeInfo,
    rowCount,
  });
  _assertWithinPostgresCallCaps({
    rowCount,
    byteCount: estimatedBytes,
    descriptor,
    message: `'${schemaName}.${tableName}' is estimated at ~${estimatedBytes} bytes as CSV (${rowCount} rows), over the ${POSTGRES_MAX_BYTES_PER_ACQUIRE}-byte limit for a single acquisition`,
  });

  const rows = await sql<Record<string, unknown>>`
    select * from ${sql(schemaName)}.${sql(tableName)}
  `;
  const csv = rowsToCsv(columnSizeInfo.map(prop("columnName")), rows);

  const byteLength = new TextEncoder().encode(csv).length;
  _assertWithinPostgresCallCaps({
    rowCount,
    byteCount: byteLength,
    descriptor,
    message: `'${schemaName}.${tableName}' is ${byteLength} bytes as CSV, over the ${POSTGRES_MAX_BYTES_PER_ACQUIRE}-byte limit for a single acquisition`,
  });

  return csv;
}

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

        const columns = await sql<{
          column_name: string;
          data_type: string;
        }>`
          select column_name, data_type
          from information_schema.columns
          where table_schema = ${schemaName} and table_name = ${tableName}
          order by ordinal_position
        `;

        // `sql(schemaName)`/`sql(tableName)` are the driver's own identifier
        // helper, each quoting its argument the same way `quote_ident()`
        // does - the schema and table are two separate identifiers, quoted
        // independently and joined by a literal `.` in the template text,
        // never one string spanning both (that would quote `schema.table`
        // as a single name rather than referencing the table inside the
        // schema).
        const previewRows = await sql<Record<string, unknown>>`
          select * from ${sql(schemaName)}.${sql(tableName)} limit ${MAX_PREVIEW_ROWS}
        `;

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
        return await _readRelationRowsWithinCaps(sql, schemaName, tableName);
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
