/* eslint-disable @typescript-eslint/no-namespace,import-x/export */
import type {
  DuckDbQueryAggregationTypeT,
  QueryAggregationTypeT,
} from "$/models/queries/QueryAggregationType/QueryAggregationType.types.ts";

export { DuckDbQueryAggregations as DuckDBQueryAggregations } from "$/models/queries/QueryAggregationType/QueryAggregationTypeModule.ts";
export { QueryAggregationTypeModule as QueryAggregationType } from "$/models/queries/QueryAggregationType/QueryAggregationTypeModule.ts";

export namespace QueryAggregationType {
  export type T = QueryAggregationTypeT;
  export type DuckDBQueryAggregationType = DuckDbQueryAggregationTypeT;
}
