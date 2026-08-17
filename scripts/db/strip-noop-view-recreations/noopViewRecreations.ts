/**
 * Pure logic for finding and removing no-op view recreations in a generated
 * migration. Everything here is deterministic and database-free so it can be
 * tested directly; the database check is injected by the caller.
 *
 * See `strip-noop-view-recreations.main.ts` for why this exists and for the
 * safety rules this module implements.
 */

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

export type CreateViewStatement = Statement & {
  view: ViewRef;
  /** The `as <body>` half, ready to hand back to Postgres. */
  viewBody: string;
};

export type DropViewStatement = Statement & { view: ViewRef };

/** What the planner decided about one view, and why. */
export type Decision = {
  view: ViewRef;
  isRemoved: boolean;
  reason: string;
};

/** A half-open source range to delete. */
export type Span = { start: number; end: number };

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

function viewKey(view: ViewRef): string {
  return `${view.schema}.${view.name}`;
}

function readIdentifierPair(
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

/**
 * Splits SQL into top-level statements.
 *
 * Aware of the four things that can legally contain a semicolon: single-quoted
 * strings, dollar-quoted blocks (the analytics category function uses `$$`),
 * line comments, and block comments. A naive split on `;` would cut a function
 * body in half and corrupt the migration.
 */
function splitStatements(sql: string): Statement[] {
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
    const pair = sql.slice(index, index + 2);

    if (inLineComment) {
      if (sql[index] === "\n") {
        inLineComment = false;
      }
      index += 1;
      continue;
    }
    if (inBlockComment) {
      if (pair === "*/") {
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

    if (pair === "--") {
      inLineComment = true;
      index += 2;
      continue;
    }
    if (pair === "/*") {
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

function asCreateView(statement: Statement): CreateViewStatement | undefined {
  const match = CREATE_VIEW.exec(statement.body);
  if (!match) {
    return undefined;
  }
  const view = readIdentifierPair(match, 1);
  const viewBody = match[5];
  if (!view || viewBody === undefined) {
    return undefined;
  }
  return { ...statement, view, viewBody: viewBody.trim() };
}

function asDropView(statement: Statement): DropViewStatement | undefined {
  const match = DROP_VIEW.exec(statement.body);
  if (!match) {
    return undefined;
  }
  const view = readIdentifierPair(match, 1);
  return view ? { ...statement, view } : undefined;
}

/**
 * Decides which statements may be deleted.
 *
 * `isNoop` is the only non-deterministic input, and in production it asks
 * Postgres whether installing the proposed definition would change anything.
 * Injecting it keeps every decision rule here testable without a database.
 *
 * A `drop view` is removed only when its paired `create or replace view` was
 * proven a no-op. A drop with no matching create is a deliberate deletion and
 * must survive.
 */
function planRemovals(options: {
  statements: readonly Statement[];
  isNoop: (create: CreateViewStatement) => NoopVerdict;
}): { removals: Span[]; decisions: Decision[] } {
  const { statements, isNoop } = options;

  const creates = statements
    .map(asCreateView)
    .filter((statement): statement is CreateViewStatement => {
      return statement !== undefined;
    });
  const drops = statements
    .map(asDropView)
    .filter((statement): statement is DropViewStatement => {
      return statement !== undefined;
    });

  const decisions: Decision[] = [];
  const removableOffsets = new Set<number>();
  const noopViews = new Set<string>();

  for (const create of creates) {
    const verdict = isNoop(create);
    decisions.push({
      view: create.view,
      isRemoved: verdict.isNoop,
      reason: verdict.reason,
    });
    if (verdict.isNoop) {
      removableOffsets.add(create.contentStart);
      noopViews.add(viewKey(create.view));
    }
  }

  for (const drop of drops) {
    if (noopViews.has(viewKey(drop.view))) {
      removableOffsets.add(drop.contentStart);
    }
  }

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

/**
 * Deletes the given source ranges.
 *
 * Works by copying the gaps between ranges rather than re-serialising
 * statements, so everything kept is preserved byte-for-byte. Blank lines left
 * behind by a deletion are absorbed so the result does not accumulate gaps.
 */
function applyRemovals(original: string, removals: readonly Span[]): string {
  if (removals.length === 0) {
    return original;
  }
  let output = "";
  let cursor = 0;
  for (const span of removals) {
    output += original.slice(cursor, span.start);
    cursor = span.end;
    const trailing = /^[ \t]*\r?\n(?:[ \t]*\r?\n)*/.exec(
      original.slice(cursor),
    );
    if (trailing) {
      cursor += trailing[0].length;
    }
  }
  return output + original.slice(cursor);
}

export const NoopViewRecreations = {
  splitStatements,
  asCreateView,
  asDropView,
  planRemovals,
  applyRemovals,
  viewKey,
};
