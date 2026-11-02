import { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";
import type { PartialStructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery.types";

/** Default LIMIT shown for a brand-new manual query. */
export const DEFAULT_MANUAL_QUERY_LIMIT = 100;

/** Row count above which we auto-apply a LIMIT when picking a dataset. */
export const LARGE_DATASET_ROW_THRESHOLD = 50_000;

/** LIMIT applied when a large dataset is selected without filters. */
export const LARGE_DATASET_AUTO_LIMIT = DEFAULT_MANUAL_QUERY_LIMIT;

/**
 * True when the structured query applies GROUP BY or non-trivial aggregates.
 */
export function hasStructuredQueryAggregations(
  query: PartialStructuredQuery,
): boolean {
  return Object.values(query.aggregations).some((aggregation) => {
    return aggregation !== undefined && aggregation !== "none";
  });
}

/**
 * Returns `true` when the structured query is still blank and the manual form
 * should show the default LIMIT instead of an empty field.
 */
export function shouldDefaultManualQueryLimit(
  query: PartialStructuredQuery,
): boolean {
  return (
    query.limit === undefined &&
    query.offset === undefined &&
    query.dataSource === undefined &&
    query.nestedSubquery === undefined &&
    query.queryColumns.length === 0 &&
    query.orderByColumn === undefined &&
    query.orderByDirection === undefined &&
    !hasStructuredQueryAggregations(query) &&
    StructuredQuery.isEmptyFilter(query.filters) &&
    StructuredQuery.isEmptyFilter(query.having) &&
    query.joins.length === 0
  );
}

/**
 * Returns the LIMIT value the manual form should render for the current query.
 */
export function getManualQueryLimitValue(
  query: PartialStructuredQuery,
): number | undefined {
  if (query.limit !== undefined) {
    return query.limit;
  }
  return shouldDefaultManualQueryLimit(query)
    ? DEFAULT_MANUAL_QUERY_LIMIT
    : undefined;
}

/**
 * True when we should resolve dataset row count before running the structured
 * query (no limit, filters, HAVING, or aggregations / group-bys).
 */
export function shouldAutoLimitLargeDataset(
  query: PartialStructuredQuery,
): boolean {
  return (
    query.limit === undefined &&
    StructuredQuery.isEmptyFilter(query.filters) &&
    StructuredQuery.isEmptyFilter(query.having) &&
    !hasStructuredQueryAggregations(query)
  );
}

/**
 * Applies the default manual-query LIMIT to an otherwise empty query.
 */
export function applyDefaultManualQueryLimit(
  query: PartialStructuredQuery,
): PartialStructuredQuery {
  const limit = getManualQueryLimitValue(query);
  if (limit === undefined || query.limit === limit) {
    return query;
  }
  return { ...query, limit };
}

/**
 * LIMIT to apply after a large-dataset row count, or `undefined` when the
 * dataset is below {@link LARGE_DATASET_ROW_THRESHOLD}.
 */
export function largeDatasetAutoLimitFromRowCount(
  rowCount: number,
): number | undefined {
  return rowCount > LARGE_DATASET_ROW_THRESHOLD
    ? LARGE_DATASET_AUTO_LIMIT
    : undefined;
}
