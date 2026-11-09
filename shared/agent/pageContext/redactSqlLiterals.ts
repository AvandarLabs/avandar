/** What a single-quoted literal becomes when it looks like personal data. */
export const REDACTED_SQL_LITERAL = "'<redacted>'";

/** A quoted run of SQL: where it ends and its value with quotes unescaped. */
type QuotedRun = { end: number; value: string };

/**
 * Reads the quoted run that opens at `start`. A doubled quote inside the run
 * is one quote character, as in `'O''Brien'` or `"a""b"`. An unterminated
 * run lasts to the end of the SQL.
 */
function _readQuotedRun(sql: string, start: number, quote: string): QuotedRun {
  let value = "";
  let index = start + 1;
  while (index < sql.length) {
    if (sql[index] === quote) {
      if (sql[index + 1] === quote) {
        value += quote;
        index += 2;
        continue;
      }
      return { end: index + 1, value };
    }
    value += sql[index];
    index += 1;
  }
  return { end: index, value };
}

/**
 * Replaces each single-quoted string literal in `sql` that `isSensitive`
 * flags with `'<redacted>'`, leaving the rest of the SQL as written.
 * `isSensitive` receives the literal's value with doubled quotes unescaped.
 * Double-quoted identifiers are skipped, so a quote inside a column name
 * does not start a literal. Follows the same quoting rules as the app's
 * `extractSingleQuotedSqlLiterals`.
 */
export function redactSqlLiterals(
  sql: string,
  isSensitive: (text: string) => boolean,
): string {
  let output = "";
  let index = 0;
  while (index < sql.length) {
    const char = sql[index]!;
    if (char !== "'" && char !== '"') {
      output += char;
      index += 1;
      continue;
    }
    const run = _readQuotedRun(sql, index, char);
    output +=
      char === "'" && isSensitive(run.value)
        ? REDACTED_SQL_LITERAL
        : sql.slice(index, run.end);
    index = run.end;
  }
  return output;
}
