import { objectEntries } from "@avandar/utils";

/**
 * Why a part of a SQL statement could not be represented in the structured
 * query form.
 *
 * These are structured codes rather than sentences: the parser runs in shared
 * code with no access to the active locale, so it reports what happened and the
 * display component renders it through `sqlFailedMappingReasonLabel` from
 * `$/copy/sqlFailedMappingReasonLabel.ts`.
 */
export type SqlFailedMappingReason =
  // Statement level
  | { code: "sqlEmpty" }
  | { code: "sqlUnparseable"; message: string }
  | { code: "onlySelectSupported" }
  | { code: "multipleStatements" }
  | { code: "ctesUnsupported" }
  | { code: "distinctUnsupported" }
  | { code: "setOperationUnsupported" }

  // SELECT list
  | { code: "selectItemUnrecognised" }
  | { code: "selectUnnamedExpression" }
  | { code: "selectUnknownColumn"; columnName: string }
  | { code: "selectUnsupportedAggregate"; funcName: string }
  | { code: "selectUnsupportedExpression"; exprType: string }
  | { code: "aggregateComplexArgument"; funcName: string }
  | { code: "aggregateUnknownColumn"; columnName: string }

  // GROUP BY / ORDER BY
  | { code: "groupByNonColumn" }
  | { code: "orderByMultipleColumns" }
  | { code: "orderByColumnNotSelected"; columnName: string }

  // FROM / JOIN
  | { code: "fromNoBaseTable" }
  | { code: "fromNotPlainTable" }
  | { code: "fromCommaJoin" }
  | { code: "fromUnknownDataset"; tableName: string }
  | { code: "fromNestedSubqueryUnserializable" }
  | { code: "joinNonEqualityOperator"; operator: string }
  | { code: "joinNonColumnReference" }
  | { code: "joinSubqueryUnserializable"; index: number }
  | { code: "joinNotPlainTable"; index: number }

  // WHERE
  | { code: "whereUnsupportedNode"; nodeType: string }
  | { code: "whereNonColumnLeftSide" }
  | { code: "whereNonNullRightSide"; operator: string }
  | { code: "whereBetweenUnrepresentable"; columnName: string }
  | { code: "whereNonLiteralList"; operator: string; columnName: string }
  | { code: "whereUnsupportedOperator"; operator: string }
  | { code: "whereNonLiteralComparison"; columnName: string }

  // HAVING
  | { code: "havingUnsupportedNode"; nodeType: string }
  | { code: "havingComplexAggregateArgument"; funcName: string }
  | { code: "havingUnrepresentableLeftSide" }
  | { code: "havingUnsupportedOperator"; operator: string }
  | { code: "havingNonLiteralComparison"; columnName: string };

/** Stable identity for a reason, for use as a list key. */
export function sqlFailedMappingReasonKey(
  reason: SqlFailedMappingReason,
): string {
  const params = objectEntries(reason)
    .filter(([key]) => {
      return key !== "code";
    })
    .map(([key, value]) => {
      return `${key}=${String(value)}`;
    })
    .join("&");
  return params === "" ? reason.code : `${reason.code}?${params}`;
}
