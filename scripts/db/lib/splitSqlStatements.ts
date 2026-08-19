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
    if (sql[index] === "'" && sql[index + 1] === "'") {
      return { index: index + 2, flags };
    }
    return {
      index: index + 1,
      flags: sql[index] === "'" ? { ...flags, inSingleQuote: false } : flags,
    };
  }
  return undefined;
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
    return { index: index + 1, flags: { ...flags, inSingleQuote: true } };
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
