import { Model } from "@avandar/models";
import { uuid } from "$/lib/uuid.ts";
import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import { QueryAggregationType } from "$/models/queries/QueryAggregationType/QueryAggregationType.ts";
import type { DatasetColumnRead } from "$/models/datasets/DatasetColumn/DatasetColumn.types.ts";
import type { ConceptAttributeModel } from "$/models/ontology/ConceptAttribute/ConceptAttribute.types.ts";
import type { ConceptStatusColumn } from "$/models/queries/ConceptStatusColumn/ConceptStatusColumn.ts";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";

export const QueryColumnModule = {
  makeFromConceptAttribute: (
    attribute: ConceptAttributeModel["Read"],
  ): QueryColumn.T => {
    return Model.make("QueryColumn", {
      id: uuid<QueryColumn.Id>(),
      baseColumn: attribute,
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
   * Wraps a case type's built-in `status` column. Filters, grouping and
   * aggregation read only the base column's `name` and `dataType`, so the
   * status column needs no handling of its own past this point.
   */
  makeFromConceptStatusColumn: (
    column: ConceptStatusColumn.T,
  ): QueryColumn.T => {
    return Model.make("QueryColumn", {
      id: uuid<QueryColumn.Id>(),
      baseColumn: column,
      aggregation: undefined,
    });
  },

  /**
   * Gets the `QueryResult` column name this query column produces: its
   * `outputAlias` when present, otherwise the aggregate name or the base
   * column name. Use it wherever a query column must be found in a result by
   * name, for example to read its values from result rows.
   * @param column - The query column to get the derived name of.
   * @returns The derived name of the query column.
   */
  getDerivedColumnName: (column: QueryColumn.T): string => {
    if (column.outputAlias !== undefined) {
      return column.outputAlias;
    }
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
