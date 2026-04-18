import { constant } from "@utils/misc/constant/constant.ts";
import { match } from "ts-pattern";
import type {
  DuckDBQueryAggregationTypeT,
  QueryAggregationTypeT,
} from "$/models/queries/QueryAggregationType/QueryAggregationType.types.ts";

export const DuckDBQueryAggregations = {
  /**
   * The name to use for a column with an aggregation applied to it.
   * @param aggregation - The aggregation type to get the column name for.
   * @param columnName - The name of the column to aggregate
   * @returns The name of the aggregation column.
   */
  getAggregationColumnName: (
    aggregation: DuckDBQueryAggregationTypeT,
    columnName: string,
  ): string => {
    return match(aggregation)
      .with("sum", constant(`sum(${columnName})`))
      .with("avg", constant(`avg(${columnName})`))
      .with("count", constant(`count(${columnName})`))
      .with("max", constant(`max(${columnName})`))
      .with("min", constant(`min(${columnName})`))
      .exhaustive(() => {
        throw new Error(`Invalid DuckDBQueryAggregationType: "${aggregation}"`);
      });
  },
};

export const QueryAggregationTypeModule = {
  getAggregationColumnName: (
    aggregation: QueryAggregationTypeT,
    columnName: string,
  ): string => {
    return match(aggregation)
      .with("sum", "avg", "count", "max", "min", (duckDBAggregation) => {
        return DuckDBQueryAggregations.getAggregationColumnName(
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
