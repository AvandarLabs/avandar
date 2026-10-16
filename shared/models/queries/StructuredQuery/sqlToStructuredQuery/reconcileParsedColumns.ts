import { Model } from "@avandar/models";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import type { QueryDataSource } from "$/models/queries/QueryDataSource/QueryDataSource.ts";
import type { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery.ts";

/** Retains uniquely matched SQL projections across alias-only edits. */
export function reconcileParsedColumns(
  options: Readonly<{
    columns: readonly QueryColumn.T[];
    previousQuery: StructuredQuery.Partial | undefined;
    dataSource: QueryDataSource.T | undefined;
  }>,
): QueryColumn.T[] {
  const { columns, previousQuery, dataSource } = options;
  const previousSource = previousQuery?.dataSource;
  if (
    !dataSource ||
    !previousSource ||
    dataSource.__type !== previousSource.__type ||
    dataSource.id !== previousSource.id
  ) {
    return [...columns];
  }
  return columns.map((column) => {
    const matches = previousQuery.queryColumns.filter((previous) => {
      return _isSameExpression(column, {
        ...previous,
        aggregation: previousQuery.aggregations[previous.id],
      });
    });
    const incomingMatches = columns.filter((incoming) => {
      return _isSameExpression(column, incoming);
    });
    const aliasMatches = matches.filter((previous) => {
      return previous.outputAlias === column.outputAlias;
    });
    const incomingAliases = incomingMatches.filter((incoming) => {
      return incoming.outputAlias === column.outputAlias;
    });
    const retained =
      matches.length === 1 && incomingMatches.length === 1
        ? matches[0]
        : aliasMatches.length === 1 && incomingAliases.length === 1
          ? aliasMatches[0]
          : undefined;
    return retained ? { ...column, id: retained.id } : column;
  });
}

function _isSameExpression(left: QueryColumn.T, right: QueryColumn.T): boolean {
  const leftKey = Model.getTypedId(left.baseColumn);
  const rightKey = Model.getTypedId(right.baseColumn);
  const normalize = (aggregation: QueryColumn.T["aggregation"]) => {
    return aggregation === "group_by" || aggregation === "none"
      ? undefined
      : aggregation;
  };
  return (
    leftKey.__type === rightKey.__type &&
    leftKey.id === rightKey.id &&
    normalize(left.aggregation) === normalize(right.aggregation)
  );
}
