import { t } from "@lingui/core/macro";
import { match } from "ts-pattern";
import type { SqlFailedMappingReason } from "$/models/queries/StructuredQuery/sqlToStructuredQuery/SqlFailedMappingReason.types.ts";

/**
 * Returns the human-readable explanation for a {@link SqlFailedMappingReason}.
 *
 * Shared copy resolved at call time so it follows the active locale. The
 * exhaustive match means a new reason code cannot be added without giving it a
 * message here.
 */
export function sqlFailedMappingReasonLabel(
  reason: SqlFailedMappingReason,
): string {
  return match(reason)
    .with({ code: "sqlEmpty" }, () => {
      return t`SQL is empty.`;
    })
    .with({ code: "sqlUnparseable" }, ({ message }) => {
      return t`Could not parse SQL: ${message}`;
    })
    .with({ code: "onlySelectSupported" }, () => {
      return t`The form only supports SELECT queries.`;
    })
    .with({ code: "multipleStatements" }, () => {
      return t`SQL contains multiple statements; the form maps only the first.`;
    })
    .with({ code: "ctesUnsupported" }, () => {
      return t`CTEs (WITH clauses) are not supported in the form.`;
    })
    .with({ code: "distinctUnsupported" }, () => {
      return t`DISTINCT is not supported in the form.`;
    })
    .with({ code: "setOperationUnsupported" }, () => {
      return t`UNION/INTERSECT/EXCEPT is not supported in the form.`;
    })
    .with({ code: "selectItemUnrecognised" }, () => {
      return t`Unrecognised SELECT item; skipped.`;
    })
    .with({ code: "selectUnnamedExpression" }, () => {
      return t`Unnamed column expression in SELECT; skipped.`;
    })
    .with({ code: "selectUnknownColumn" }, ({ columnName }) => {
      return t`SELECT references column "${columnName}" not present in the dataset.`;
    })
    .with({ code: "selectUnsupportedAggregate" }, ({ funcName }) => {
      return t`Unsupported aggregate function "${funcName}" in SELECT; skipped.`;
    })
    .with({ code: "selectUnsupportedExpression" }, ({ exprType }) => {
      return t`SELECT expression of type "${exprType}" is not supported by the form.`;
    })
    .with({ code: "aggregateComplexArgument" }, ({ funcName }) => {
      return t`Aggregate function "${funcName}" uses a complex argument; skipped.`;
    })
    .with({ code: "aggregateUnknownColumn" }, ({ columnName }) => {
      return t`Aggregate references column "${columnName}" not present in the dataset.`;
    })
    .with({ code: "groupByNonColumn" }, () => {
      return t`GROUP BY uses a non-column expression.`;
    })
    .with({ code: "orderByMultipleColumns" }, () => {
      return t`ORDER BY references multiple columns; the form keeps only the first.`;
    })
    .with({ code: "orderByColumnNotSelected" }, ({ columnName }) => {
      return t`ORDER BY references column "${columnName}" not in the SELECT list.`;
    })
    .with({ code: "fromNoBaseTable" }, () => {
      return t`Could not determine a base table from FROM clause.`;
    })
    .with({ code: "fromNotPlainTable" }, () => {
      return t`FROM clause is not a plain table reference.`;
    })
    .with({ code: "fromCommaJoin" }, () => {
      return t`Comma-joined tables are not mapped; treat them as INNER JOIN with ON true.`;
    })
    .with({ code: "fromUnknownDataset" }, ({ tableName }) => {
      return t`Could not find a known dataset matching "${tableName}".`;
    })
    .with({ code: "fromNestedSubqueryUnserializable" }, () => {
      return t`Nested subquery in FROM could not be re-serialised; mapping kept as a placeholder.`;
    })
    .with({ code: "joinNonEqualityOperator" }, ({ operator }) => {
      return t`JOIN ON clause uses "${operator}": only equality joins are mapped.`;
    })
    .with({ code: "joinNonColumnReference" }, () => {
      return t`JOIN ON clause uses a non-column reference; the form will keep it via raw SQL.`;
    })
    .with({ code: "joinSubqueryUnserializable" }, ({ index }) => {
      return t`JOIN subquery at position ${index} could not be re-serialised.`;
    })
    .with({ code: "joinNotPlainTable" }, ({ index }) => {
      return t`JOIN entry at position ${index} is not a plain table reference.`;
    })
    .with({ code: "whereUnsupportedNode" }, ({ nodeType }) => {
      return t`WHERE clause contains a "${nodeType}" node that the form does not support.`;
    })
    .with({ code: "whereNonColumnLeftSide" }, () => {
      return t`WHERE clause uses an expression on the left-hand side that is not a column reference.`;
    })
    .with({ code: "whereNonNullRightSide" }, ({ operator }) => {
      return t`WHERE clause uses "${operator}" with a non-null right-hand side; only IS NULL / IS NOT NULL are mapped.`;
    })
    .with({ code: "whereBetweenUnrepresentable" }, ({ columnName }) => {
      return t`WHERE clause uses BETWEEN on "${columnName}" with a value that the form cannot represent.`;
    })
    .with({ code: "whereNonLiteralList" }, ({ operator, columnName }) => {
      return t`WHERE clause uses "${operator}" on "${columnName}" with a non-literal list.`;
    })
    .with({ code: "whereUnsupportedOperator" }, ({ operator }) => {
      return t`WHERE clause uses operator "${operator}" which the form does not support.`;
    })
    .with({ code: "whereNonLiteralComparison" }, ({ columnName }) => {
      return t`WHERE clause compares "${columnName}" against a non-literal expression.`;
    })
    .with({ code: "havingUnsupportedNode" }, ({ nodeType }) => {
      return t`HAVING clause contains a "${nodeType}" node that the form cannot represent.`;
    })
    .with({ code: "havingComplexAggregateArgument" }, ({ funcName }) => {
      return t`HAVING uses aggregate ${funcName} on a complex argument; mapping kept the predicate as a label.`;
    })
    .with({ code: "havingUnrepresentableLeftSide" }, () => {
      return t`HAVING clause uses a left-hand side the form cannot represent.`;
    })
    .with({ code: "havingUnsupportedOperator" }, ({ operator }) => {
      return t`HAVING uses operator "${operator}" which the form does not support.`;
    })
    .with({ code: "havingNonLiteralComparison" }, ({ columnName }) => {
      return t`HAVING compares "${columnName}" against a non-literal expression.`;
    })
    .exhaustive();
}
