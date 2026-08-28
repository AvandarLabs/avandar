import { constant } from "@avandar/utils";
import { match } from "ts-pattern";
import { QUERY_AGGREGATION_TYPES } from "$/models/queries/QueryAggregationType/QueryAggregationType.types.ts";
import type {
  DuckDbQueryAggregationTypeT,
  QueryAggregationTypeT,
} from "$/models/queries/QueryAggregationType/QueryAggregationType.types.ts";

export const DuckDbQueryAggregations = {
  /**
   * The name to use for a column with an aggregation applied to it.
   * @param aggregation - The aggregation type to get the column name for.
   * @param columnName - The name of the column to aggregate
   * @returns The name of the aggregation column.
   */
  getAggregationColumnName: (
    aggregation: DuckDbQueryAggregationTypeT,
    columnName: string,
  ): string => {
    return match(aggregation)
      .with("sum", constant(`sum(${columnName})`))
      .with("avg", constant(`avg(${columnName})`))
      .with("count", constant(`count(${columnName})`))
      .with("max", constant(`max(${columnName})`))
      .with("min", constant(`min(${columnName})`))
      .exhaustive(() => {
        throw new Error(`Invalid DuckDbQueryAggregationType: "${aggregation}"`);
      });
  },
};

export const QueryAggregationTypeModule = {
  /** All valid aggregation values. */
  values: QUERY_AGGREGATION_TYPES,

  /** Type guard checking whether a string is a valid aggregation. */
  isValid: (value: string): value is QueryAggregationTypeT => {
    return (QUERY_AGGREGATION_TYPES as readonly string[]).includes(value);
  },

  getAggregationColumnName: (
    aggregation: QueryAggregationTypeT,
    columnName: string,
  ): string => {
    return match(aggregation)
      .with("sum", "avg", "count", "max", "min", (duckDBAggregation) => {
        return DuckDbQueryAggregations.getAggregationColumnName(
          duckDBAggregation,
          columnName,
        );
      })
      .with("group_by", "none", constant(columnName))
      .exhaustive(() => {
        throw new Error(`Invalid QueryAggregationType: "${aggregation}"`);
      });
  },
};
