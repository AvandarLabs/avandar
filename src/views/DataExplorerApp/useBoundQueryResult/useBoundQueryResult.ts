import { useLayoutEffect, useMemo, useRef } from "react";
import { reconcileResultBindings } from "$/models/queries/QueryColumnBindings/reconcileResultBindings/reconcileResultBindings";
import type {
  BoundResultSchema,
  ProjectionDescriptor,
  ResultBindingRegistry,
} from "$/models/queries/QueryColumnBindings/QueryColumnBindings";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";

type Options = Readonly<{
  scopeKey: string;
  sqlKey: string;
  resultSqlKey: string | undefined;
  result: QueryResult.T | undefined;
  projections: readonly ProjectionDescriptor[];
  initialRegistry: ResultBindingRegistry | undefined;
}>;

function _getSchema(
  options: Options,
  previous: BoundResultSchema | undefined,
): BoundResultSchema | undefined {
  const sqlKey = options.sqlKey.trim().replace(/;$/, "").trimEnd();
  if (options.result === undefined) {
    return previous?.registry.sqlKey === sqlKey ? previous : undefined;
  }
  if (options.resultSqlKey?.trim().replace(/;$/, "").trimEnd() !== sqlKey) {
    return undefined;
  }
  const schema = reconcileResultBindings({
    ...options,
    sqlKey,
    columns: options.result.columns,
    previous: previous?.registry ?? options.initialRegistry,
  });
  return schema.registry === previous?.registry &&
    JSON.stringify(schema.issues) === JSON.stringify(previous.issues)
    ? previous
    : schema;
}

/**
 * Binds completed results only to the execution that produced them.
 * Structured descriptors replace provisional SQL IDs authoritatively.
 */
export function useBoundQueryResult(
  options: Options,
): BoundResultSchema | undefined {
  const previousRef = useRef<BoundResultSchema | undefined>(undefined);
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
    return _getSchema(
      { scopeKey, sqlKey, resultSqlKey, result, projections, initialRegistry },
      previous,
    );
  }, [scopeKey, sqlKey, resultSqlKey, result, projections, initialRegistry]);
  useLayoutEffect(() => {
    if (schema || previousRef.current?.registry.scopeKey !== scopeKey) {
      previousRef.current = schema;
    }
  }, [schema, scopeKey]);
  return schema;
}
