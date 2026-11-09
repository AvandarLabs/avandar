/**
 * Where a quoted run of text ends: the index after its closing quote, with a
 * doubled quote read as part of the text. Undefined when it never closes.
 */
function _getQuotedEndIndex(
  options: Readonly<{ sql: string; quote: string; startIndex: number }>,
): number | undefined {
  const { quote, sql } = options;
  let searchIndex = options.startIndex + 1;
  while (searchIndex < sql.length) {
    const closingIndex = sql.indexOf(quote, searchIndex);
    if (closingIndex === -1) {
      return undefined;
    }
    if (sql[closingIndex + 1] !== quote) {
      return closingIndex + 1;
    }
    searchIndex = closingIndex + 2;
  }
  return undefined;
}

/** Where a `--` comment ends. DuckDB ends one at `\n` or at `\r`. */
function _getLineCommentEndIndex(
  options: Readonly<{ sql: string; startIndex: number }>,
): number {
  const lineEndOffset = options.sql.slice(options.startIndex).search(/[\n\r]/);
  return lineEndOffset === -1
    ? options.sql.length
    : options.startIndex + lineEndOffset;
}

/**
 * Where a `/* ... *\/` comment ends, or undefined when it never closes or
 * holds another `/*`. DuckDB nests block comments and the tokenizer does not,
 * so a nested comment is read as a different amount of code by each.
 */
function _getBlockCommentEndIndex(
  options: Readonly<{ sql: string; startIndex: number }>,
): number | undefined {
  const { sql, startIndex } = options;
  const closingIndex = sql.indexOf("*/", startIndex + 2);
  if (closingIndex === -1) {
    return undefined;
  }
  return sql.slice(startIndex + 2, closingIndex).includes("/*")
    ? undefined
    : closingIndex + 2;
}

/** Reads the unquoted word at `startIndex` and returns where it ends. */
function _getWordEndIndex(
  options: Readonly<{ sql: string; startIndex: number }>,
): number {
  const wordLength =
    /^[a-z_][a-z0-9_$]*/i.exec(options.sql.slice(options.startIndex))?.[0]
      .length ?? 1;
  return options.startIndex + wordLength;
}

/**
 * Reports whether the SQL uses syntax the tokenizer reads differently from
 * DuckDB, so the tokens cannot be trusted to show what DuckDB will run.
 *
 * The tokenizer knows plain strings, quoted identifiers, `--` comments, and
 * flat block comments. DuckDB also nests block comments, takes backslash
 * escapes inside `E'...'` strings, quotes strings with `$tag$...$tag$`, and
 * takes `$1` parameters. In each of those the tokenizer can end a string or a
 * comment where DuckDB does not, which hides a relation from the analysis.
 * Text that never closes is refused for the same reason.
 *
 * A `$` is plain text only inside a quoted run, a comment, or an unquoted word
 * such as `price$`.
 */
export function hasUnsupportedSqlSyntax(sql: string): boolean {
  let index = 0;
  while (index < sql.length) {
    const character = sql[index] ?? "";
    let nextIndex: number | undefined = index + 1;
    if (character === "'" || character === '"' || character === "`") {
      nextIndex = _getQuotedEndIndex({
        sql,
        quote: character,
        startIndex: index,
      });
    } else if (character === "-" && sql[index + 1] === "-") {
      nextIndex = _getLineCommentEndIndex({ sql, startIndex: index });
    } else if (character === "/" && sql[index + 1] === "*") {
      nextIndex = _getBlockCommentEndIndex({ sql, startIndex: index });
    } else if (character === "$") {
      return true;
    } else if (/[a-z_]/i.test(character)) {
      nextIndex = _getWordEndIndex({ sql, startIndex: index });
      const isEscapeStringPrefix =
        sql.slice(index, nextIndex).toLowerCase() === "e" &&
        sql[nextIndex] === "'";
      if (isEscapeStringPrefix) {
        return true;
      }
    }
    if (nextIndex === undefined) {
      return true;
    }
    index = nextIndex;
  }
  return false;
}
