import { constant } from "$/lib/utils/constant/constant";
import { match } from "ts-pattern";
import { DuckDBQueryAggregations } from "@/clients/DuckDBClient/DuckDBQueryAggregations";
import { QueryAggregationType } from "./QueryAggregationType.types";

export const QueryAggregationTypes = {
  getAggregationColumnName: (
    aggregation: QueryAggregationType,
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
