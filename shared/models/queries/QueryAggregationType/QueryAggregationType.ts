/* eslint-disable @typescript-eslint/no-namespace,import-x/export */
import type {
  DuckDBQueryAggregationTypeT,
  QueryAggregationTypeT,
} from "$/models/queries/QueryAggregationType/QueryAggregationType.types.ts";

export { DuckDBQueryAggregations } from "$/models/queries/QueryAggregationType/QueryAggregationTypeModule.ts";
export { QueryAggregationTypeModule as QueryAggregationType } from "$/models/queries/QueryAggregationType/QueryAggregationTypeModule.ts";

export namespace QueryAggregationType {
  export type T = QueryAggregationTypeT;
  export type DuckDBQueryAggregationType = DuckDBQueryAggregationTypeT;
}
