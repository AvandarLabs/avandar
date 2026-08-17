/**
 * Quotes a SQL string literal by wrapping it in single quotes and escaping any
 * embedded single quote by doubling it. This is the standard SQL / DuckDB
 * literal-quoting rule, and it is what keeps a value containing an apostrophe
 * from terminating the literal early and turning the rest of the value into
 * executable SQL.
 *
 * This is the scalar-value counterpart to `quoteSqlIdentifier`: reach for this
 * one for a value, and for that one for a table or column name.
 *
 * @example
 * quoteSqlLiteral("Nord-Kivu") // => "'Nord-Kivu'"
 * quoteSqlLiteral("O'Brien")   // => "'O''Brien'"
 */
export function quoteSqlLiteral(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}
