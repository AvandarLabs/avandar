import { quoteSqlIdentifier } from "@avandar/utils/sql";
import { ConnectorError } from "@sbfn/connectors/Connector.ts";
import { PostgresCsv } from "@sbfn/connectors/postgres/createPostgresConnector/PostgresCsv/PostgresCsv.ts";
import { assertWithinPostgresCallCaps } from "@sbfn/connectors/postgres/createPostgresConnector/readRelationCsvWithinCaps/assertWithinPostgresCallCaps.ts";
import { getRelationSizeWithinCaps } from "@sbfn/connectors/postgres/createPostgresConnector/readRelationCsvWithinCaps/getRelationSizeWithinCaps.ts";
import { makeCsvBatchFromRows } from "@sbfn/connectors/postgres/createPostgresConnector/readRelationCsvWithinCaps/makeCsvBatchFromRows.ts";
import { quotePostgresRelationName } from "@sbfn/connectors/postgres/quotePostgresRelationName/quotePostgresRelationName.ts";
import { GlobalAppConfig } from "$/config/GlobalAppConfig.ts";
import { POSTGRES_MAX_BYTES_PER_ACQUIRE } from "$/connectors/postgres/PostgresCsvEstimate/PostgresCsvEstimate.ts";
import type { PostgresTableDataset } from "$/models/datasets/PostgresTableDataset/PostgresTableDataset.ts";
import type { RelationSize } from "@sbfn/connectors/postgres/createPostgresConnector/readRelationCsvWithinCaps/getRelationSizeWithinCaps.ts";
import type { CsvBytes } from "@sbfn/connectors/postgres/createPostgresConnector/readRelationCsvWithinCaps/makeCsvBatchFromRows.ts";
import type { PostgresQueryRunner } from "@sbfn/connectors/postgres/PostgresSql.types.ts";

/** The relation whose rows {@link readRelationCsvWithinCaps} reads. */
export type ReadRelationCsvWithinCapsOptions = {
  transaction: PostgresQueryRunner;
  schemaName: string;
  tableName: string;
  relationKind: PostgresTableDataset.RelationKind;

  /** The only columns read, in the order the CSV lists them. */
  columnNames: readonly string[];

  /**
   * Epoch ms after which the read is refused as `timeout`. Checked as each
   * batch of rows arrives, since the statement timeout bounds only one batch.
   */
  deadlineAt: number;
};

/** A declared rows cursor to fetch, and the caps its CSV is held to. */
type CursorReadOptions = ReadRelationCsvWithinCapsOptions &
  RelationSize & {
    /** The cursor's name, as a fragment the fetch interpolates. */
    cursorName: unknown;
  };

/**
 * How many rows the next cursor batch asks for, after a batch of
 * `previousBatchRowCount` rows whose widest was `widestRowBytes` of CSV:
 * about the configured target bytes at that width, at most the configured
 * growth over the previous batch, and within the configured bounds.
 */
function _getNextBatchRowCount(
  options: Readonly<{ previousBatchRowCount: number; widestRowBytes: number }>,
): number {
  const { targetBytes, minRows, maxRows, maxGrowthFactor } =
    GlobalAppConfig.postgresConnector.rowsPerCursorBatch;
  const rowsForTarget = Math.floor(
    targetBytes / Math.max(options.widestRowBytes, 1),
  );
  return Math.max(
    minRows,
    Math.min(
      rowsForTarget,
      options.previousBatchRowCount * maxGrowthFactor,
      maxRows,
    ),
  );
}

/**
 * Throws `timeout` once `deadlineAt` has passed, so a relation whose rows
 * keep arriving slowly is refused before the request runs out of time.
 */
function _assertBeforeReadDeadline(
  options: Readonly<{
    deadlineAt: number;
    schemaName: string;
    tableName: string;
  }>,
): void {
  if (Date.now() > options.deadlineAt) {
    throw new ConnectorError(
      "timeout",
      `Reading '${options.schemaName}.${options.tableName}' did not finish before its deadline`,
    );
  }
}

/**
 * Fetches every row of the declared cursor as CSV bytes, header first,
 * refusing the relation as `too_large` as soon as the CSV crosses the caps
 * and as `timeout` once rows still arrive past `deadlineAt`.
 */
async function _fetchCursorAsCsvChunks(
  options: Readonly<CursorReadOptions>,
): Promise<CsvBytes[]> {
  const { transaction, columnNames, schemaName, tableName } = options;
  const encoder = new TextEncoder();
  const headerChunk = encoder.encode(
    PostgresCsv.makeHeaderLineFromColumnNames(columnNames),
  );
  const chunks = [headerChunk];
  let byteCount = headerChunk.byteLength;
  let batchRowCount: number =
    GlobalAppConfig.postgresConnector.rowsPerCursorBatch.minRows;
  let hasMoreRows = true;
  // Each batch is its own FETCH, sized from the widest row of the one before,
  // and is written straight to bytes, so a relation far wider than estimated
  // is refused once it crosses the cap instead of after every row is held.
  // Unprepared, because the driver caches a prepared statement's row
  // description by its text: a `fetch forward 10` of another relation on the
  // same connection would otherwise be parsed with this one's columns.
  while (hasMoreRows) {
    const rows = await transaction<Record<string, unknown>>`
      fetch forward ${transaction.unsafe(String(batchRowCount))} from ${options.cursorName}
    `.simple();
    // An empty fetch follows a full last batch: every row has arrived.
    if (rows.length === 0) {
      break;
    }
    _assertBeforeReadDeadline(options);
    const batch = makeCsvBatchFromRows({ encoder, columnNames, rows });
    byteCount += batch.chunk.byteLength;
    assertWithinPostgresCallCaps({
      rowCount: options.rowCount,
      byteCount,
      descriptor: options.descriptor,
      message: `'${schemaName}.${tableName}' passed ${byteCount} bytes as CSV, over the ${POSTGRES_MAX_BYTES_PER_ACQUIRE}-byte limit for a single acquisition`,
    });
    chunks.push(batch.chunk);
    hasMoreRows = rows.length === batchRowCount;
    batchRowCount = _getNextBatchRowCount({
      previousBatchRowCount: batchRowCount,
      widestRowBytes: batch.widestRowBytes,
    });
  }
  return chunks;
}

/**
 * Reads one relation's rows as CSV bytes, only the columns in `columnNames`
 * and in that order, refusing it as `too_large`
 * before reading a row if its estimated size is over the shared call caps,
 * and again as soon as the CSV actually written crosses them. Refuses it as
 * `timeout` once its rows are still arriving past `deadlineAt`.
 *
 * @returns The CSV, including its header line, as `text/csv` bytes.
 */
export async function readRelationCsvWithinCaps(
  options: Readonly<ReadRelationCsvWithinCapsOptions>,
): Promise<Blob> {
  const { transaction, schemaName, tableName, columnNames } = options;
  const relationName = quotePostgresRelationName({
    sql: transaction,
    schemaName,
    tableName,
  });
  const { rowCount, descriptor } = await getRelationSizeWithinCaps({
    ...options,
    relationName,
  });
  const columnList = transaction.unsafe(
    columnNames.map(quoteSqlIdentifier).join(", "),
  );
  const cursorName = transaction.unsafe("ava_relation_rows");

  // A server-side cursor rather than the driver's own, so each batch can ask
  // for a different number of rows. It closes when the read's transaction
  // ends.
  await transaction`
    declare ${cursorName} no scroll cursor for select ${columnList} from ${relationName}
  `;
  const chunks = await _fetchCursorAsCsvChunks({
    ...options,
    cursorName,
    rowCount,
    descriptor,
  });
  return new Blob(chunks, { type: "text/csv" });
}
