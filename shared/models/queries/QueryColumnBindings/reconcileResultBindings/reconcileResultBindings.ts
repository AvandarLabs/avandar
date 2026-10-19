import { isDefined, prop, propEq } from "@avandar/utils";
import { uuid } from "$/lib/uuid.ts";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import type {
  BindingIssue,
  BoundResultSchema,
  ProjectionDescriptor,
  ResultBinding,
  ResultBindingRegistry,
} from "$/models/queries/QueryColumnBindings/QueryColumnBindings.types.ts";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult.ts";

type Options = {
  scopeKey: string;
  sqlKey: string;
  columns: readonly QueryResult.Column[];
  projections: readonly ProjectionDescriptor[];
  previous: ResultBindingRegistry | undefined;
};
type BindingOutcome = { binding?: ResultBinding; issue?: BindingIssue };

function _hasSameExpression({
  left,
  right,
}: {
  left: Readonly<Pick<ResultBinding, "expressionKey" | "sqlExpressionKey">>;
  right: Readonly<ProjectionDescriptor>;
}): boolean {
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

function _getPriorMatch({
  projection,
  context,
}: {
  projection: Readonly<ProjectionDescriptor>;
  context: Readonly<Options>;
}): ResultBinding | "ambiguous" | undefined {
  const candidates =
    context.previous?.columns.filter((column) => {
      return _hasSameExpression({ left: column, right: projection });
    }) ?? [];
  const peers = context.projections.filter((other) => {
    return _hasSameExpression({ left: other, right: projection });
  });
  if (candidates.length <= 1 && peers.length === 1) {
    return candidates[0];
  }
  const namedCandidates = candidates.filter(
    propEq("name", projection.outputName),
  );
  const namedPeers = peers.filter(propEq("outputName", projection.outputName));
  return namedCandidates.length === 1 && namedPeers.length === 1
    ? namedCandidates[0]
    : candidates.length > 0
      ? "ambiguous"
      : undefined;
}

function _bindOpaqueColumn({
  column,
  context,
}: {
  column: Readonly<QueryResult.Column>;
  context: Readonly<Options>;
}): BindingOutcome {
  if (context.projections.length > 0) {
    return { issue: { target: column.name, reason: "unsupported" } };
  }
  const prior =
    context.previous?.sqlKey === context.sqlKey
      ? context.previous.columns.filter(propEq("name", column.name))
      : [];
  return prior.length > 1
    ? { issue: { target: column.name, reason: "ambiguous" } }
    : {
        binding: {
          ...prior[0],
          ...column,
          id: prior[0]?.id ?? uuid<QueryColumn.Id>(),
        },
      };
}

function _bindProjection({
  column,
  projection,
  context,
}: {
  column: Readonly<QueryResult.Column>;
  projection: Readonly<ProjectionDescriptor>;
  context: Readonly<Options>;
}): BindingOutcome {
  const prior = _getPriorMatch({ projection, context });
  if (projection.identity !== "structured" && prior === "ambiguous") {
    return { issue: { target: column.name, reason: "ambiguous" } };
  }
  const matched = prior === "ambiguous" ? undefined : prior;
  return {
    binding: {
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
    },
  };
}

function _bindColumn({
  column,
  context,
}: {
  column: Readonly<QueryResult.Column>;
  context: Readonly<Options>;
}): BindingOutcome {
  const names = context.columns.filter((other) => {
    return other.name.toLowerCase() === column.name.toLowerCase();
  });
  const descriptors = context.projections.filter(
    propEq("outputName", column.name),
  );
  if (!column.name || names.length !== 1 || descriptors.length > 1) {
    return { issue: { target: column.name, reason: "ambiguous" } };
  }
  return descriptors[0]
    ? _bindProjection({ column, projection: descriptors[0], context })
    : _bindOpaqueColumn({ column, context });
}

function _reuseColumns({
  columns,
  previous,
}: {
  columns: readonly ResultBinding[];
  previous: ResultBindingRegistry | undefined;
}): readonly ResultBinding[] {
  const reused = columns.map((column) => {
    const prior = previous?.columns.find(propEq("id", column.id));
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

function _getUniqueOutcomes(
  candidates: readonly ResultBinding[],
): BindingOutcome[] {
  return candidates.map((column) => {
    return candidates.filter(propEq("id", column.id)).length > 1
      ? { issue: { target: column.name, reason: "ambiguous" } }
      : { binding: column };
  });
}

/** Binds completed output metadata within its owning query scope. */
export function reconcileResultBindings(
  options: Readonly<Options>,
): BoundResultSchema {
  const sqlKey = options.sqlKey.trim().replace(/;$/, "").trimEnd();
  const previous =
    options.previous?.scopeKey === options.scopeKey
      ? options.previous
      : undefined;
  const context = { ...options, sqlKey, previous };
  const missingIssues = options.projections
    .map((projection) => {
      return options.columns.some(propEq("name", projection.outputName))
        ? undefined
        : { target: projection.outputName, reason: "missing" as const };
    })
    .filter(isDefined);
  const outcomes = options.columns.map((column) => {
    return _bindColumn({ column, context });
  });
  const unique = _getUniqueOutcomes(
    outcomes.map(prop("binding")).filter(isDefined),
  );
  const issues = [
    ...missingIssues,
    ...outcomes.map(prop("issue")).filter(isDefined),
    ...unique.map(prop("issue")).filter(isDefined),
  ];
  const columns = _reuseColumns({
    columns: unique.map(prop("binding")).filter(isDefined),
    previous,
  });
  const registry: ResultBindingRegistry =
    previous?.sqlKey === sqlKey && columns === previous.columns
      ? previous
      : { version: 1, scopeKey: options.scopeKey, sqlKey, columns };
  return { registry, columns, issues };
}
