import { CrosswalkMapping } from "$/models/crosswalks/CrosswalkMapping/CrosswalkMapping";
import { CrosswalkSql } from "$/models/crosswalks/CrosswalkSql/CrosswalkSql";
import { assertSingleSqlExpression } from "@/lib/plugins/derivedColumns/assertSingleSqlExpression/assertSingleSqlExpression";

/** Whether a Combine expression can fill a column, and if not, why not. */
export type CombineExpressionCheck =
  | { isValid: true }
  | {
      isValid: false;
      reason: "empty" | "unknown_column" | "invalid_sql";
      columnName?: string;
    };

/**
 * Whether a Combine expression names only the layout's columns, ignoring
 * case, and is one SQL expression once its placeholders are quoted, the
 * way the combined dataset runs it. Use it to explain a bad expression
 * while it is typed, and to block a combine that would run one.
 */
export function validateCombineExpression(
  options: Readonly<{ sql: string; columnNames: readonly string[] }>,
): CombineExpressionCheck {
  if (options.sql.trim() === "") {
    return { isValid: false, reason: "empty" };
  }
  const knownNames = new Set(
    options.columnNames.map((columnName) => {
      return columnName.toLowerCase();
    }),
  );
  const unknownName = CrosswalkMapping.getCombineColumnNames(options.sql).find(
    (columnName) => {
      return !knownNames.has(columnName.toLowerCase());
    },
  );
  if (unknownName !== undefined) {
    return {
      isValid: false,
      reason: "unknown_column",
      columnName: unknownName,
    };
  }
  try {
    assertSingleSqlExpression(CrosswalkSql.toExpressionSql(options.sql));
  } catch {
    return { isValid: false, reason: "invalid_sql" };
  }
  return { isValid: true };
}
