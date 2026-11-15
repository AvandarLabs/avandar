/**
 * Finds where the meaningful part of a SQL string ends. Walks the string
 * while tracking single-quoted strings, double-quoted identifiers, `--` line
 * comments, and block comments, so those are never mistaken for code.
 *
 * @param sql - The SQL text to scan.
 * @returns The index just past the last character that is not whitespace, a
 * comment, or a `;`.
 */
function _findEndOfSignificantSql(sql: string): number {
  let end = 0;
  let index = 0;
  while (index < sql.length) {
    const char = sql[index]!;
    const pair = sql.slice(index, index + 2);
    if (pair === "--") {
      const newline = sql.indexOf("\n", index);
      index = newline === -1 ? sql.length : newline + 1;
    } else if (pair === "/*") {
      const close = sql.indexOf("*/", index + 2);
      index = close === -1 ? sql.length : close + 2;
    } else if (char === "'" || char === '"') {
      index = _skipQuoted(sql, index, char);
      end = index;
    } else {
      index += 1;
      if (char !== ";" && !/\s/u.test(char)) {
        end = index;
      }
    }
  }
  return end;
}

/**
 * Returns the index just past a quoted section. A doubled quote character
 * inside the section is an escaped quote, not the end of it.
 */
function _skipQuoted(sql: string, start: number, quote: string): number {
  let index = start + 1;
  while (index < sql.length) {
    if (sql[index] === quote) {
      if (sql[index + 1] === quote) {
        index += 2;
      } else {
        return index + 1;
      }
    } else {
      index += 1;
    }
  }
  return sql.length;
}

/**
 * Prepares a SQL statement to be embedded as a subquery, for example
 * `SELECT * FROM (<sql>) AS t`. Removes leading whitespace and everything
 * after the last piece of real SQL: trailing whitespace, `;` separators, and
 * `--` or block comments. A trailing `--` comment must go because it would
 * otherwise comment out the wrapper's closing `)`. Comments and semicolons
 * inside string literals and quoted identifiers are left alone.
 *
 * @param sql - A SQL statement.
 * @returns The statement without trailing whitespace, semicolons or comments.
 */
export function normalizeSqlForSubquery(sql: string): string {
  const trimmed = sql.trimStart();
  return trimmed.slice(0, _findEndOfSignificantSql(trimmed));
}
