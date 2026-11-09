/** The kinds of SQL literal that can carry a filter value. */
export type SqlLiteralKind =
  | "string"
  | "number"
  | "escapeString"
  | "dollarString";

/**
 * One literal as written in SQL: its kind, its value (quotes stripped and
 * escapes read; a number in canonical form, so `1.50` is `1.5`), and its
 * exact text.
 */
export type SqlLiteral = Readonly<{
  kind: SqlLiteralKind;
  value: string;
  text: string;
}>;

/**
 * The SQL tokens that matter to literal scanning. Comments, quoted
 * identifiers, and words are matched so a quote or digit inside them never
 * starts a literal. An unterminated string runs to the end of the SQL. An
 * escape string (`E'...'`) must come before words, since `E` is a word.
 */
const SQL_TOKEN =
  /(?<comment>--[^\n]*|\/\*[\s\S]*?(?:\*\/|$))|(?<escapeString>[eE]'(?:\\[\s\S]|''|[^'\\])*(?:'|$))|(?<dollarString>\$(?<tag>[A-Za-z_]\w*)?\$[\s\S]*?\$\k<tag>\$)|(?<string>'(?:''|[^'])*(?:'|$))|(?<identifier>"(?:""|[^"])*(?:"|$)|`(?:``|[^`])*(?:`|$))|(?<word>[A-Za-z_\u0080-\uffff][\w$\u0080-\uffff]*)|(?<number>(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)/g;

/**
 * A number's value in one canonical form: digits-only integers exactly (by
 * `BigInt`, so an id past 2^53 keeps every digit, and `007` is `7`), and
 * any other number as JavaScript prints it (`1.50` is `1.5`).
 */
function _getNumberValue(text: string): string {
  return /^\d+$/.test(text) ? String(BigInt(text)) : String(Number(text));
}

/** Strips the quotes around a run, which may be unterminated. */
function _unquote(text: string, prefixLength: number): string {
  const body = text.slice(prefixLength);
  const isTerminated = body.length > 1 && body.endsWith("'");
  return body.slice(1, isTerminated ? -1 : undefined);
}

function _readStringValue(text: string): string {
  return _unquote(text, 0).replaceAll("''", "'");
}

function _readEscapeStringValue(text: string): string {
  return _unquote(text, 1)
    .replaceAll("''", "'")
    .replace(/\\([\s\S])/g, "$1");
}

function _readDollarStringValue(text: string): string {
  const opening = /^\$(?:[A-Za-z_]\w*)?\$/.exec(text)?.[0] ?? "$$";
  return text.slice(opening.length, -opening.length);
}

/** The literal a token match is, or undefined for any other token. */
function _getLiteralFromGroups(
  groups: Record<string, string | undefined>,
): SqlLiteral | undefined {
  if (groups.string !== undefined) {
    const text = groups.string;
    return { kind: "string", value: _readStringValue(text), text };
  }
  if (groups.number !== undefined) {
    const text = groups.number;
    return { kind: "number", value: _getNumberValue(text), text };
  }
  if (groups.escapeString !== undefined) {
    const text = groups.escapeString;
    return { kind: "escapeString", value: _readEscapeStringValue(text), text };
  }
  if (groups.dollarString !== undefined) {
    const text = groups.dollarString;
    return { kind: "dollarString", value: _readDollarStringValue(text), text };
  }
  return undefined;
}

/**
 * Reads and rewrites the literals in SQL text (strings, numbers, escape
 * strings, and dollar-quoted strings) without parsing it, skipping comments
 * and quoted identifiers. Use it to find or swap filter values in SQL, for
 * example to keep personal values out of SQL shown to a hosted model and to
 * put them back before the SQL runs.
 */
export const SqlLiterals = {
  /**
   * Replaces each literal for which `replace` returns SQL text. Everything
   * else is kept as written.
   */
  replace: (
    sql: string,
    replace: (literal: SqlLiteral) => string | undefined,
  ): string => {
    return sql.replace(SQL_TOKEN, (...args: unknown[]) => {
      const match = args[0] as string;
      const groups = args.at(-1) as Record<string, string | undefined>;
      const literal = _getLiteralFromGroups(groups);
      return literal === undefined ? match : (replace(literal) ?? match);
    });
  },

  /** Every literal, in order. */
  list: (sql: string): SqlLiteral[] => {
    return Array.from(sql.matchAll(SQL_TOKEN)).flatMap((match) => {
      const literal = _getLiteralFromGroups(match.groups ?? {});
      return literal === undefined ? [] : [literal];
    });
  },

  /**
   * Every identifier, quoted ones unquoted, and every bare word, keywords
   * included, in order. Literal and comment text is never listed.
   */
  listIdentifiers: (sql: string): string[] => {
    return Array.from(sql.matchAll(SQL_TOKEN)).flatMap((match) => {
      const { identifier, word } = match.groups ?? {};
      if (identifier !== undefined) {
        return [identifier.slice(1, -1).replaceAll('""', '"')];
      }
      return word === undefined ? [] : [word];
    });
  },

  /** A number's canonical value, as literals of kind `"number"` carry. */
  getNumberValue: _getNumberValue,

  /**
   * SQL with each comment replaced by one space, so collapsing it onto one
   * line can never turn the rest of a statement into a `--` comment.
   */
  stripComments: (sql: string): string => {
    return sql.replace(SQL_TOKEN, (...args: unknown[]) => {
      const groups = args.at(-1) as Record<string, string | undefined>;
      return groups.comment === undefined ? (args[0] as string) : " ";
    });
  },

  /**
   * A literal's identity: its value, with numbers apart from strings, so
   * `48213` and `'48213'` are different values.
   */
  getKey: (literal: Pick<SqlLiteral, "kind" | "value">): string => {
    return `${literal.kind === "number" ? "n" : "s"}:${literal.value}`;
  },

  /** A value written as a single-quoted literal, its quotes doubled. */
  quote: (value: string): string => {
    return `'${value.replaceAll("'", "''")}'`;
  },
};
