import { PartialStructuredQuery } from "./StructuredQuery.types";
import { EntityFieldConfig } from "@/models/EntityConfig/EntityFieldConfig/EntityFieldConfig.types";
import { QueryAggregationType } from "../QueryAggregationType";
import { DatasetColumn } from "@/models/datasets/DatasetColumn";
import { match } from "ts-pattern";

export type QueryColumn = {
  sourceColumn: DatasetColumn;
  columnType: "DatasetColumn";
  aggregation: QueryAggregationType | undefined;
} | {
  sourceColumn: EntityFieldConfig;
  columnType: "EntityFieldConfig";
  aggregation: QueryAggregationType | undefined;
};

export const StructuredQueryUtils = {
  /**
   * Get the column names from a structured query.
   */
  getQueryColumns: (structuredQuery: PartialStructuredQuery): QueryColumn[] => {
    const { queryColumns, aggregations } = structuredQuery;
    return queryColumns.map((col): QueryColumn => {
      return match(col).with(
        { type: "DatasetColumn" },
        ({ column }): QueryColumn => {
          return {
            sourceColumn: column,
            columnType: "DatasetColumn" as const,
            aggregation: aggregations[column.id],
          };
        },
      ).with({ type: "EntityFieldConfig" }, ({ column }) => {
        return {
          sourceColumn: column,
          columnType: "EntityFieldConfig" as const,
          aggregation: aggregations[column.id],
        };
      }).exhaustive();
    });
  },
};
