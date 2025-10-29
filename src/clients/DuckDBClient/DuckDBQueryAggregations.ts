import { match } from "ts-pattern";
import { DuckDBQueryAggregationType } from "./DuckDBClient.types";
import { constant } from "@/lib/utils/higherOrderFuncs";

export const DuckDBQueryAggregations = {
  /**
   * The name to use for a column with an aggregation applied to it.
   * @param aggregation - The aggregation type to get the column name for.
   * @param columnName - The name of the column to aggregate
   * @returns The name of the aggregation column.
   */
  getAggregationColumnName: (
    aggregation: DuckDBQueryAggregationType,
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
