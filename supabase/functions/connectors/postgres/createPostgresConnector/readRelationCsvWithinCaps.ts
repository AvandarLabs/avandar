import { camelCaseKeysShallow, makeIdLookupMap } from "@avandar/utils";
import { quoteSqlIdentifier } from "@avandar/utils/sql";
import { ConnectorError } from "@sbfn/connectors/Connector.ts";
import { PostgresCsv } from "@sbfn/connectors/postgres/createPostgresConnector/PostgresCsv/PostgresCsv.ts";
import { quotePostgresRelationName } from "@sbfn/connectors/postgres/quotePostgresRelationName/quotePostgresRelationName.ts";
import { GlobalAppConfig } from "$/config/GlobalAppConfig.ts";
import {
  POSTGRES_MAX_BYTES_PER_ACQUIRE,
  PostgresCsvEstimate,
} from "$/connectors/postgres/PostgresCsvEstimate/PostgresCsvEstimate.ts";
import { isWithinRelationCallCaps } from "$/models/relations/RelationCapabilities/isWithinRelationCallCaps.ts";
import type { ColumnSizeInfo } from "$/connectors/postgres/PostgresCsvEstimate/PostgresCsvEstimate.ts";
import type { RelationRowDescriptor } from "$/models/relations/RelationCapabilities/RelationCapabilities.types.ts";
import type { PostgresQueryRunner } from "@sbfn/connectors/postgres/PostgresSql.types.ts";

/** CSV text encoded as bytes, as `TextEncoder` returns it. */
type CsvBytes = ReturnType<TextEncoder["encode"]>;

/** Sizes to check against the shared Postgres cap contract. */
type PostgresCallCapsCheck = {
  rowCount: number;
  byteCount: number;
  descriptor: RelationRowDescriptor;

  /** Why the relation is refused, if it is over the caps. */
  message: string;
};

/** The relation whose rows {@link readRelationCsvWithinCaps} reads. */
export type ReadRelationCsvWithinCapsOptions = {
  transaction: PostgresQueryRunner;
  schemaName: string;
  tableName: string;

  /** The only columns read, in the order the CSV lists them. */
  columnNames: readonly string[];

  /**
   * Epoch ms after which the read is refused as `timeout`. Checked as each
   * batch of rows arrives, since the statement timeout bounds only one batch.
   */
  deadlineAt: number;
};

/** A relation to measure before any of its rows are read. */
type RelationToMeasure = Omit<
  ReadRelationCsvWithinCapsOptions,
  "deadlineAt"
> & {
  /** The quoted relation name fragment the size query interpolates. */
  relationName: unknown;
};

/** A relation's measured size, before any of its rows are read. */
type RelationSize = {
  rowCount: number;
  descriptor: RelationRowDescriptor;
};

/** A declared rows cursor to fetch, and the caps its CSV is held to. */
type CursorReadOptions = ReadRelationCsvWithinCapsOptions &
  RelationSize & {
    /** The cursor's name, as a fragment the fetch interpolates. */
    cursorName: unknown;
  };

/**
 * Throws `too_large` unless `byteCount`/`rowCount` both stay within the
 * shared Postgres cap contract (`PostgresCsvEstimate.postgresMaxRowsPerCall`,
 * `POSTGRES_MAX_BYTES_PER_ACQUIRE`) for the relation `descriptor` describes -
 * the same contract `PostgresTableWrapper.ts`'s capability record advertises,
 * so the edge function enforces exactly what it advertises rather than a
 * second, separately-maintained threshold check.
 */
function _assertWithinPostgresCallCaps(
  options: Readonly<PostgresCallCapsCheck>,
): void {
  const withinCaps = isWithinRelationCallCaps({
    rowCount: options.rowCount,
    byteCount: options.byteCount,
    maxRowsPerCall: PostgresCsvEstimate.postgresMaxRowsPerCall,
    maxBytesPerCall: POSTGRES_MAX_BYTES_PER_ACQUIRE,
    descriptor: options.descriptor,
  });
  if (!withinCaps) {
    throw new ConnectorError("too_large", options.message);
  }
}

/**
 * Reads one relation's columns with enough type metadata to estimate its CSV
 * width - a separate, wider `select` than `previewRelation`'s own columns
 * query, which only needs a column's name and type to show in the picker,
 * not its declared length bound.
 */
async function _getColumnSizeInfo(
  options: Readonly<{
    transaction: PostgresQueryRunner;
    schemaName: string;
    tableName: string;
  }>,
): Promise<ColumnSizeInfo[]> {
  const { transaction, schemaName, tableName } = options;
  const columns = await transaction<{
    column_name: string;
    data_type: string;
    character_maximum_length: number | null;
  }>`
    select column_name, data_type, character_maximum_length
    from information_schema.columns
    where table_schema = ${schemaName} and table_name = ${tableName}
    order by ordinal_position
  `;
  return columns.map(camelCaseKeysShallow);
}

/**
 * The type metadata of each column in `columnNames`, in that order. Throws
 * when one of them no longer exists in the relation, rather than reading a
 * table whose shape has drifted from the dataset's.
 */
async function _getReadColumnSizeInfo(
  options: Readonly<Omit<ReadRelationCsvWithinCapsOptions, "deadlineAt">>,
): Promise<ColumnSizeInfo[]> {
  const columnsByName = makeIdLookupMap(await _getColumnSizeInfo(options), {
    key: "columnName",
  });
  return options.columnNames.map((columnName) => {
    const column = columnsByName.get(columnName);
    if (column === undefined) {
      throw new ConnectorError(
        "unknown",
        `Column '${columnName}' no longer exists in '${options.schemaName}.${options.tableName}'`,
      );
    }
    return column;
  });
}

/**
 * Measures a relation without reading a row, from an exact row count and an
 * estimated row width (see `PostgresCsvEstimate.ts`), and refuses it as
 * `too_large` if that estimate is already over the caps.
 */
async function _getRelationSizeWithinCaps(
  options: Readonly<RelationToMeasure>,
): Promise<RelationSize> {
  const { transaction, relationName, schemaName, tableName } = options;
  // `count(*)` is a `bigint`, which the driver returns as a string. Casting
  // it to `int` instead would fail outright past 2^31 rows rather than
  // reporting the table as too large.
  const [countRow] = await transaction<{ exact_count: string | number }>`
    select count(*) as exact_count
    from ${relationName}
  `;
  const rowCount = Number(countRow?.exact_count ?? 0);
  const columns = await _getReadColumnSizeInfo(options);
  const descriptor = {
    columnCount: columns.length,
    estimatedRowBytes: PostgresCsvEstimate.estimateRowCsvBytes(columns),
  };
  const estimatedBytes = PostgresCsvEstimate.estimateRelationCsvBytes({
    columns,
    rowCount,
  });
  _assertWithinPostgresCallCaps({
    rowCount,
    byteCount: estimatedBytes,
    descriptor,
    message: `'${schemaName}.${tableName}' is estimated at ~${estimatedBytes} bytes as CSV (${rowCount} rows), over the ${POSTGRES_MAX_BYTES_PER_ACQUIRE}-byte limit for a single acquisition`,
  });
  return { rowCount, descriptor };
}

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
 * The size in bytes of the widest of a batch's CSV lines, given how many
 * bytes the whole batch encodes to.
 */
function _getWidestLineBytes(
  options: Readonly<{
    encoder: TextEncoder;
    lines: readonly string[];
    batchByteLength: number;
  }>,
): number {
  const { encoder, lines } = options;
  const longestLineLength = lines.reduce((longestSoFar, line) => {
    return Math.max(longestSoFar, line.length);
  }, 0);
  const batchLength = lines.reduce((lengthSoFar, line) => {
    return lengthSoFar + line.length;
  }, 0);
  // All ASCII: every character is one byte, so the longest line is widest.
  if (options.batchByteLength === batchLength) {
    return longestLineLength;
  }
  // Each UTF-16 unit of a line encodes to at most 3 bytes, so only a line at
  // least a third as long as the widest found so far can be wider.
  return lines.reduce((widestBytesSoFar, line) => {
    return line.length * 3 > widestBytesSoFar
      ? Math.max(widestBytesSoFar, encoder.encode(line).byteLength)
      : widestBytesSoFar;
  }, longestLineLength);
}

/** One batch of rows written as CSV bytes, with its widest row's size. */
function _makeCsvBatchFromRows(
  options: Readonly<
    Parameters<typeof PostgresCsv.makeRowLinesFromRows>[0] & {
      encoder: TextEncoder;
    }
  >,
): { chunk: CsvBytes; widestRowBytes: number } {
  const lines = PostgresCsv.makeRowLinesFromRows(options);
  const chunk = options.encoder.encode(lines.join(""));
  return {
    chunk,
    widestRowBytes: _getWidestLineBytes({
      encoder: options.encoder,
      lines,
      batchByteLength: chunk.byteLength,
    }),
  };
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
    const batch = _makeCsvBatchFromRows({ encoder, columnNames, rows });
    byteCount += batch.chunk.byteLength;
    _assertWithinPostgresCallCaps({
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
  const { rowCount, descriptor } = await _getRelationSizeWithinCaps({
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
