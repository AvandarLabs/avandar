import { Model } from "@models/Model/Model.ts";
import { uuid } from "$/lib/uuid.ts";
import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import { QueryAggregationType } from "$/models/queries/QueryAggregationType/QueryAggregationType.ts";
import type { DatasetColumnRead } from "$/models/datasets/DatasetColumn/DatasetColumn.types.ts";
import type { EntityFieldConfigModel } from "$/models/EntityConfig/EntityFieldConfig/EntityFieldConfig.types.ts";
import type {
  QueryColumn
} from "$/models/queries/QueryColumn/QueryColumn.ts";

export const QueryColumnModule = {
  makeFromEntityFieldConfig: (
    field: EntityFieldConfigModel["Read"],
  ): QueryColumn.T => {
    return Model.make("QueryColumn", {
      id: uuid<QueryColumn.Id>(),
      baseColumn: field,
      aggregation: undefined,
    });
  },
  makeFromDatasetColumn: (column: DatasetColumnRead): QueryColumn.T => {
    return Model.make("QueryColumn", {
      id: uuid<QueryColumn.Id>(),
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
  getDerivedColumnName: (column: QueryColumn.T): string => {
    const { aggregation } = column;
    if (
      aggregation === undefined ||
      aggregation === "none" ||
      aggregation === "group_by"
    ) {
      return column.baseColumn.name;
    }
    return QueryAggregationType.getAggregationColumnName(
      aggregation,
      column.baseColumn.name,
    );
  },

  isNumeric: (column: QueryColumn.T): boolean => {
    return AvaDataType.isNumeric(column.baseColumn.dataType);
  },
};
