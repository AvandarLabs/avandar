/** Escapes and quotes a string for a DuckDB single-quoted scalar literal. */
export function escapeSqlStringLiteral(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}
