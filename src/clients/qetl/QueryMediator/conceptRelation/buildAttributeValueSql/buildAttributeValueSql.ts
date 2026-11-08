import { quoteSqlIdentifier } from "@avandar/utils/sql";
import { match } from "ts-pattern";
import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import {
  getEntityKeyComparisonSql,
  getRowNumberedViewName,
} from "@/clients/DuckDbClient/duckDbSqlText";
import type { DatasetColumnMapping } from "$/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMapping.types";

/**
 * The alias every subquery reads its dataset rows under. It must stay
 * `dataset`, the alias `getEntityKeyComparisonSql` qualifies the key with.
 */
const DATASET_ALIAS = "dataset";

/**
 * What one attribute's value is read from, and the outer table of record keys
 * it is read for. The concept view passes one per dataset-backed attribute,
 * for example, and Sync passes its label's, so both read values identically.
 */
export type AttributeValueSqlOptions = {
  /** The dataset column that holds the value. */
  selectColumnName: string;
  /** The dataset column that holds each row's record key. */
  primaryKeyColumnName: string;
  datasetId: string;
  /**
   * The type of the dataset column that holds the value. `max` and `min`
   * compare a text column alphabetically instead of by byte order.
   */
  columnDataType: AvaDataType.T;
  /** How one record's rows reduce to one value. Unused for a list. */
  valuePickerRuleType: DatasetColumnMapping["valuePickerRuleType"];
  /** Keep every value, as a list, instead of reducing them to one. */
  isArray: boolean;
  /** The name of the column the subquery emits. */
  outputColumnName: string;
  /** The outer table, by name or alias, holding one row per record key. */
  externalIdsTable: string;
  /** That table's record key column. */
  externalIdColumn: string;
};

/** The quoted pieces every rule's subquery is assembled from. */
type ValueSqlParts = {
  /** The value column, qualified with the dataset alias. */
  value: string;
  /** The key match and the NULL rule, for a `WHERE`. */
  rowFilter: string;
  /** The dataset's public view. */
  datasetView: string;
  /** The dataset's `ava_rows_` view, which exposes `file_row_number`. */
  rowsView: string;
};

/**
 * The `SELECT` that picks a text column's last or first value alphabetically.
 *
 * The comparison key ignores case and accents (`lower(strip_accents(value))`),
 * and the row that wins gives back its original value. Values that share a key
 * ("apple" and "Apple") tie-break by the value itself in byte order, in the
 * same direction, so the pick never depends on scan order.
 */
function _buildTextExtremeSql(
  options: Readonly<{
    parts: ValueSqlParts;
    direction: "ASC" | "DESC";
  }>,
): string {
  const { value, rowFilter, datasetView } = options.parts;
  const key = `lower(strip_accents(${value}))`;
  return `SELECT ${value} FROM ${datasetView} ${DATASET_ALIAS} WHERE ${rowFilter} ORDER BY ${key} ${options.direction}, ${value} ${options.direction} LIMIT 1`;
}

/**
 * The `SELECT` that reduces one record's non-NULL rows to its value.
 *
 * Each rule passes its aggregate in the rule's output type
 * (`ValuePickerRule.getOutputDataType`). COUNT is already BIGINT, and is 0,
 * not NULL, over no rows. MAX and MIN keep the column's type, so dates, times,
 * and text work as well as numbers. Text compares alphabetically, ignoring
 * case and accents, so '10' sorts before '9' and 'Ángel' before 'Zebra'. It
 * still returns the original value.
 */
function _buildReducedValueSql(
  options: Readonly<{
    parts: ValueSqlParts;
    valuePickerRuleType: DatasetColumnMapping["valuePickerRuleType"];
    columnDataType: AvaDataType.T;
  }>,
): string {
  const { value, rowFilter, datasetView, rowsView } = options.parts;
  const isText = AvaDataType.isText(options.columnDataType);
  const aggregateSql = (aggregateExpression: string): string => {
    return `SELECT ${aggregateExpression} FROM ${datasetView} ${DATASET_ALIAS} WHERE ${rowFilter}`;
  };
  return match(options.valuePickerRuleType)
    .with("first", () => {
      // `file_row_number` is unique within a file, so this is a total order.
      // Do not use `row_number() OVER ()`: parallel scan order is unstable.
      return `SELECT ${value} FROM ${rowsView} ${DATASET_ALIAS} WHERE ${rowFilter} ORDER BY ${DATASET_ALIAS}.file_row_number LIMIT 1`;
    })
    .with("most_frequent", () => {
      // The value tie-break makes a tie on COUNT(*) deterministic.
      return `SELECT ${value} FROM ${datasetView} ${DATASET_ALIAS} WHERE ${rowFilter} GROUP BY ${value} ORDER BY COUNT(*) DESC, ${value} LIMIT 1`;
    })
    .with("sum", () => {
      return aggregateSql(`CAST(SUM(${value}) AS DOUBLE)`);
    })
    .with("avg", () => {
      return aggregateSql(`CAST(AVG(${value}) AS DOUBLE)`);
    })
    .with("count", () => {
      return aggregateSql(`COUNT(${value})`);
    })
    .with("max", () => {
      return isText
        ? _buildTextExtremeSql({ parts: options.parts, direction: "DESC" })
        : aggregateSql(`MAX(${value})`);
    })
    .with("min", () => {
      return isText
        ? _buildTextExtremeSql({ parts: options.parts, direction: "ASC" })
        : aggregateSql(`MIN(${value})`);
    })
    .exhaustive();
}

/**
 * Builds the correlated subquery that reads one attribute's value for the
 * outer row's record key, aliased to `outputColumnName`.
 *
 * Every rule reads only non-NULL cells, because NULL means "no value". Use it
 * wherever a dataset-column mapping becomes a value, for example a column of
 * a concept's view or the name Sync stages for each record.
 */
export function buildAttributeValueSql(
  options: Readonly<AttributeValueSqlOptions>,
): string {
  // Qualified, so a value column named like an outer column (`status`) can
  // never bind to the outer row.
  const value = `${DATASET_ALIAS}.${quoteSqlIdentifier(options.selectColumnName)}`;
  const keyComparison = getEntityKeyComparisonSql({
    externalIdsTable: options.externalIdsTable,
    externalIdColumn: options.externalIdColumn,
    primaryKeyColumnName: options.primaryKeyColumnName,
  });
  const parts: ValueSqlParts = {
    value,
    // The aggregates skip NULL on their own. `first`, `most_frequent`, and
    // lists need the filter, and applying it to every rule keeps the rule in
    // one place.
    rowFilter: `${keyComparison} AND ${value} IS NOT NULL`,
    datasetView: quoteSqlIdentifier(options.datasetId),
    rowsView: quoteSqlIdentifier(getRowNumberedViewName(options.datasetId)),
  };
  // `list()` over no rows is NULL. A record with no values gets an empty
  // list, which reads as "none" rather than "unknown".
  const body = options.isArray
    ? `SELECT COALESCE(list(${value} ORDER BY ${DATASET_ALIAS}.file_row_number), []) FROM ${parts.rowsView} ${DATASET_ALIAS} WHERE ${parts.rowFilter}`
    : _buildReducedValueSql({
        parts,
        valuePickerRuleType: options.valuePickerRuleType,
        columnDataType: options.columnDataType,
      });
  return `(${body}) AS ${quoteSqlIdentifier(options.outputColumnName)}`;
}
