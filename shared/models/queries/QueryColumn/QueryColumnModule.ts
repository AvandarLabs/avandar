import { Model } from "@avandar/models";
import { match } from "ts-pattern";
import { uuid } from "$/lib/uuid.ts";
import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute.ts";
import { QueryAggregationType } from "$/models/queries/QueryAggregationType/QueryAggregationType.ts";
import type { DatasetColumnRead } from "$/models/datasets/DatasetColumn/DatasetColumn.types.ts";
import type { ConceptAttributeModel } from "$/models/ontology/ConceptAttribute/ConceptAttribute.types.ts";
import type { ConceptStatusColumn } from "$/models/queries/ConceptStatusColumn/ConceptStatusColumn.ts";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";

/** Grouping and counting work on a whole list; number aggregates do not. */
const LIST_AGGREGATIONS: readonly QueryAggregationType.T[] = [
  "none",
  "group_by",
  "count",
];

function _isList(column: QueryColumn.T): boolean {
  const { baseColumn } = column;
  if (baseColumn.__type !== "ConceptAttribute") {
    return false;
  }
  return match(ConceptAttribute.getValueShape(baseColumn))
    .with("single", () => {
      return false;
    })
    .with("list", "bucketed_list", () => {
      return true;
    })
    .exhaustive();
}

export const QueryColumnModule = {
  /**
   * One query column per field of a case type, each reading the column the
   * case type's view emits for it. Pass every field of the case type: a
   * field's column name depends on the others' names.
   */
  makeFromConceptAttributes: (
    attributes: ReadonlyArray<ConceptAttributeModel["Read"]>,
  ): QueryColumn.T[] => {
    const viewColumns = ConceptAttribute.getViewColumnNames(attributes);
    return attributes.map((attribute) => {
      const viewColumn = viewColumns.get(attribute.id);
      const sourceColumnName =
        viewColumn?.columnName === attribute.name
          ? undefined
          : viewColumn?.columnName;
      const resultColumnName =
        viewColumn?.resultName === attribute.name
          ? undefined
          : viewColumn?.resultName;
      return Model.make("QueryColumn", {
        id: uuid<QueryColumn.Id>(),
        baseColumn: attribute,
        aggregation: undefined,
        ...(sourceColumnName === undefined ? {} : { sourceColumnName }),
        ...(resultColumnName === undefined ? {} : { resultColumnName }),
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
   * loaded `baseColumn`, the view column it reads, and the result name it
   * takes. Everything else the column carries (id, aggregation, alias) stays.
   * Use it wherever a column saved or held earlier is matched to freshly
   * loaded metadata, so a column saved before its field's view column was
   * renamed reads the right one.
   */
  refreshFromSourceColumn: (
    options: Readonly<{
      column: QueryColumn.T;
      sourceColumn: Readonly<
        Pick<
          QueryColumn.T,
          "baseColumn" | "sourceColumnName" | "resultColumnName"
        >
      >;
    }>,
  ): QueryColumn.T => {
    const { column, sourceColumn } = options;
    const {
      sourceColumnName: _staleSourceColumnName,
      resultColumnName: _staleResultColumnName,
      ...rest
    } = column;
    return {
      ...rest,
      baseColumn: sourceColumn.baseColumn,
      ...(sourceColumn.sourceColumnName === undefined
        ? {}
        : { sourceColumnName: sourceColumn.sourceColumnName }),
      ...(sourceColumn.resultColumnName === undefined
        ? {}
        : { resultColumnName: sourceColumn.resultColumnName }),
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
   * `outputAlias` when present, otherwise the aggregate name or the result
   * name of the base column: its `resultColumnName`, or its own name. Use it
   * wherever a query column must be found in a result by name, for example to
   * read its values from result rows.
   * @param column - The query column to get the derived name of.
   * @returns The derived name of the query column.
   */
  getDerivedColumnName: (column: QueryColumn.T): string => {
    if (column.outputAlias !== undefined) {
      return column.outputAlias;
    }
    const { aggregation } = column;
    const resultBaseName = column.resultColumnName ?? column.baseColumn.name;
    if (
      aggregation === undefined ||
      aggregation === "none" ||
      aggregation === "group_by"
    ) {
      return resultBaseName;
    }
    return QueryAggregationType.getAggregationColumnName(
      aggregation,
      resultBaseName,
    );
  },

  isNumeric: (column: QueryColumn.T): boolean => {
    // A list of numbers is not a number: summing or charting it fails.
    return (
      !_isList(column) && AvaDataType.isNumeric(column.baseColumn.dataType)
    );
  },

  /**
   * Whether the column is a case type field that holds more than one value
   * (every value, or one per period), which a query reads as a DuckDB list.
   * Use it to keep a list out of an operation that fails on one, for example
   * a filter.
   */
  isList: _isList,

  /**
   * The negation of {@link QueryColumnModule.isList}. Use it as a predicate
   * to keep a list out of a picker, for example
   * `filter(QueryColumn.isNotList)`.
   */
  isNotList: (column: QueryColumn.T): boolean => {
    return !_isList(column);
  },

  /**
   * The aggregations a column can take in a query: a list's are grouping and
   * counting, any other column's follow its data type.
   */
  getValidAggregations: (
    column: QueryColumn.T,
  ): readonly QueryAggregationType.T[] => {
    return _isList(column)
      ? LIST_AGGREGATIONS
      : AvaDataType.getValidQueryAggregations(column.baseColumn.dataType);
  },
};
