/**
 * Prepares one SQL statement to be embedded as a subquery, such as
 * `SELECT * FROM (<sql>) AS t`, where a trailing `;` is a syntax error. It
 * trims surrounding whitespace and removes one trailing `;`. Callers also use
 * the result as a comparison key, so SQL that differs only in that whitespace
 * or `;` counts as the same query.
 *
 * - `"  SELECT * FROM sales;  "` becomes `"SELECT * FROM sales"`.
 * - `"SELECT 1 ;\n"` becomes `"SELECT 1"`.
 * - `"SELECT 1;;"` becomes `"SELECT 1;"`: only one `;` is removed.
 * - `"SELECT 1; -- done"` is unchanged: a trailing comment hides the `;`.
 */
export function normalizeSqlForSubquery(sql: string): string {
  return sql.trim().replace(/;\s*$/u, "").trimEnd();
}
