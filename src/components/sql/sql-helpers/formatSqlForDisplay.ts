import { Parser } from "node-sql-parser";

const SQL_PARSER_DATABASE = "postgresql" as const;

/**
 * Best-effort pretty-print for read-only SQL display. Uses `node-sql-parser`
 * (already in the app for structured-query mapping). Returns the original
 * string when parsing fails.
 */
export function formatSqlForDisplay(sql: string): string {
  const trimmed = sql.trim();
  if (trimmed.length === 0) {
    return sql;
  }

  try {
    const parser = new Parser();
    const ast = parser.astify(trimmed, { database: SQL_PARSER_DATABASE });
    return parser.sqlify(ast as Parameters<Parser["sqlify"]>[0]);
  } catch {
    return sql;
  }
}
