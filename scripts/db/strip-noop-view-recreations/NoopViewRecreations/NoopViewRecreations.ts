import { isDefined } from "@avandar/utils";

/** A top-level SQL statement and where it sits in the source file. */
export type Statement = {
  /** Statement text with leading whitespace and comments removed. */
  body: string;
  /** Offset of the first meaningful character, so removal keeps comments. */
  contentStart: number;
  /** Offset just past the terminating semicolon. */
  end: number;
};

/** A schema-qualified view name. */
export type ViewRef = { schema: string; name: string };

/** A parsed `create [or replace] view` statement. */
export type CreateViewStatement = Statement & {
  view: ViewRef;
  /** The `as <body>` half, ready to hand back to Postgres. */
  viewBody: string;
};

/** A parsed `drop view [if exists]` statement. */
export type DropViewStatement = Statement & { view: ViewRef };

/** What the planner decided about one view, and why. */
export type Decision = {
  view: ViewRef;
  isRemoved: boolean;
  reason: string;
};

/** A half-open source range to delete. */
export type Span = { start: number; end: number };

/** Whether applying a create statement would change anything, and why. */
export type NoopVerdict = { isNoop: boolean; reason: string };

const LEADING_NOISE = /^(?:\s|--[^\n]*\n?|\/\*[\s\S]*?\*\/)+/;

/** Matches an identifier that may or may not be double-quoted. */
const IDENT = `(?:"([^"]+)"|([A-Za-z_][A-Za-z_0-9$]*))`;

const CREATE_VIEW = new RegExp(
  `^create\\s+(?:or\\s+replace\\s+)?view\\s+${IDENT}\\.${IDENT}\\s+as\\s+([\\s\\S]+)$`,
  "i",
);

const DROP_VIEW = new RegExp(
  `^drop\\s+view\\s+(?:if\\s+exists\\s+)?${IDENT}\\.${IDENT}\\s*$`,
  "i",
);

function _viewKey(view: ViewRef): string {
  return `${view.schema}.${view.name}`;
}

function _readIdentifierPair(
  match: RegExpExecArray,
  firstGroup: number,
): ViewRef | undefined {
  const schema = match[firstGroup] ?? match[firstGroup + 1];
  const name = match[firstGroup + 2] ?? match[firstGroup + 3];
  if (schema === undefined || name === undefined) {
    return undefined;
  }
  return { schema, name };
}

function _splitStatements(sql: string): Statement[] {
  const statements: Statement[] = [];
  let index = 0;
  let statementStart = 0;
  let inSingleQuote = false;
  let inLineComment = false;
  let inBlockComment = false;
  let dollarTag: string | undefined = undefined;

  const pushStatement = (endExclusive: number): void => {
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
  };

  while (index < sql.length) {
    const nextTwoChars = sql.slice(index, index + 2);

    if (inLineComment) {
      if (sql[index] === "\n") {
        inLineComment = false;
      }
      index += 1;
      continue;
    }
    if (inBlockComment) {
      if (nextTwoChars === "*/") {
        inBlockComment = false;
        index += 2;
        continue;
      }
      index += 1;
      continue;
    }
    if (dollarTag !== undefined) {
      if (sql.startsWith(dollarTag, index)) {
        index += dollarTag.length;
        dollarTag = undefined;
        continue;
      }
      index += 1;
      continue;
    }
    if (inSingleQuote) {
      if (sql[index] === "'") {
        // A doubled quote is an escaped quote, not the end of the literal.
        if (sql[index + 1] === "'") {
          index += 2;
          continue;
        }
        inSingleQuote = false;
      }
      index += 1;
      continue;
    }

    if (nextTwoChars === "--") {
      inLineComment = true;
      index += 2;
      continue;
    }
    if (nextTwoChars === "/*") {
      inBlockComment = true;
      index += 2;
      continue;
    }
    if (sql[index] === "'") {
      inSingleQuote = true;
      index += 1;
      continue;
    }
    const dollarOpen = /^\$[A-Za-z_0-9]*\$/.exec(sql.slice(index));
    if (dollarOpen) {
      dollarTag = dollarOpen[0];
      index += dollarTag.length;
      continue;
    }
    if (sql[index] === ";") {
      pushStatement(index);
      index += 1;
      statementStart = index;
      continue;
    }
    index += 1;
  }

  return statements;
}

function _asCreateView(statement: Statement): CreateViewStatement | undefined {
  const match = CREATE_VIEW.exec(statement.body);
  if (!match) {
    return undefined;
  }
  const view = _readIdentifierPair(match, 1);
  const viewBody = match[5];
  return view && viewBody !== undefined ?
      { ...statement, view, viewBody: viewBody.trim() }
    : undefined;
}

function _asDropView(statement: Statement): DropViewStatement | undefined {
  const match = DROP_VIEW.exec(statement.body);
  if (!match) {
    return undefined;
  }
  const view = _readIdentifierPair(match, 1);
  return view ? { ...statement, view } : undefined;
}

function _planRemovals(options: {
  statements: readonly Statement[];
  isNoop: (create: CreateViewStatement) => NoopVerdict;
}): { removals: Span[]; decisions: Decision[] } {
  const { statements, isNoop } = options;

  const creates = statements.map(_asCreateView).filter(isDefined);
  const drops = statements.map(_asDropView).filter(isDefined);

  // `isNoop` hits the database, so it is called exactly once per create and
  // every downstream value is derived from the result.
  const verdicts = creates.map((create) => {
    return { create, verdict: isNoop(create) };
  });
  const decisions: Decision[] = verdicts.map(({ create, verdict }) => {
    return {
      view: create.view,
      isRemoved: verdict.isNoop,
      reason: verdict.reason,
    };
  });

  const noopCreates = verdicts
    .filter(({ verdict }) => {
      return verdict.isNoop;
    })
    .map(({ create }) => {
      return create;
    });
  const noopViews = new Set(
    noopCreates.map(({ view }) => {
      return _viewKey(view);
    }),
  );
  const removableOffsets = new Set([
    ...noopCreates.map(({ contentStart }) => {
      return contentStart;
    }),
    ...drops
      .filter((drop) => {
        return noopViews.has(_viewKey(drop.view));
      })
      .map(({ contentStart }) => {
        return contentStart;
      }),
  ]);

  const removals = statements
    .filter((statement) => {
      return removableOffsets.has(statement.contentStart);
    })
    .map((statement) => {
      return { start: statement.contentStart, end: statement.end };
    })
    .sort((first, second) => {
      return first.start - second.start;
    });

  return { removals, decisions };
}

function _applyRemovals(original: string, removals: readonly Span[]): string {
  // A fold over the spans: each step copies the gap since the last removal and
  // advances the cursor past the removed span plus any blank lines it left.
  const { output, cursor } = removals.reduce(
    (accumulated, span) => {
      const afterSpan = span.end;
      const trailing = /^[ \t]*\r?\n(?:[ \t]*\r?\n)*/.exec(
        original.slice(afterSpan),
      );
      return {
        output:
          accumulated.output + original.slice(accumulated.cursor, span.start),
        cursor: afterSpan + (trailing ? trailing[0].length : 0),
      };
    },
    { output: "", cursor: 0 },
  );
  return output + original.slice(cursor);
}

/**
 * Pure logic for finding and removing no-op view recreations in a generated
 * migration. Everything here is deterministic and database-free so it can be
 * tested directly; the database check is injected by the caller.
 *
 * See `strip-noop-view-recreations.main.ts` for why this exists and for the
 * safety rules this module implements.
 */
export const NoopViewRecreations = {
  /**
   * Splits SQL into top-level statements.
   *
   * Aware of the four things that can legally contain a semicolon:
   * single-quoted strings, dollar-quoted blocks (the analytics category
   * function uses `$$`), line comments, and block comments. A naive split on
   * `;` would cut a function body in half and corrupt the migration.
   */
  splitStatements: _splitStatements,

  /** Reads a statement as a `create view`, or `undefined` if it is not one. */
  asCreateView: _asCreateView,

  /** Reads a statement as a `drop view`, or `undefined` if it is not one. */
  asDropView: _asDropView,

  /**
   * Decides which statements may be deleted.
   *
   * `isNoop` is the only non-deterministic input, and in production it asks
   * Postgres whether installing the proposed definition would change anything.
   * Injecting it keeps every decision rule here testable without a database.
   *
   * A `drop view` is removed only when its paired `create or replace view` was
   * proven a no-op. A drop with no matching create is a deliberate deletion
   * and must survive.
   */
  planRemovals: _planRemovals,

  /**
   * Deletes the given source ranges.
   *
   * Works by copying the gaps between ranges rather than re-serialising
   * statements, so everything kept is preserved byte-for-byte. Blank lines
   * left behind by a deletion are absorbed so the result does not accumulate
   * gaps.
   */
  applyRemovals: _applyRemovals,

  /** The `schema.name` key a view is matched and deduplicated by. */
  viewKey: _viewKey,
};
