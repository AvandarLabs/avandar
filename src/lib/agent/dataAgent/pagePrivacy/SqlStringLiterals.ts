/**
 * One SQL token that matters to literal scanning: a comment, a single-quoted
 * string literal (an unterminated one runs to the end of the SQL), or a
 * double-quoted or backquoted identifier. Comments and identifiers are
 * matched only so a quote inside them never starts a literal.
 */
const SQL_QUOTED_RUN =
  /(?<comment>--[^\n]*|\/\*[\s\S]*?(?:\*\/|$))|(?<literal>'(?:''|[^'])*(?:'|$))|(?<identifier>"(?:""|[^"])*(?:"|$)|`(?:``|[^`])*(?:`|$))/g;

/** A literal's value: quotes stripped and doubled quotes unescaped. */
function _getLiteralValue(literal: string): string {
  const isTerminated = literal.length > 1 && literal.endsWith("'");
  return literal.slice(1, isTerminated ? -1 : undefined).replaceAll("''", "'");
}

/**
 * Reads and rewrites the single-quoted string literals in SQL text without
 * parsing it, skipping comments and quoted identifiers. Use it to find or
 * swap filter values in SQL, for example to keep personal values out of SQL
 * shown to a hosted model and to put them back before the SQL runs.
 */
export const SqlStringLiterals = {
  /**
   * Replaces each literal for which `replace` returns SQL text, passing it
   * the literal's unescaped value. Everything else is kept as written.
   */
  replace: (
    sql: string,
    replace: (value: string) => string | undefined,
  ): string => {
    return sql.replace(
      SQL_QUOTED_RUN,
      (match: string, _comment?: string, literal?: string) => {
        return literal === undefined
          ? match
          : (replace(_getLiteralValue(literal)) ?? match);
      },
    );
  },

  /** The unescaped values of every literal, in order. */
  getValues: (sql: string): string[] => {
    return Array.from(sql.matchAll(SQL_QUOTED_RUN)).flatMap((match) => {
      const literal = match.groups?.literal;
      return literal === undefined ? [] : [_getLiteralValue(literal)];
    });
  },

  /** A value written as a single-quoted literal, its quotes doubled. */
  quote: (value: string): string => {
    return `'${value.replaceAll("'", "''")}'`;
  },
};
