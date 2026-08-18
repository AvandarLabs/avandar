import { isDefined, prop } from "@avandar/utils";
import { splitSqlStatements } from "./splitSqlStatements";
import type { Statement } from "./splitSqlStatements";

export type { Statement };

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

type PlanRemovalsOptions = Readonly<{
  statements: readonly Statement[];
  isNoop: (create: Readonly<CreateViewStatement>) => NoopVerdict;
}>;

type CreateVerdict = {
  create: CreateViewStatement;
  verdict: NoopVerdict;
};

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

function _getViewKeyFromView(view: Readonly<ViewRef>): string {
  return `${view.schema}.${view.name}`;
}

function _getViewRefFromMatch(
  options: Readonly<{ match: RegExpExecArray; firstGroup: number }>,
): ViewRef | undefined {
  const { match, firstGroup } = options;
  const schema = match[firstGroup] ?? match[firstGroup + 1];
  const name = match[firstGroup + 2] ?? match[firstGroup + 3];
  return schema !== undefined && name !== undefined ?
      { schema, name }
    : undefined;
}

function _getCreateViewFromStatement(
  statement: Readonly<Statement>,
): CreateViewStatement | undefined {
  const match = CREATE_VIEW.exec(statement.body);
  if (!match) {
    return undefined;
  }
  const view = _getViewRefFromMatch({ match, firstGroup: 1 });
  const viewBody = match[5];
  return view && viewBody !== undefined ?
      { ...statement, view, viewBody: viewBody.trim() }
    : undefined;
}

function _getDropViewFromStatement(
  statement: Readonly<Statement>,
): DropViewStatement | undefined {
  const match = DROP_VIEW.exec(statement.body);
  if (!match) {
    return undefined;
  }
  const view = _getViewRefFromMatch({ match, firstGroup: 1 });
  return view ? { ...statement, view } : undefined;
}

function _getNoopCreatesFromVerdicts(
  verdicts: readonly CreateVerdict[],
): CreateViewStatement[] {
  return verdicts.filter(prop("verdict.isNoop")).map(prop("create"));
}

function _getRemovableSpans(
  options: Readonly<{
    statements: readonly Statement[];
    noopCreates: readonly CreateViewStatement[];
    drops: readonly DropViewStatement[];
  }>,
): Span[] {
  const { statements, noopCreates, drops } = options;
  const noopViews = new Set(
    noopCreates.map((create) => {
      return _getViewKeyFromView(create.view);
    }),
  );
  const removableOffsets = new Set([
    ...noopCreates.map(prop("contentStart")),
    ...drops
      .filter((drop) => {
        return noopViews.has(_getViewKeyFromView(drop.view));
      })
      .map(prop("contentStart")),
  ]);

  return statements
    .filter((statement) => {
      return removableOffsets.has(statement.contentStart);
    })
    .map((statement) => {
      return { start: statement.contentStart, end: statement.end };
    })
    .sort((first, second) => {
      return first.start - second.start;
    });
}

function _planRemovals(options: PlanRemovalsOptions): {
  removals: Span[];
  decisions: Decision[];
} {
  const { statements, isNoop } = options;
  const creates = statements.map(_getCreateViewFromStatement).filter(isDefined);
  const drops = statements.map(_getDropViewFromStatement).filter(isDefined);

  // `isNoop` hits the database, so it is called exactly once per create and
  // every downstream value is derived from the result.
  const verdicts = creates.map((create) => {
    return { create, verdict: isNoop(create) };
  });

  return {
    removals: _getRemovableSpans({
      statements,
      noopCreates: _getNoopCreatesFromVerdicts(verdicts),
      drops,
    }),
    decisions: verdicts.map(({ create, verdict }) => {
      return {
        view: create.view,
        isRemoved: verdict.isNoop,
        reason: verdict.reason,
      };
    }),
  };
}

function _applyRemovals(
  options: Readonly<{ original: string; removals: readonly Span[] }>,
): string {
  const { original, removals } = options;
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
   * Splits SQL into top-level statements, ignoring semicolons inside strings,
   * dollar-quoted bodies, and comments.
   */
  getStatementsFromSql: splitSqlStatements,

  /** Reads a statement as a `create view`, or `undefined` if it is not one. */
  getCreateViewFromStatement: _getCreateViewFromStatement,

  /** Reads a statement as a `drop view`, or `undefined` if it is not one. */
  getDropViewFromStatement: _getDropViewFromStatement,

  /**
   * Decides which statements may be deleted. A drop view is removed only when
   * its paired create was a no-op; a drop with no matching create is kept.
   */
  planRemovals: _planRemovals,

  /**
   * Deletes the given source ranges. Kept text is preserved byte-for-byte;
   * blank lines left by a deletion are absorbed.
   */
  applyRemovals: _applyRemovals,

  /** The `schema.name` key a view is matched and deduplicated by. */
  getViewKeyFromView: _getViewKeyFromView,
};
