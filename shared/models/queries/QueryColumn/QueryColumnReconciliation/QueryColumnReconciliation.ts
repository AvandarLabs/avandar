import { Model } from "@avandar/models";
import { makeObject, propEq } from "@avandar/utils";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import type { QueryDataSource } from "$/models/queries/QueryDataSource/QueryDataSource.ts";
import type { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery.ts";

type SourceOptions = {
  /**
   * The data source (Dataset or Concept) whose columns are being reconciled.
   */
  sourceKey: QueryDataSource.TypedId;

  /**
   * The data source that `previous` was built for. Previous IDs are only
   * reused when this matches `sourceKey`, so switching sources never carries
   * IDs over.
   */
  previousSourceKey: QueryDataSource.TypedId | undefined;

  /** The source columns we already hold, with their stable IDs. */
  previous: readonly QueryColumn.T[];

  /**
   * Freshly loaded source columns, each `DatasetColumn` or `ConceptAttribute`
   * wrapped in a new `QueryColumn` with a random ID.
   */
  incoming: readonly QueryColumn.T[];
};

function _isSameSource({
  left,
  right,
}: {
  left: QueryColumn.T;
  right: QueryColumn.T;
}): boolean {
  const leftKey = Model.getTypedId(left.baseColumn);
  const rightKey = Model.getTypedId(right.baseColumn);
  return leftKey.__type === rightKey.__type && leftKey.id === rightKey.id;
}

function _getRetainedProjection(options: {
  previous: readonly QueryColumn.T[];
  incoming: readonly QueryColumn.T[];
  incomingColumn: QueryColumn.T;
}): QueryColumn.T | undefined {
  const { previous, incoming, incomingColumn } = options;
  const explicit = previous.find(propEq("id", incomingColumn.id));
  const sameSource = previous.filter((column) => {
    return _isSameSource({ left: column, right: incomingColumn });
  });
  const isUniqueIncomingSource =
    incoming.filter((column) => {
      return _isSameSource({ left: column, right: incomingColumn });
    }).length === 1;
  return (
    explicit ??
    (sameSource.length === 1 && isUniqueIncomingSource
      ? sameSource[0]
      : undefined)
  );
}

/**
 * Keeps query column IDs stable when a data source's columns reload. Each
 * reload wraps every source column in a new `QueryColumn` with a random ID,
 * and reconciling maps it back onto the column it replaces, by `baseColumn`
 * identity, so filters and chart bindings stay bound to the same column.
 *
 * Use it wherever column metadata is loaded again, for example when a
 * dataset's columns finish loading or when SQL is parsed into a query.
 */
export const QueryColumnReconciliation = {
  /**
   * Reconciles a data source's full column list, the
   * `StructuredQuery.sourceColumns` that WHERE filters target. Reuses an ID
   * only while the data source is unchanged, and drops aggregation and output
   * alias, which belong to projections.
   */
  reconcileSourceColumns: (
    options: Readonly<SourceOptions>,
  ): QueryColumn.T[] => {
    const { sourceKey, previousSourceKey, previous, incoming } = options;
    const isSameScope =
      sourceKey.__type === previousSourceKey?.__type &&
      sourceKey.id === previousSourceKey.id;
    return incoming.map((incomingColumn) => {
      const retained = isSameScope
        ? previous.find((column) => {
            return _isSameSource({ left: column, right: incomingColumn });
          })
        : undefined;
      const { outputAlias: _outputAlias, ...column } = incomingColumn;
      return {
        ...column,
        id: retained?.id ?? column.id,
        aggregation: undefined,
      };
    });
  },

  /**
   * Reconciles the columns a query selects, the `StructuredQuery.queryColumns`
   * that HAVING filters, ORDER BY, and chart bindings target. A retained
   * column keeps its ID, aggregation, and output alias and takes its refreshed
   * `baseColumn` and source column name. Returns the columns with a matching
   * aggregation map.
   */
  reconcileSelectedColumns: (
    options: Readonly<{
      previous: readonly QueryColumn.T[];
      incoming: readonly QueryColumn.T[];
      aggregations: StructuredQuery.Partial["aggregations"];
    }>,
  ): {
    columns: QueryColumn.T[];
    aggregations: StructuredQuery.Partial["aggregations"];
  } => {
    const { previous, incoming, aggregations } = options;
    const columns = incoming.map((incomingColumn) => {
      const retained = _getRetainedProjection({
        previous,
        incoming,
        incomingColumn,
      });
      const column = retained
        ? QueryColumn.refreshSource(retained, incomingColumn)
        : incomingColumn;
      const aggregation = retained
        ? aggregations[retained.id]
        : column.aggregation;
      return { ...column, aggregation };
    });
    return {
      columns,
      aggregations: makeObject(columns, {
        key: "id",
        valueFn: (column) => {
          return column.aggregation ?? "none";
        },
      }),
    };
  },
};
