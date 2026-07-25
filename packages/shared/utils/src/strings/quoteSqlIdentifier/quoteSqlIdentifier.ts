/**
 * Quotes a SQL identifier (a table or column name) by wrapping it in double
 * quotes and escaping any embedded double quote by doubling it. This is the
 * standard SQL / DuckDB identifier-quoting rule, and it lets identifiers that
 * contain dashes, spaces, or reserved words (e.g. dataset UUIDs used as table
 * names) be referenced safely.
 *
 * @example
 * quoteSqlIdentifier('my-table') // => '"my-table"'
 * quoteSqlIdentifier('a"b')      // => '"a""b"'
 */
export function quoteSqlIdentifier(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}
