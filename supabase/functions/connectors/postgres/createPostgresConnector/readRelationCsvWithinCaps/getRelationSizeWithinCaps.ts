import { camelCaseKeysShallow, makeIdLookupMap } from "@avandar/utils";
import { ConnectorError } from "@sbfn/connectors/Connector.ts";
import { assertWithinPostgresCallCaps } from "@sbfn/connectors/postgres/createPostgresConnector/readRelationCsvWithinCaps/assertWithinPostgresCallCaps.ts";
import { GlobalAppConfig } from "$/config/GlobalAppConfig.ts";
import {
  POSTGRES_MAX_BYTES_PER_ACQUIRE,
  PostgresCsvEstimate,
} from "$/connectors/postgres/PostgresCsvEstimate/PostgresCsvEstimate.ts";
import type { ColumnSizeInfo } from "$/connectors/postgres/PostgresCsvEstimate/PostgresCsvEstimate.ts";
import type { PostgresTableDataset } from "$/models/datasets/PostgresTableDataset/PostgresTableDataset.ts";
import type { RelationRowDescriptor } from "$/models/relations/RelationCapabilities/RelationCapabilities.types.ts";
import type { PostgresQueryRunner } from "@sbfn/connectors/postgres/PostgresSql.types.ts";

/** A relation to measure before any of its rows are read. */
type RelationToMeasure = {
  transaction: PostgresQueryRunner;
  schemaName: string;
  tableName: string;
  relationKind: PostgresTableDataset.RelationKind;

  /** The only columns the read selects. */
  columnNames: readonly string[];

  /** The quoted relation name fragment the size queries interpolate. */
  relationName: unknown;
};

/** A relation's measured size, before any of its rows are read. */
export type RelationSize = {
  /** The row count the size check used: exact, or the planner's estimate. */
  rowCount: number;
  descriptor: RelationRowDescriptor;
};

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
  options: Readonly<RelationToMeasure>,
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
 * The planner's estimate of how many rows a relation has: what `EXPLAIN`
 * expects reading all of it to return. For a table it scales the row density
 * last measured by `ANALYZE` to the table's current size on disk, and it
 * works for a view as well.
 */
async function _getPlannedRowCount(
  options: Readonly<{
    transaction: PostgresQueryRunner;
    relationName: unknown;
  }>,
): Promise<number> {
  const [planRow] = await options.transaction<{
    "QUERY PLAN": Array<{ Plan: { "Plan Rows": number } }>;
  }>`
    explain (format json) select 1 from ${options.relationName}
  `;
  return Math.round(planRow?.["QUERY PLAN"][0]?.Plan["Plan Rows"] ?? 0);
}

/**
 * The row count the size check before a read uses, and whether it is exact.
 * The planner's estimate decides when it puts the relation well within the
 * cap, or a table far over it. Anywhere between, and for a view the planner
 * estimates over the cap, the rows are counted exactly, so a stale or
 * guessed estimate never refuses a relation that fits.
 */
async function _getRowCountForSizeCheck(
  options: Readonly<
    RelationToMeasure & { plannedRowCount: number; estimatedRowBytes: number }
  >,
): Promise<{ rowCount: number; isExact: boolean }> {
  const { trustBelowCapFraction, trustAboveCapMultiple } =
    GlobalAppConfig.postgresConnector.rowCountEstimate;
  const plannedBytes = options.plannedRowCount * options.estimatedRowBytes;
  // A view's estimate rests on guessed selectivities, which can be off by far
  // more than a table's, so it never refuses a view on its own.
  const isEstimateDecisive =
    plannedBytes <= POSTGRES_MAX_BYTES_PER_ACQUIRE * trustBelowCapFraction ||
    (options.relationKind === "table" &&
      plannedBytes > POSTGRES_MAX_BYTES_PER_ACQUIRE * trustAboveCapMultiple);
  if (isEstimateDecisive) {
    return { rowCount: options.plannedRowCount, isExact: false };
  }
  // `count(*)` is a `bigint`, which the driver returns as a string. Casting
  // it to `int` instead would fail outright past 2^31 rows rather than
  // reporting the table as too large.
  const [countRow] = await options.transaction<{
    exact_count: string | number;
  }>`
    select count(*) as exact_count
    from ${options.relationName}
  `;
  return { rowCount: Number(countRow?.exact_count ?? 0), isExact: true };
}

/**
 * Measures a relation without reading a row, from a row count (see
 * `_getRowCountForSizeCheck`) and an estimated row width (see
 * `PostgresCsvEstimate.ts`), and refuses it as `too_large` if that estimate
 * is already over the caps.
 */
export async function getRelationSizeWithinCaps(
  options: Readonly<RelationToMeasure>,
): Promise<RelationSize> {
  const { schemaName, tableName } = options;
  const plannedRowCount = await _getPlannedRowCount(options);
  const columns = await _getReadColumnSizeInfo(options);
  const descriptor = {
    columnCount: columns.length,
    estimatedRowBytes: PostgresCsvEstimate.estimateRowCsvBytes(columns),
  };
  const { rowCount, isExact } = await _getRowCountForSizeCheck({
    ...options,
    plannedRowCount,
    estimatedRowBytes: descriptor.estimatedRowBytes,
  });
  const estimatedBytes = PostgresCsvEstimate.estimateRelationCsvBytes({
    columns,
    rowCount,
  });
  const rowCountSource = isExact ? "" : " by the planner's estimate";
  assertWithinPostgresCallCaps({
    rowCount,
    byteCount: estimatedBytes,
    descriptor,
    message: `'${schemaName}.${tableName}' is estimated at ~${estimatedBytes} bytes as CSV (${rowCount} rows${rowCountSource}), over the ${POSTGRES_MAX_BYTES_PER_ACQUIRE}-byte limit for a single acquisition`,
  });
  return { rowCount, descriptor };
}
