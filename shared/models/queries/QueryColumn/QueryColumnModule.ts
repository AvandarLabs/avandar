import { Model } from "@avandar/models";
import { uuid } from "$/lib/uuid.ts";
import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute.ts";
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

  /**
   * One query column per field of a case type, each reading the column the
   * case type's view emits for it. Pass every field of the case type: a
   * field's column name depends on the others' names.
   */
  makeFromConceptAttributes: (
    attributes: ReadonlyArray<ConceptAttributeModel["Read"]>,
  ): QueryColumn.T[] => {
    const viewColumnNames = ConceptAttribute.getViewColumnNames(attributes);
    return attributes.map((attribute) => {
      const viewColumnName = viewColumnNames.get(attribute.id);
      return Model.make("QueryColumn", {
        id: uuid<QueryColumn.Id>(),
        baseColumn: attribute,
        aggregation: undefined,
        ...(viewColumnName === undefined || viewColumnName === attribute.name
          ? {}
          : { sourceColumnName: viewColumnName }),
      });
    });
  },

  /**
   * The column SQL reads for this query column: its `sourceColumnName`, or
   * its base column's name. Use it wherever SQL refers to the source column,
   * for example in a SELECT expression, a WHERE filter, or a GROUP BY.
   */
  getSourceColumnName: (column: QueryColumn.T): string => {
    return column.sourceColumnName ?? column.baseColumn.name;
  },

  /**
   * Points a column at the current definition of its source: the freshly
   * loaded `baseColumn` and the view column it reads. Everything else the
   * column carries (id, aggregation, alias) stays. Use it wherever a column
   * saved or held earlier is matched to freshly loaded metadata, so a column
   * saved before its field's view column was renamed reads the right one.
   */
  refreshSource: (
    column: QueryColumn.T,
    source: Readonly<Pick<QueryColumn.T, "baseColumn" | "sourceColumnName">>,
  ): QueryColumn.T => {
    const { sourceColumnName: _staleName, ...rest } = column;
    return {
      ...rest,
      baseColumn: source.baseColumn,
      ...(source.sourceColumnName === undefined
        ? {}
        : { sourceColumnName: source.sourceColumnName }),
    };
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
