import { Model } from "@avandar/models";
import { makeObject, propEq } from "@avandar/utils";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import type { QueryDataSource } from "$/models/queries/QueryDataSource/QueryDataSource.ts";
import type { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery.ts";

type SourceOptions = {
  /** The data source (Dataset or Concept) whose columns are being reconciled. */
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
   * Freshly loaded source columns. These come from
   * `useQueryColumnsForDataSource`, which wraps each `DatasetColumn` (or
   * `ConceptAttribute`) in a new `QueryColumn` with a random ID.
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
 * Reconciles source catalogs and the projections selected from them.
 *
 * A source catalog is the full list of columns of the selected data source,
 * independent of which ones the query selects. Each entry is a `QueryColumn`
 * wrapping a `DatasetColumn` or `ConceptAttribute` as its `baseColumn`. The
 * catalog is loaded by `useQueryColumnsForDataSource`, held in the Explorer
 * state as `sourceCatalog`, and persisted on the query as
 * `StructuredQuery.sourceColumns`. WHERE filters target these columns.
 *
 * Projections are the `QueryColumn`s in `StructuredQuery.queryColumns`. They
 * are the columns the query selects, and carry aggregation and output alias.
 * HAVING filters, ORDER BY, and chart bindings target these.
 *
 * Every reload of the source metadata produces new random IDs. Reconciling
 * maps the new columns back onto the old ones (by `baseColumn` identity) so
 * a column keeps the same ID across reloads and filters stay bound to it.
 */
export const QueryColumnReconciliation = {
  /** Reconciles source metadata without carrying projection settings. */
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
   * Retains projection identity, aggregation, and refreshed source metadata.
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
        ? { ...retained, baseColumn: incomingColumn.baseColumn }
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
