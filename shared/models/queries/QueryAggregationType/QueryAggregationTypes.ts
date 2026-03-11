import { constant } from "@utils/misc/constant/constant.ts";
import { match } from "ts-pattern";
import { DuckDBQueryAggregations } from "../../../../src/clients/DuckDBClient/DuckDBQueryAggregations.ts";
import type { QueryAggregationType } from "./QueryAggregationType.types.ts";

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
