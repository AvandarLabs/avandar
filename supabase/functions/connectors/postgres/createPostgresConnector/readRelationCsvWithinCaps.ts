import { camelCaseKeysShallow, prop } from "@avandar/utils";
import { ConnectorError } from "@sbfn/connectors/Connector.ts";
import { PostgresCsv } from "@sbfn/connectors/postgres/createPostgresConnector/PostgresCsv/PostgresCsv.ts";
import { quotePostgresRelationName } from "@sbfn/connectors/postgres/quotePostgresRelationName/quotePostgresRelationName.ts";
import {
  POSTGRES_MAX_BYTES_PER_ACQUIRE,
  PostgresCsvEstimate,
} from "$/connectors/postgres/PostgresCsvEstimate/PostgresCsvEstimate.ts";
import { isWithinRelationCallCaps } from "$/models/relations/RelationCapabilities/isWithinRelationCallCaps.ts";
import type { ColumnSizeInfo } from "$/connectors/postgres/PostgresCsvEstimate/PostgresCsvEstimate.ts";
import type { RelationRowDescriptor } from "$/models/relations/RelationCapabilities/RelationCapabilities.types.ts";
import type { PostgresQueryRunner } from "@sbfn/connectors/postgres/PostgresSql.types.ts";

/**
 * Rows the driver reads per batch while a relation is written out as CSV, so
 * only one batch of driver rows is ever held in memory at a time.
 */
const CSV_ROWS_PER_BATCH = 5_000;

/**
 * Throws `too_large` unless `byteCount`/`rowCount` both stay within the
 * shared Postgres cap contract (`PostgresCsvEstimate.postgresMaxRowsPerCall`,
 * `POSTGRES_MAX_BYTES_PER_ACQUIRE`) for the relation `descriptor` describes -
 * the same contract `PostgresTableWrapper.ts`'s capability record advertises,
 * so the edge function enforces exactly what it advertises rather than a
 * second, separately-maintained threshold check.
 */
function _assertWithinPostgresCallCaps(
  options: Readonly<{
    rowCount: number;
    byteCount: number;
    descriptor: RelationRowDescriptor;
    message: string;
  }>,
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
  transaction: PostgresQueryRunner,
  schemaName: string,
  tableName: string,
): Promise<ColumnSizeInfo[]> {
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
 * Measures a relation without reading a row, from an exact row count and an
 * estimated row width (see `PostgresCsvEstimate.ts`), and refuses it as
 * `too_large` if that estimate is already over the caps.
 */
async function _getRelationSizeWithinCaps(
  options: Readonly<{
    transaction: PostgresQueryRunner;
    relationName: unknown;
    schemaName: string;
    tableName: string;
  }>,
): Promise<{
  rowCount: number;
  descriptor: RelationRowDescriptor;
  columnNames: string[];
}> {
  const { transaction, relationName, schemaName, tableName } = options;
  // `count(*)` is a `bigint`, which the driver returns as a string. Casting
  // it to `int` instead would fail outright past 2^31 rows rather than
  // reporting the table as too large.
  const [countRow] = await transaction<{ exact_count: string | number }>`
    select count(*) as exact_count
    from ${relationName}
  `;
  const rowCount = Number(countRow?.exact_count ?? 0);
  const columns = await _getColumnSizeInfo(transaction, schemaName, tableName);
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
  return { rowCount, descriptor, columnNames: columns.map(prop("columnName")) };
}

/**
 * Reads one relation's full rows as CSV bytes, refusing it as `too_large`
 * before reading a row if its estimated size is over the shared call caps,
 * and again as soon as the CSV actually written crosses them. Rows arrive
 * through a cursor a batch at a time and are written straight to bytes, so a
 * relation far wider than estimated is refused once it crosses the cap
 * instead of after every row is in memory.
 *
 * @returns The CSV, including its header line, as `text/csv` bytes.
 */
export async function readRelationCsvWithinCaps(
  options: Readonly<{
    transaction: PostgresQueryRunner;
    schemaName: string;
    tableName: string;
  }>,
): Promise<Blob> {
  const { transaction, schemaName, tableName } = options;
  const relationName = quotePostgresRelationName({
    sql: transaction,
    schemaName,
    tableName,
  });
  const { rowCount, descriptor, columnNames } =
    await _getRelationSizeWithinCaps({ ...options, relationName });

  const encoder = new TextEncoder();
  const headerChunk = encoder.encode(
    PostgresCsv.makeHeaderLineFromColumnNames(columnNames),
  );
  const chunks = [headerChunk];
  let byteCount = headerChunk.byteLength;
  const rowBatches = transaction<Record<string, unknown>>`
    select * from ${relationName}
  `.cursor(CSV_ROWS_PER_BATCH);
  for await (const rows of rowBatches) {
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
