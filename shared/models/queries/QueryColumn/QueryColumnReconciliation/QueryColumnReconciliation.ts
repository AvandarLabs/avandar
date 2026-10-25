import { Model } from "@avandar/models";
import { makeObject, propEq } from "@avandar/utils";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import type { QueryDataSource } from "$/models/queries/QueryDataSource/QueryDataSource.ts";
import type { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery.ts";

type SourceOptions = {
  sourceKey: QueryDataSource.TypedId;
  previousSourceKey: QueryDataSource.TypedId | undefined;
  previous: readonly QueryColumn.T[];
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

/** Reconciles source catalogs and the projections selected from them. */
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
