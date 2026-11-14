import { makeBucketMap } from "@avandar/utils";
import { quoteSqlIdentifier, quoteSqlLiteral } from "@avandar/utils/sql";
import { ColumnProfile } from "$/models/dataDictionaries/ColumnProfile/ColumnProfile";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

/** A dataset column to profile: its queryable name and its type. */
export type ProfiledColumn = { name: string; dataType: AvaDataType.T };

/** The summary query's one row: counts and ranges keyed by column index. */
export type ColumnSummaryRow = Record<string, unknown>;

/** One row of the values query: one value of one column, and its rows. */
export type ColumnValueRow = {
  column_index: unknown;
  value: unknown;
  row_count: unknown;
};

/** Types whose values are listed. Dates and times are never coded. */
const LISTABLE_TYPES: ReadonlySet<AvaDataType.T> = new Set([
  "bigint",
  "double",
  "varchar",
  "boolean",
]);

/** Approximate distinct counts can be a few off, so list a little past 50. */
const APPROXIMATE_COUNT_MARGIN = 10;

/**
 * The date formats a text column's values are tried against. ISO comes
 * first, then US before day-first, so a column whose every value reads
 * both ways (`01/02/2026`) reads as US.
 */
const DATE_FORMATS = [
  "%Y-%m-%d",
  "%m/%d/%Y",
  "%d/%m/%Y",
  "%Y/%m/%d",
  "%m-%d-%Y",
  "%d-%m-%Y",
] as const;

/** `DATE_FORMATS` as a DuckDB list, for `try_strptime` with any format. */
const DATE_FORMATS_SQL = `[${DATE_FORMATS.map(quoteSqlLiteral).join(", ")}]`;

/**
 * How many rows the date check reads. Trying six formats on every row of a
 * large text column is the slowest part of profiling, and a share of dates
 * does not need every row.
 */
const DATE_SAMPLE_ROWS = 10_000;

/**
 * Fixes which rows the date sample takes, so profiling the same dataset
 * twice gives the same date share.
 */
const DATE_SAMPLE_SEED = 42;

/**
 * A repeatable sample of a relation's rows, the ones date checks read. The
 * relation is given as SQL, already quoted.
 */
function buildDateSampleSql(relationSql: string): string {
  return `SELECT * FROM ${relationSql} USING SAMPLE reservoir(${DATE_SAMPLE_ROWS} ROWS) REPEATABLE (${DATE_SAMPLE_SEED})`;
}

function _buildSummaryParts(column: ProfiledColumn, index: number): string[] {
  const name = quoteSqlIdentifier(column.name);
  const parts = [
    `count(${name}) AS "non_null_${index}"`,
    `approx_count_distinct(${name}) AS "distinct_${index}"`,
  ];
  if (column.dataType === "bigint" || column.dataType === "double") {
    parts.push(
      `CAST(min(${name}) AS DOUBLE) AS "min_${index}"`,
      `CAST(max(${name}) AS DOUBLE) AS "max_${index}"`,
    );
  }
  return parts;
}

/** The date aggregates of one text column, read from the sample. */
function _buildSampleParts(column: ProfiledColumn, index: number): string[] {
  if (column.dataType !== "varchar") {
    return [];
  }
  const name = quoteSqlIdentifier(column.name);
  return [
    `count(${name}) AS "sampled_${index}"`,
    `count(try_strptime(${name}, ${DATE_FORMATS_SQL})) AS "dates_${index}"`,
  ];
}

function buildSummarySql(
  options: Readonly<{
    datasetId: Dataset.Id;
    /** The relation to read. Defaults to the dataset's own view. */
    relationName?: string;
    columns: readonly ProfiledColumn[];
  }>,
): string {
  const table = quoteSqlIdentifier(options.relationName ?? options.datasetId);
  const exactParts = [
    'count(*) AS "row_count"',
    ...options.columns.flatMap(_buildSummaryParts),
  ];
  const exactSql = `SELECT ${exactParts.join(", ")} FROM ${table}`;
  const sampleParts = options.columns.flatMap(_buildSampleParts);
  if (sampleParts.length === 0) {
    return exactSql;
  }
  // The counts, distinct counts, and ranges read every row. Only the date
  // aggregates read the sample, joined onto the one exact row.
  return [
    `WITH "sample" AS (${buildDateSampleSql(table)})`,
    `SELECT * FROM (${exactSql}) CROSS JOIN (SELECT ${sampleParts.join(", ")} FROM "sample")`,
  ].join(" ");
}

function buildValuesSql(
  options: Readonly<{
    datasetId: Dataset.Id;
    /** The relation to read. Defaults to the dataset's own view. */
    relationName?: string;
    columns: ReadonlyArray<{ index: number; name: string }>;
  }>,
): string {
  const table = quoteSqlIdentifier(options.relationName ?? options.datasetId);
  const selects = options.columns.map(({ index, name }) => {
    const column = quoteSqlIdentifier(name);
    const text = `trim(CAST(${column} AS VARCHAR))`;
    return `SELECT ${index} AS "column_index", ${text} AS "value", count(*) AS "row_count" FROM ${table} WHERE ${column} IS NOT NULL AND ${text} <> '' GROUP BY 2`;
  });
  const limit = ColumnProfile.MAX_LISTED_VALUES + 1;
  return [
    `SELECT "column_index", "value", "row_count" FROM (${selects.join(" UNION ALL ")})`,
    `QUALIFY row_number() OVER (PARTITION BY "column_index" ORDER BY "row_count" DESC, "value") <= ${limit}`,
    `ORDER BY "column_index", "row_count" DESC, "value"`,
  ].join(" ");
}

function _toNumber(value: unknown): number {
  if (typeof value === "bigint") {
    return Number(value);
  }
  return typeof value === "number" ? value : Number(value ?? 0);
}

function _toOptionalNumber(value: unknown): number | undefined {
  return value === null || value === undefined ? undefined : _toNumber(value);
}

/** The share of a text column's sampled values that read as dates. */
function _getDateShare(
  summaryRow: ColumnSummaryRow,
  index: number,
): number | undefined {
  const dates = _toOptionalNumber(summaryRow[`dates_${index}`]);
  const sampledCount = _toNumber(summaryRow[`sampled_${index}`]);
  return dates === undefined || sampledCount === 0
    ? undefined
    : dates / sampledCount;
}

function getListedColumnIndexes(
  options: Readonly<{
    columns: readonly ProfiledColumn[];
    summaryRow: ColumnSummaryRow;
  }>,
): Set<number> {
  const limit = ColumnProfile.MAX_LISTED_VALUES + APPROXIMATE_COUNT_MARGIN;
  const indexes = options.columns.flatMap((column, index) => {
    const distinct = _toNumber(options.summaryRow[`distinct_${index}`]);
    const isShort = distinct > 0 && distinct <= limit;
    return LISTABLE_TYPES.has(column.dataType) && isShort ? [index] : [];
  });
  return new Set(indexes);
}

function makeColumnProfilesFromRows(
  options: Readonly<{
    dataset: Readonly<{ id: Dataset.Id; name: string }>;
    columns: readonly ProfiledColumn[];
    summaryRow: ColumnSummaryRow;
    valueRows: readonly ColumnValueRow[];
    listedColumnIndexes: ReadonlySet<number>;
  }>,
): ColumnProfile.T[] {
  const { dataset, summaryRow } = options;
  const rowsByIndex = makeBucketMap(options.valueRows, {
    keyFn: (row) => {
      return _toNumber(row.column_index);
    },
  });
  return options.columns.map((column, index): ColumnProfile.T => {
    const listed = (rowsByIndex.get(index) ?? []).map((row) => {
      return { value: String(row.value), rowCount: _toNumber(row.row_count) };
    });
    const values =
      options.listedColumnIndexes.has(index) &&
      listed.length <= ColumnProfile.MAX_LISTED_VALUES
        ? listed
        : undefined;
    const nonNullCount = _toNumber(summaryRow[`non_null_${index}`]);
    const min = _toOptionalNumber(summaryRow[`min_${index}`]);
    const max = _toOptionalNumber(summaryRow[`max_${index}`]);
    return {
      datasetId: dataset.id,
      datasetName: dataset.name,
      columnName: column.name,
      dataType: column.dataType,
      rowCount: _toNumber(summaryRow.row_count),
      nonNullCount,
      distinctCount: values
        ? values.length
        : _toNumber(summaryRow[`distinct_${index}`]),
      values,
      dateShare: _getDateShare(summaryRow, index),
      numberRange:
        min === undefined || max === undefined ? undefined : { min, max },
    };
  });
}

/**
 * The DuckDB SQL that profiles a dataset's columns, and the step that turns
 * its rows into `ColumnProfile`s. Two queries per dataset: a summary (rows,
 * values, approximate distinct counts, number ranges, and the share of text
 * values that read as dates, taken from a sample of rows), then the values
 * and row counts of every column short enough to be coded. Used by
 * `profileDatasetColumns`.
 */
export const ColumnProfileSql = {
  /** The date formats text columns are tried against, most likely first. */
  DATE_FORMATS,

  /** A repeatable sample of a relation's rows, for date checks. */
  buildDateSampleSql,

  /** One query for every column's counts and ranges. */
  buildSummarySql,

  /** One query for the values of the given columns, at most 51 each. */
  buildValuesSql,

  /** The columns whose values are worth listing, from the summary row. */
  getListedColumnIndexes,

  /** The profiles the two queries' rows describe. */
  makeColumnProfilesFromRows,
};
