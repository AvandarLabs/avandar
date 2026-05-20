import { isEmptyQueryFilter } from "$/models/queries/StructuredQuery/QueryFilter.types";
import type { PartialStructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery.types";

/** Default LIMIT shown for a brand-new manual query. */
export const DEFAULT_MANUAL_QUERY_LIMIT = 100;

function _hasNonDefaultAggregation(query: PartialStructuredQuery): boolean {
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
    !_hasNonDefaultAggregation(query) &&
    isEmptyQueryFilter(query.filters) &&
    isEmptyQueryFilter(query.having) &&
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
  return shouldDefaultManualQueryLimit(query) ?
      DEFAULT_MANUAL_QUERY_LIMIT
    : undefined;
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
