/** Trims surrounding whitespace and one terminal statement separator. */
export function normalizeSqlForSubquery(sql: string): string {
  return sql.trim().replace(/;\s*$/u, "").trimEnd();
}
