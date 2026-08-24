/** A top-level SQL statement and where it sits in the source file. */
export type Statement = {
  /** Statement text with leading whitespace and comments removed. */
  body: string;
  /** Offset of the first meaningful character, so removal keeps comments. */
  contentStart: number;
  /** Offset just past the terminating semicolon. */
  end: number;
};

const LEADING_NOISE = /^(?:\s|--[^\n]*\n?|\/\*[\s\S]*?\*\/)+/;

type ScanFlags = {
  inSingleQuote: boolean;
  /**
   * Whether the open single-quoted string is an `E'...'` escape string, in
   * which a backslash escapes the next character. A plain string has no
   * backslash escapes (`standard_conforming_strings` is on), so `\'` there is
   * a backslash followed by the closing quote.
   */
  isEscapeString: boolean;
  inDoubleQuote: boolean;
  inLineComment: boolean;
  inBlockComment: boolean;
  dollarTag: string | undefined;
};

type PushStatementOptions = Readonly<{
  sql: string;
  statements: Statement[];
  statementStart: number;
  endExclusive: number;
}>;

const INITIAL_FLAGS: ScanFlags = {
  inSingleQuote: false,
  isEscapeString: false,
  inDoubleQuote: false,
  inLineComment: false,
  inBlockComment: false,
  dollarTag: undefined,
};

function _tryPushStatement(options: PushStatementOptions): void {
  const { sql, statements, statementStart, endExclusive } = options;
  const raw = sql.slice(statementStart, endExclusive);
  const noise = LEADING_NOISE.exec(raw);
  const offset = noise ? noise[0].length : 0;
  const body = raw.slice(offset).trim();
  if (body.length > 0) {
    statements.push({
      body,
      contentStart: statementStart + offset,
      end: endExclusive + 1,
    });
  }
}

function _advanceInsideDelimiter(
  options: Readonly<{ sql: string; index: number; flags: ScanFlags }>,
): { index: number; flags: ScanFlags } | undefined {
  const { sql, index, flags } = options;
  const nextTwoChars = sql.slice(index, index + 2);

  if (flags.inLineComment) {
    return {
      index: index + 1,
      flags: sql[index] === "\n" ? { ...flags, inLineComment: false } : flags,
    };
  }
  if (flags.inBlockComment) {
    return nextTwoChars === "*/" ?
        { index: index + 2, flags: { ...flags, inBlockComment: false } }
      : { index: index + 1, flags };
  }
  if (flags.dollarTag !== undefined) {
    return sql.startsWith(flags.dollarTag, index) ?
        {
          index: index + flags.dollarTag.length,
          flags: { ...flags, dollarTag: undefined },
        }
      : { index: index + 1, flags };
  }
  if (flags.inSingleQuote) {
    if (flags.isEscapeString && sql[index] === "\\") {
      return { index: index + 2, flags };
    }
    if (sql[index] === "'" && sql[index + 1] === "'") {
      return { index: index + 2, flags };
    }
    return {
      index: index + 1,
      flags:
        sql[index] === "'" ?
          { ...flags, inSingleQuote: false, isEscapeString: false }
        : flags,
    };
  }
  if (flags.inDoubleQuote) {
    if (sql[index] === '"' && sql[index + 1] === '"') {
      return { index: index + 2, flags };
    }
    return {
      index: index + 1,
      flags: sql[index] === '"' ? { ...flags, inDoubleQuote: false } : flags,
    };
  }
  return undefined;
}

/** Whether the character before `index` could end an identifier or number. */
function _isWordCharacterBefore(sql: string, index: number): boolean {
  const previous = index === 0 ? "" : sql[index - 1];
  return previous !== undefined && /[A-Za-z_0-9$]/u.test(previous);
}

function _startDelimiterAt(
  options: Readonly<{ sql: string; index: number; flags: ScanFlags }>,
): { index: number; flags: ScanFlags } | undefined {
  const { sql, index, flags } = options;
  const nextTwoChars = sql.slice(index, index + 2);
  if (nextTwoChars === "--") {
    return { index: index + 2, flags: { ...flags, inLineComment: true } };
  }
  if (nextTwoChars === "/*") {
    return { index: index + 2, flags: { ...flags, inBlockComment: true } };
  }
  if (sql[index] === "'") {
    return {
      index: index + 1,
      flags: { ...flags, inSingleQuote: true, isEscapeString: false },
    };
  }
  // `E'...'` only introduces an escape string when the `E` stands alone; in
  // `the'` it is the tail of an identifier and the quote is an ordinary one.
  if (
    (sql[index] === "E" || sql[index] === "e") &&
    sql[index + 1] === "'" &&
    !_isWordCharacterBefore(sql, index)
  ) {
    return {
      index: index + 2,
      flags: { ...flags, inSingleQuote: true, isEscapeString: true },
    };
  }
  // A double-quoted identifier. Load-bearing rather than pedantic: policy and
  // constraint names are quoted identifiers written in English, so one holding
  // an apostrophe ("Owner's rows") used to flip the scanner into string mode
  // and swallow every following statement in the file. That is silent, and
  // both callers act on the result: the privilege reconciler would see the
  // swallowed `grant`s as undeclared and generate a migration revoking them,
  // and the view stripper would find nothing to strip.
  if (sql[index] === '"') {
    return { index: index + 1, flags: { ...flags, inDoubleQuote: true } };
  }
  const dollarOpen = /^\$[A-Za-z_0-9]*\$/.exec(sql.slice(index));
  if (dollarOpen) {
    return {
      index: index + dollarOpen[0].length,
      flags: { ...flags, dollarTag: dollarOpen[0] },
    };
  }
  return undefined;
}

/**
 * Splits SQL into top-level statements, ignoring semicolons inside strings,
 * dollar-quoted bodies, and comments.
 */
export function splitSqlStatements(sql: string): Statement[] {
  const statements: Statement[] = [];
  let index = 0;
  let statementStart = 0;
  let flags: ScanFlags = INITIAL_FLAGS;

  while (index < sql.length) {
    const inside = _advanceInsideDelimiter({ sql, index, flags });
    if (inside) {
      index = inside.index;
      flags = inside.flags;
      continue;
    }
    const started = _startDelimiterAt({ sql, index, flags });
    if (started) {
      index = started.index;
      flags = started.flags;
      continue;
    }
    if (sql[index] === ";") {
      _tryPushStatement({
        sql,
        statements,
        statementStart,
        endExclusive: index,
      });
      index += 1;
      statementStart = index;
      continue;
    }
    index += 1;
  }

  return statements;
}
