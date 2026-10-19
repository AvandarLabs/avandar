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
): Promise<{ rowCount: number; descriptor: RelationRowDescriptor }> {
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
 * How many rows each cursor batch asks for: about the configured target
 * bytes of CSV at the relation's estimated row width, within the configured
 * bounds. Each batch costs one network round trip, so a narrow table reads
 * in a few large batches while a wide one never holds more than about the
 * target in driver rows at once.
 */
function _getRowsPerCursorBatch(descriptor: RelationRowDescriptor): number {
  const { targetBytes, minRows, maxRows } =
    GlobalAppConfig.postgresConnector.rowsPerCursorBatch;
  const estimatedRowBytes = Math.max(descriptor.estimatedRowBytes ?? 1, 1);
  const rowsForTarget = Math.floor(targetBytes / estimatedRowBytes);
  return Math.min(Math.max(rowsForTarget, minRows), maxRows);
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

  const encoder = new TextEncoder();
  const headerChunk = encoder.encode(
    PostgresCsv.makeHeaderLineFromColumnNames(columnNames),
  );
  const chunks = [headerChunk];
  let byteCount = headerChunk.byteLength;
  // Rows arrive through a cursor a batch at a time and are written straight
  // to bytes, so a relation far wider than estimated is refused once it
  // crosses the cap instead of after every row is in memory.
  const rowBatches = transaction<Record<string, unknown>>`
    select ${columnList} from ${relationName}
  `.cursor(_getRowsPerCursorBatch(descriptor));
  for await (const rows of rowBatches) {
    _assertBeforeReadDeadline(options);
    const chunk = encoder.encode(
      PostgresCsv.makeRowLinesFromRows({ columnNames, rows }),
    );
    byteCount += chunk.byteLength;
    _assertWithinPostgresCallCaps({
      rowCount,
      byteCount,
      descriptor,
      message: `'${schemaName}.${tableName}' passed ${byteCount} bytes as CSV, over the ${POSTGRES_MAX_BYTES_PER_ACQUIRE}-byte limit for a single acquisition`,
    });
    chunks.push(chunk);
  }
  return new Blob(chunks, { type: "text/csv" });
}
