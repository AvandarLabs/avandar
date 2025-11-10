import { DatasetColumn } from "@/models/datasets/DatasetColumn";
import { QueryColumn, QueryColumnId } from "./QueryColumn.types";
import { uuid } from "@/lib/utils/uuid";
import { EntityFieldConfig } from "@/models/EntityConfig/EntityFieldConfig/EntityFieldConfig.types";
import { Models } from "@/models/Model";
import { AvaDataTypes } from "@/models/datasets/AvaDataType";
import { QueryAggregationTypes } from "../QueryAggregationType/QueryAggregationTypes";

export const QueryColumns = {
  makeFromEntityFieldConfig: (field: EntityFieldConfig): QueryColumn => {
    return Models.make("QueryColumn", {
      id: uuid<QueryColumnId>(),
      baseColumn: field,
      aggregation: undefined,
    });
  },
  makeFromDatasetColumn: (column: DatasetColumn): QueryColumn => {
    return Models.make("QueryColumn", {
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
      aggregation === undefined || aggregation === "none" ||
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
