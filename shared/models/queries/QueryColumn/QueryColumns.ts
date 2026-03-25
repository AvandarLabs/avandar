import { Model } from "@models/Model/Model.ts";
import { uuid } from "$/lib/uuid.ts";
import { AvaDataTypes } from "$/models/datasets/AvaDataType/AvaDataTypes.ts";
import { QueryAggregationTypes } from "$/models/queries/QueryAggregationType/QueryAggregationTypes.ts";
import type { QueryColumn, QueryColumnId } from "$/models/queries/QueryColumn/QueryColumn.types.ts";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn.types.ts";
import type { EntityFieldConfig } from "$/models/EntityConfig/EntityFieldConfig/EntityFieldConfig.types.ts";

export const QueryColumns = {
  makeFromEntityFieldConfig: (field: EntityFieldConfig): QueryColumn => {
    return Model.make("QueryColumn", {
      id: uuid<QueryColumnId>(),
      baseColumn: field,
      aggregation: undefined,
    });
  },
  makeFromDatasetColumn: (column: DatasetColumn): QueryColumn => {
    return Model.make("QueryColumn", {
      id: uuid<QueryColumnId>(),
      baseColumn: column,
      aggregation: undefined,
    });
  },

  /**
   * Get the derived name of a query column. If the column has an aggregation,
   * return the derived column name. Otherwise, return the base column name.
   * @param column - The query column to get the derived name of.
   * @returns The derived name of the query column.
   */
  getDerivedColumnName: (column: QueryColumn): string => {
    const { aggregation } = column;
    if (
      aggregation === undefined ||
      aggregation === "none" ||
      aggregation === "group_by"
    ) {
      return column.baseColumn.name;
    }
    return QueryAggregationTypes.getAggregationColumnName(
      aggregation,
      column.baseColumn.name,
    );
  },

  isNumeric: (column: QueryColumn): boolean => {
    return AvaDataTypes.isNumeric(column.baseColumn.dataType);
  },
};
