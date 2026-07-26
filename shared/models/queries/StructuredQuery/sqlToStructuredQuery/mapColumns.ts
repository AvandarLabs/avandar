import { Model } from "@models/Model/Model.ts";
import { uuid } from "$/lib/uuid.ts";
import { EMPTY_QUERY_FILTER } from "$/models/queries/StructuredQuery/QueryFilter.types.ts";
import type { DatasetColumnRead } from "$/models/datasets/DatasetColumn/DatasetColumn.types.ts";
import type { QueryAggregationTypeT } from "$/models/queries/QueryAggregationType/QueryAggregationType.types.ts";
import type {
  QueryColumnId,
  QueryColumnRead,
} from "$/models/queries/QueryColumn/QueryColumn.types.ts";
import type {
  PartialStructuredQuery,
  StructuredQueryId,
} from "$/models/queries/StructuredQuery/StructuredQuery.types.ts";
import type { SqlMappingResult } from "$/models/queries/StructuredQuery/sqlToStructuredQuery/sqlToStructuredQuery.types.ts";

/**
 * Make the empty result for the case where we could not produce anything
 * useful from the SQL.
 */
export function makeUnmappedResult(
  reasons: readonly string[],
): SqlMappingResult {
  const query: PartialStructuredQuery = Model.make("StructuredQuery", {
    id: uuid<StructuredQueryId>(),
    version: 1,
    dataSource: undefined,
    queryColumns: [],
    orderByColumn: undefined,
    orderByDirection: undefined,
    aggregations: {},
    filters: EMPTY_QUERY_FILTER,
    having: EMPTY_QUERY_FILTER,
    joins: [],
    offset: undefined,
    limit: undefined,
  } as const);
  return {
    query,
    isFullyMapped: false,
    unmappedReasons: reasons,
  };
}

export function matchColumn(
  columnName: string,
  columns: readonly DatasetColumnRead[],
): DatasetColumnRead | undefined {
  return columns.find((c) => {
    return c.name === columnName || c.originalName === columnName;
  });
}

export function makeQueryColumn(
  baseColumn: DatasetColumnRead,
  aggregation: QueryAggregationTypeT | undefined,
): QueryColumnRead {
  return Model.make("QueryColumn", {
    id: uuid<QueryColumnId>(),
    baseColumn,
    aggregation,
  });
}
