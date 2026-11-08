import { quoteSqlIdentifier } from "@avandar/utils/sql";
import { match } from "ts-pattern";
import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import {
  getEntityKeyComparisonSql,
  getRowNumberedViewName,
} from "@/clients/DuckDbClient/duckDbSqlText";
import {
  DATASET_ALIAS,
  buildTextExtremeSql,
} from "@/clients/qetl/QueryMediator/conceptRelation/buildAttributeValueSql/buildAttributeValueSql";
import type { DuckDbDataType } from "$/models/datasets/DatasetColumn/DuckDbDataTypes";
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";
import type { ValuePickerRule } from "$/models/ontology/ValuePickerRule/ValuePickerRule";

/** Everything one per-period field's value subquery reads. */
export type BucketedListValueSqlOptions = Readonly<{
  datasetId: string;
  /** The dataset column whose values are reduced per period. */
  selectColumnName: string;
  /**
   * The type of that column. `max` and `min` compare a text column
   * alphabetically instead of by byte order.
   */
  columnDataType: AvaDataType.T;
  /** The dataset column holding the record key. */
  primaryKeyColumnName: string;
  /** The date or timestamp column that places each row in a period. */
  bucketColumnName: string;
  bucketGrain: ConceptAttribute.BucketGrain;
  ruleType: ValuePickerRule.T;
  /** The outer table carrying the record keys, and its key column. */
  externalIdsTable: string;
  externalIdColumn: string;
}>;

/**
 * The DuckDB `date_trunc` part for each period. An exhaustive record, so a
 * period reaches SQL only as one of these five literals.
 */
const DATE_TRUNC_PART_BY_GRAIN: Readonly<
  Record<ConceptAttribute.BucketGrain, string>
> = {
  day: "day",
  week: "week",
  month: "month",
  quarter: "quarter",
  year: "year",
};

/** The alias a period's source rows are read under. */
const SOURCE_ALIAS = "source_rows";

/**
 * One record's rows of the field's dataset as `bucket, value, row_order`.
 *
 * The NULL rule lives here and only here: a row whose value or date is NULL
 * never reaches a rule, so a period exists only when it has a non-NULL value.
 * `row_order` is `file_row_number`, a total order within a dataset, which is
 * what makes `first` deterministic.
 */
function _buildSourceRowsSql(options: BucketedListValueSqlOptions): string {
  const valueColumn = `${DATASET_ALIAS}.${quoteSqlIdentifier(options.selectColumnName)}`;
  const bucketColumn = `${DATASET_ALIAS}.${quoteSqlIdentifier(options.bucketColumnName)}`;
  const datePart = DATE_TRUNC_PART_BY_GRAIN[options.bucketGrain];
  const keyComparison = getEntityKeyComparisonSql({
    externalIdsTable: options.externalIdsTable,
    externalIdColumn: options.externalIdColumn,
    primaryKeyColumnName: options.primaryKeyColumnName,
  });
  const rowsView = quoteSqlIdentifier(
    getRowNumberedViewName(options.datasetId),
  );
  return `SELECT
          CAST(date_trunc('${datePart}', ${bucketColumn}) AS DATE) AS bucket,
          ${valueColumn} AS value,
          ${DATASET_ALIAS}.file_row_number AS row_order
        FROM ${rowsView} ${DATASET_ALIAS}
        WHERE ${keyComparison}
          AND ${valueColumn} IS NOT NULL
          AND ${bucketColumn} IS NOT NULL`;
}

/**
 * The aggregate that reduces one period's values under `ruleType`, for every
 * rule but `most_frequent`. The casts match the single-value rules: `sum` and
 * `avg` are `DOUBLE`, `count` is `BIGINT`, and `max` and `min` keep the
 * column's type, comparing text alphabetically like the single-value rule.
 */
function _buildAggregateSql(
  options: Readonly<{
    ruleType: Exclude<ValuePickerRule.T, "most_frequent">;
    columnDataType: AvaDataType.T;
  }>,
): string {
  const value = `${SOURCE_ALIAS}.value`;
  const isText = AvaDataType.isText(options.columnDataType);
  return match(options.ruleType)
    .with("first", () => {
      return `first(${value} ORDER BY ${SOURCE_ALIAS}.row_order)`;
    })
    .with("sum", () => {
      return `CAST(SUM(${value}) AS DOUBLE)`;
    })
    .with("avg", () => {
      return `CAST(AVG(${value}) AS DOUBLE)`;
    })
    .with("count", () => {
      return `COUNT(${value})`;
    })
    .with("max", () => {
      return isText
        ? buildTextExtremeSql({ value, aggregate: "arg_max" })
        : `MAX(${value})`;
    })
    .with("min", () => {
      return isText
        ? buildTextExtremeSql({ value, aggregate: "arg_min" })
        : `MIN(${value})`;
    })
    .exhaustive();
}

/**
 * One row per period, `bucket, value`, with the field's rule applied to the
 * period's rows. `most_frequent` counts each value first, then breaks a tie
 * in count by value, exactly as the single-value rule does.
 */
function _buildPerBucketValuesSql(
  options: Readonly<{
    ruleType: ValuePickerRule.T;
    columnDataType: AvaDataType.T;
    sourceRowsSql: string;
  }>,
): string {
  const { sourceRowsSql } = options;
  if (options.ruleType === "most_frequent") {
    return `SELECT
          counted.bucket AS bucket,
          first(counted.value ORDER BY counted.frequency DESC, counted.value) AS value
        FROM (
          SELECT
            ${SOURCE_ALIAS}.bucket AS bucket,
            ${SOURCE_ALIAS}.value AS value,
            COUNT(*) AS frequency
          FROM (${sourceRowsSql}) ${SOURCE_ALIAS}
          GROUP BY ${SOURCE_ALIAS}.bucket, ${SOURCE_ALIAS}.value
        ) counted
        GROUP BY counted.bucket`;
  }
  const aggregateSql = _buildAggregateSql({
    ruleType: options.ruleType,
    columnDataType: options.columnDataType,
  });
  return `SELECT
          ${SOURCE_ALIAS}.bucket AS bucket,
          ${aggregateSql} AS value
        FROM (${sourceRowsSql}) ${SOURCE_ALIAS}
        GROUP BY ${SOURCE_ALIAS}.bucket`;
}

/**
 * Builds the correlated subquery that is one per-period field's value in the
 * concept view: a list of `{ bucket, value }`, one per period that has a
 * non-NULL value, ordered by period, and `[]` when there is none. `bucket` is
 * the period's first day (`date_trunc`, so weeks start on Monday).
 *
 * Returns the parenthesized subquery without an alias, and the caller names
 * the column. The outer query must have the record keys in
 * `externalIdsTable.externalIdColumn`, as the concept view's spine does.
 */
export function buildBucketedListValueSql(
  options: BucketedListValueSqlOptions,
): string {
  const perBucketSql = _buildPerBucketValuesSql({
    ruleType: options.ruleType,
    columnDataType: options.columnDataType,
    sourceRowsSql: _buildSourceRowsSql(options),
  });
  return `(
        SELECT COALESCE(
          list(
            struct_pack(bucket := per_bucket.bucket, value := per_bucket.value)
            ORDER BY per_bucket.bucket
          ),
          []
        )
        FROM (${perBucketSql}) per_bucket
      )`;
}

/**
 * The DuckDB type of a per-period field whose values have `valueType`, for
 * casting a NULL when the field has nothing to read. For example, the
 * concept view's typed NULL column for an unmapped per-period field.
 */
export function buildBucketedListTypeSql(valueType: DuckDbDataType): string {
  return `STRUCT("bucket" DATE, "value" ${valueType})[]`;
}
