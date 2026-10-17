import { uuid } from "$/lib/uuid.ts";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import type {
  BindingIssue,
  BoundResultSchema,
  ProjectionDescriptor,
  ResultBinding,
  ResultBindingRegistry,
} from "$/models/queries/QueryColumnBindings/QueryColumnBindings.ts";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult.ts";

type Options = Readonly<{
  scopeKey: string;
  sqlKey: string;
  columns: readonly QueryResult.Column[];
  projections: readonly ProjectionDescriptor[];
  previous: ResultBindingRegistry | undefined;
}>;

function _hasSameExpression(
  left: Readonly<Pick<ResultBinding, "expressionKey" | "sqlExpressionKey">>,
  right: Readonly<ProjectionDescriptor>,
): boolean {
  if (left.expressionKey === right.expressionKey) {
    return true;
  }
  const leftHasModel =
    left.expressionKey !== undefined &&
    left.expressionKey !== left.sqlExpressionKey;
  const rightHasModel = right.expressionKey !== right.sqlExpressionKey;
  return (
    !(leftHasModel && rightHasModel) &&
    left.sqlExpressionKey === right.sqlExpressionKey
  );
}

function _getPriorMatch(
  projection: Readonly<ProjectionDescriptor>,
  options: Options,
): ResultBinding | "ambiguous" | undefined {
  const candidates =
    options.previous?.columns.filter((column) => {
      return _hasSameExpression(column, projection);
    }) ?? [];
  const peers = options.projections.filter((other) => {
    return _hasSameExpression(other, projection);
  });
  if (candidates.length <= 1 && peers.length === 1) {
    return candidates[0];
  }
  const namedCandidates = candidates.filter((column) => {
    return column.name === projection.outputName;
  });
  const namedPeers = peers.filter((other) => {
    return other.outputName === projection.outputName;
  });
  if (namedCandidates.length === 1 && namedPeers.length === 1) {
    return namedCandidates[0];
  }
  return candidates.length > 0 ? "ambiguous" : undefined;
}

function _bindOpaqueColumn(
  column: Readonly<QueryResult.Column>,
  options: Options,
  issues: BindingIssue[],
): ResultBinding | undefined {
  if (options.projections.length > 0) {
    issues.push({ target: column.name, reason: "unsupported" });
    return undefined;
  }
  const prior =
    options.previous?.sqlKey === options.sqlKey
      ? options.previous.columns.filter((other) => {
          return other.name === column.name;
        })
      : [];
  if (prior.length > 1) {
    issues.push({ target: column.name, reason: "ambiguous" });
    return undefined;
  }
  return { ...prior[0], ...column, id: prior[0]?.id ?? uuid<QueryColumn.Id>() };
}

function _bindProjection(
  column: Readonly<QueryResult.Column>,
  projection: Readonly<ProjectionDescriptor>,
  options: Options,
  issues: BindingIssue[],
): ResultBinding | undefined {
  const prior = _getPriorMatch(projection, options);
  if (projection.identity !== "structured" && prior === "ambiguous") {
    issues.push({ target: column.name, reason: "ambiguous" });
    return undefined;
  }
  const matched = prior === "ambiguous" ? undefined : prior;
  return {
    ...column,
    id:
      projection.identity === "structured"
        ? projection.id
        : (matched?.id ?? projection.id),
    expressionKey:
      projection.identity === "sql" && matched?.expressionKey
        ? matched.expressionKey
        : projection.expressionKey,
    sqlExpressionKey: projection.sqlExpressionKey,
  };
}

function _bindColumn(
  column: Readonly<QueryResult.Column>,
  options: Options,
  issues: BindingIssue[],
): ResultBinding | undefined {
  const names = options.columns.filter((other) => {
    return other.name.toLowerCase() === column.name.toLowerCase();
  });
  const descriptors = options.projections.filter((projection) => {
    return projection.outputName === column.name;
  });
  if (!column.name || names.length !== 1 || descriptors.length > 1) {
    issues.push({ target: column.name, reason: "ambiguous" });
    return undefined;
  }
  return descriptors[0]
    ? _bindProjection(column, descriptors[0], options, issues)
    : _bindOpaqueColumn(column, options, issues);
}

function _reuseColumns(
  columns: readonly ResultBinding[],
  previous: ResultBindingRegistry | undefined,
): readonly ResultBinding[] {
  const reused = columns.map((column) => {
    const prior = previous?.columns.find((other) => {
      return other.id === column.id;
    });
    return prior &&
      prior.name === column.name &&
      prior.dataType === column.dataType &&
      prior.expressionKey === column.expressionKey &&
      prior.sqlExpressionKey === column.sqlExpressionKey
      ? prior
      : column;
  });
  return previous &&
    reused.length === previous.columns.length &&
    reused.every((column, index) => {
      return column === previous.columns[index];
    })
    ? previous.columns
    : reused;
}

/** Binds completed output metadata within its owning query scope. */
export function reconcileResultBindings(options: Options): BoundResultSchema {
  const sqlKey = options.sqlKey.trim().replace(/;$/, "").trimEnd();
  const previous =
    options.previous?.scopeKey === options.scopeKey
      ? options.previous
      : undefined;
  const context = { ...options, sqlKey, previous };
  const issues: BindingIssue[] = [];
  options.projections.forEach((projection) => {
    if (
      !options.columns.some((column) => {
        return column.name === projection.outputName;
      })
    ) {
      issues.push({ target: projection.outputName, reason: "missing" });
    }
  });
  const candidates = options.columns.flatMap((column) => {
    const binding = _bindColumn(column, context, issues);
    return binding ? [binding] : [];
  });
  const unique = candidates.filter((column) => {
    if (
      candidates.filter((other) => {
        return other.id === column.id;
      }).length > 1
    ) {
      issues.push({ target: column.name, reason: "ambiguous" });
      return false;
    }
    return true;
  });
  const columns = _reuseColumns(unique, previous);
  const registry: ResultBindingRegistry =
    previous?.sqlKey === sqlKey && columns === previous.columns
      ? previous
      : { version: 1, scopeKey: options.scopeKey, sqlKey, columns };
  return { registry, columns, issues };
}
