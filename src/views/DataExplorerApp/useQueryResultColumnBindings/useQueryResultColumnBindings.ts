import { normalizeSqlForSubquery } from "@avandar/utils/sql";
import { useLayoutEffect, useMemo, useRef } from "react";
import { reconcileQueryResultColumnBindings } from "$/models/queries/QueryResultColumnBindings/reconcileQueryResultColumnBindings/reconcileQueryResultColumnBindings";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type {
  QueryResultColumnBindings,
  ProjectionDescriptor,
  QueryResultColumnBindingRegistry,
} from "$/models/queries/QueryResultColumnBindings/QueryResultColumnBindings.types";

type UseQueryResultColumnBindingsOptions = {
  scopeKey: string;
  sqlKey: string;
  resultSqlKey: string | undefined;
  result: QueryResult.T | undefined;
  projections: readonly ProjectionDescriptor[];
  initialRegistry: QueryResultColumnBindingRegistry | undefined;
};

function _getSchema({
  options,
  previous,
}: {
  options: Readonly<UseQueryResultColumnBindingsOptions>;
  previous: QueryResultColumnBindings | undefined;
}): QueryResultColumnBindings | undefined {
  const sqlKey = normalizeSqlForSubquery(options.sqlKey);
  if (options.result === undefined) {
    return previous?.registry.sqlKey === sqlKey ? previous : undefined;
  }
  if (
    (options.resultSqlKey === undefined
      ? undefined
      : normalizeSqlForSubquery(options.resultSqlKey)) !== sqlKey
  ) {
    return undefined;
  }
  // A seed keyed to this SQL wins over earlier bindings keyed to other SQL.
  // The Data Explorer re-keys its bindings that way when it wraps its SQL,
  // so the columns the wrapper passes through keep their IDs.
  const isSeedForThisSql =
    options.initialRegistry?.sqlKey === sqlKey &&
    previous?.registry.sqlKey !== sqlKey;
  const schema = reconcileQueryResultColumnBindings({
    ...options,
    sqlKey,
    columns: options.result.columns,
    previous: isSeedForThisSql
      ? options.initialRegistry
      : (previous?.registry ?? options.initialRegistry),
  });
  return schema.registry === previous?.registry &&
    JSON.stringify(schema.issues) === JSON.stringify(previous.issues)
    ? previous
    : schema;
}

/**
 * Binds each column of a finished query result to a column ID, reusing the
 * IDs of earlier results in the same `scopeKey` so chart settings and filters
 * stay on the same columns across runs. Undefined until a result of the
 * current SQL is bound, so a late result of an earlier query is never used.
 *
 * Use it in a view that runs a query and keys settings by column ID, for
 * example a chart editor.
 */
export function useQueryResultColumnBindings(
  options: Readonly<UseQueryResultColumnBindingsOptions>,
): QueryResultColumnBindings | undefined {
  const previousRef = useRef<QueryResultColumnBindings | undefined>(undefined);
  const {
    scopeKey,
    sqlKey,
    resultSqlKey,
    result,
    projections,
    initialRegistry,
  } = options;
  const schema = useMemo(() => {
    const previous =
      previousRef.current?.registry.scopeKey === scopeKey
        ? previousRef.current
        : undefined;
    return _getSchema({
      options: {
        scopeKey,
        sqlKey,
        resultSqlKey,
        result,
        projections,
        initialRegistry,
      },
      previous: previous,
    });
  }, [scopeKey, sqlKey, resultSqlKey, result, projections, initialRegistry]);
  useLayoutEffect(() => {
    if (schema || previousRef.current?.registry.scopeKey !== scopeKey) {
      previousRef.current = schema;
    }
  }, [schema, scopeKey]);
  return schema;
}
