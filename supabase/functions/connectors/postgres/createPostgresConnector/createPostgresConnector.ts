import { getSafeAddressFromHost as defaultGetSafeAddressFromHost } from "@sbfn/_shared/validateHostNotPrivate.ts";
import {
  ConnectorError,
  type Connector,
  type ConnectorContext,
} from "@sbfn/connectors/Connector.ts";
import { classifyPostgresConnectionError } from "@sbfn/connectors/postgres/classifyPostgresConnectionError.ts";
import { connectToPostgres as defaultConnectToPostgres } from "@sbfn/connectors/postgres/connectToPostgres/connectToPostgres.ts";
import { PostgresCatalog } from "@sbfn/connectors/postgres/createPostgresConnector/PostgresCatalog.ts";
import {
  openSavedConnection,
  type OpenSavedConnectionOptions,
} from "@sbfn/connectors/postgres/createPostgresConnector/postgresConnectionRow.ts";
import { readRelationCsvWithinCaps } from "@sbfn/connectors/postgres/createPostgresConnector/readRelationCsvWithinCaps.ts";
import { testAndSaveConnection } from "@sbfn/connectors/postgres/createPostgresConnector/testAndSaveConnection.ts";
import { quotePostgresRelationName } from "@sbfn/connectors/postgres/quotePostgresRelationName/quotePostgresRelationName.ts";
import { runReadOnlyTransaction } from "@sbfn/connectors/postgres/runReadOnlyTransaction/runReadOnlyTransaction.ts";
import type { PostgresConnectionConfig } from "@sbfn/connectors/postgres/PostgresConnectionConfig.ts";
import type {
  PostgresQueryRunner,
  PostgresSql,
} from "@sbfn/connectors/postgres/PostgresSql.types.ts";

const MAX_PREVIEW_ROWS = 50;

/** Longest any one catalog or preview statement may run, in milliseconds. */
const CATALOG_STATEMENT_TIMEOUT_MS = 15_000;

/**
 * Longest any one statement reading a relation's rows may run, in
 * milliseconds. The rows arrive through a cursor whose every batch is its
 * own statement, so this bounds one batch, not the whole read.
 */
const ROWS_STATEMENT_TIMEOUT_MS = 30_000;

/**
 * Longest reading one relation's rows may take in all, in milliseconds,
 * checked as each batch of rows arrives. The batch in flight when it passes
 * can still run for up to {@link ROWS_STATEMENT_TIMEOUT_MS}, which keeps the
 * request inside the 150 seconds after which the Edge Function runtime
 * answers it with a 504, so a slow table is reported as `timeout` instead.
 */
const ROWS_READ_DEADLINE_MS = 90_000;

type CreatePostgresConnectorOptions = {
  /** Injectable for tests - defaults to opening a real connection. */
  connectToPostgres?: (config: PostgresConnectionConfig) => PostgresSql;

  /** Injectable for tests - defaults to a real DNS lookup and SSRF check. */
  getSafeAddressFromHost?: (host: string) => Promise<string>;
};

/** A saved connection, and how to open it. */
type SavedConnectionTarget = OpenSavedConnectionOptions & {
  context: ConnectorContext;
};

/** One relation on a saved connection, and how to open the connection. */
type SavedRelationTarget = SavedConnectionTarget & { relationId: string };

/** A saved connection to open, and what to run on it once it is open. */
type WithSavedConnectionOptions<T> = SavedConnectionTarget & {
  statementTimeoutMs: number;
  run: (transaction: PostgresQueryRunner) => Promise<T>;
};

/**
 * Opens a saved connection, runs `run` in a read-only transaction with a
 * statement timeout, and closes the connection again, classifying any
 * failure into a {@link ConnectorError}.
 */
async function _withSavedConnection<T>(
  options: Readonly<WithSavedConnectionOptions<T>>,
): Promise<T> {
  let sql: PostgresSql | undefined;
  try {
    ({ sql } = await openSavedConnection(options.context, options));
    return await runReadOnlyTransaction({ sql, ...options });
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

/** Lists a saved connection's relations, and records it as just verified. */
async function _listRelations(
  options: Readonly<SavedConnectionTarget>,
): ReturnType<Connector["listRelations"]> {
  const { context, connectionId } = options;
  const relations = await _withSavedConnection({
    ...options,
    statementTimeoutMs: CATALOG_STATEMENT_TIMEOUT_MS,
    run: PostgresCatalog.listCatalogRelations,
  });
  await context.supabaseAdminClient
    .from("connections__postgres")
    .update({ last_verified_at: new Date().toISOString() })
    .eq("connection_id", connectionId)
    .eq("workspace_id", context.workspaceId);
  return relations;
}

/** Reads a relation's columns and first rows for the import preview. */
async function _previewRelationRows(
  options: Readonly<{
    transaction: PostgresQueryRunner;
    schemaName: string;
    tableName: string;
  }>,
): ReturnType<Connector["previewRelation"]> {
  const { transaction, schemaName, tableName } = options;
  await PostgresCatalog.assertRelationStillExists(
    transaction,
    schemaName,
    tableName,
  );
  const columns = await transaction<{
    column_name: string;
    data_type: string;
  }>`
    select column_name, data_type
    from information_schema.columns
    where table_schema = ${schemaName} and table_name = ${tableName}
    order by ordinal_position
  `;
  // The schema and table are quoted as two separate identifiers (see
  // `quotePostgresRelationName.ts`), so a dot inside either name stays part
  // of that name.
  const previewRows = await transaction<Record<string, unknown>>`
    select * from ${quotePostgresRelationName({ sql: transaction, schemaName, tableName })} limit ${MAX_PREVIEW_ROWS}
  `;
  return {
    columns: columns.map((column) => {
      return { columnName: column.column_name, sourceType: column.data_type };
    }),
    previewRows,
  };
}

/** Previews one relation on a saved connection. */
async function _previewRelation(
  options: Readonly<SavedRelationTarget>,
): ReturnType<Connector["previewRelation"]> {
  const { schemaName, tableName } = PostgresCatalog.parseRelationId(
    options.relationId,
  );
  return await _withSavedConnection({
    ...options,
    statementTimeoutMs: CATALOG_STATEMENT_TIMEOUT_MS,
    run: (transaction) => {
      return _previewRelationRows({ transaction, schemaName, tableName });
    },
  });
}

/**
 * Reads one relation on a saved connection as CSV, refusing it as `timeout`
 * if it is still reading {@link ROWS_READ_DEADLINE_MS} after the call began.
 */
async function _getRelationRows(
  options: Readonly<SavedRelationTarget>,
): ReturnType<Connector["getRelationRows"]> {
  const deadlineAt = Date.now() + ROWS_READ_DEADLINE_MS;
  const { schemaName, tableName } = PostgresCatalog.parseRelationId(
    options.relationId,
  );
  return await _withSavedConnection({
    ...options,
    statementTimeoutMs: ROWS_STATEMENT_TIMEOUT_MS,
    run: async (transaction) => {
      await PostgresCatalog.assertRelationStillExists(
        transaction,
        schemaName,
        tableName,
      );
      return await readRelationCsvWithinCaps({
        transaction,
        schemaName,
        tableName,
        deadlineAt,
      });
    },
  });
}

/**
 * Builds the `postgres` {@link Connector}: test-and-save a connection, list a
 * connection's tables/views, preview one, and read its full rows as CSV.
 * Every method re-checks the target host and connects to the address that
 * check vetted (never trusts a previously-saved host as still safe, since its
 * DNS records can change after it was saved), and every read/write against
 * `connections`/`connections__postgres` scopes explicitly by `workspaceId`
 * so one workspace's connection can never be read, previewed, or mutated
 * through another workspace's session. Every query against the remote
 * database runs read-only, with a statement timeout. The credential itself
 * is never held here - it round-trips through Supabase Vault via
 * `rpc_connections__{create,update,get_decrypted}_secret`.
 */
export function createPostgresConnector(
  options: CreatePostgresConnectorOptions = {},
): Connector {
  const dependencies = {
    connect: options.connectToPostgres ?? defaultConnectToPostgres,
    getSafeAddressFromHost:
      options.getSafeAddressFromHost ?? defaultGetSafeAddressFromHost,
  };

  return {
    testAndSaveConnection: (context, rawInput) => {
      return testAndSaveConnection(context, rawInput, {
        ...dependencies,
        statementTimeoutMs: CATALOG_STATEMENT_TIMEOUT_MS,
      });
    },

    listRelations: (context, connectionId) => {
      return _listRelations({ ...dependencies, context, connectionId });
    },

    previewRelation: (context, connectionId, relationId) => {
      return _previewRelation({
        ...dependencies,
        context,
        connectionId,
        relationId,
      });
    },

    getRelationRows: (context, connectionId, relationId) => {
      return _getRelationRows({
        ...dependencies,
        context,
        connectionId,
        relationId,
      });
    },
  };
}
