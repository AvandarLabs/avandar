/*
 * Statement parsing for the Postgres -> SQLite migration generator.
 *
 * Three concerns live here:
 *   1. Splitting a `.sql` blob into individual statements (via
 *      `extractStatements`), with dollar-quoting and string-literal
 *      awareness so semicolons inside PL/pgSQL function bodies do not
 *      split.
 *   2. Classifying each statement by its leading keyword
 *      (`classifyStatement`) into `schema-shape` / `drop` / `unknown`.
 *   3. Pulling out the primary table the statement acts on and any FK
 *      references it carries, for downstream partition decisions.
 */

import type { FkReference, Statement, StatementKind } from "./types";

/**
 * Split a raw SQL blob into statements and enrich each with the
 * metadata `partitionStatements` needs. The parser strips line / block
 * comments, splits on unquoted semicolons, then classifies and
 * inspects each statement.
 *
 * @param raw - Contents of a `supabase/migrations/*.sql` file.
 * @returns One {@link Statement} per non-empty top-level statement.
 */
export function extractStatements(raw: string): Statement[] {
  const stripped = _stripComments(raw);
  const pieces = _splitOnUnquotedSemicolons(stripped);
  return pieces
    .map((sql) => {
      return sql.trim();
    })
    .filter((sql) => {
      return sql.length > 0;
    })
    .map((sql) => {
      return {
        sql,
        kind: classifyStatement(sql),
        primaryTable: _findPrimaryTable(sql),
        fkReferences: _findFkReferences(sql),
      };
    });
}

/**
 * Classify a single SQL statement by its leading keyword. The
 * classifier is deliberately keyword-based: it does not need to
 * understand the statement, just to decide whether the SQLite mirror
 * cares about it.
 *
 * @param sql - The raw SQL text of one statement.
 * @returns Whether the statement is schema-shape (keep), drop
 *   (Postgres-only), or unknown (extend the classifier).
 */
export function classifyStatement(sql: string): StatementKind {
  const t = sql.trim().toLowerCase();

  // Schema-shape patterns first so an `ALTER TABLE ... ENABLE ROW LEVEL
  // SECURITY` reaches the drop branch below instead of the bare ALTER
  // TABLE -> schema-shape branch.
  if (/^alter\s+table\b/.test(t)) {
    if (/\b(enable|disable)\s+row\s+level\s+security\b/.test(t)) {
      return "drop";
    }
    if (/\bvalidate\s+constraint\b/.test(t)) {
      return "drop";
    }
    // `ALTER TABLE ... ADD CONSTRAINT ... USING INDEX` is Postgres-only:
    // it bolts a PK or UNIQUE constraint onto a pre-existing unique
    // index. SQLite has no equivalent, and the unique index already
    // exists from the matching CREATE UNIQUE INDEX statement, so we
    // simply drop the ADD CONSTRAINT.
    if (/\busing\s+index\b/.test(t)) {
      return "drop";
    }
    // SQLite ALTER TABLE has no DROP / RENAME CONSTRAINT verbs. The
    // constraint was never created on the SQLite side in the first
    // place (its ADD was either dropped above or routed to a
    // hand-edit), so dropping the DROP / RENAME is a no-op.
    if (/\b(drop|rename)\s+constraint\b/.test(t)) {
      return "drop";
    }
    return "schema-shape";
  }
  if (/^create\s+table\b/.test(t)) {
    return "schema-shape";
  }
  if (/^drop\s+table\b/.test(t)) {
    return "schema-shape";
  }
  if (/^create\s+(unique\s+)?index\b/.test(t)) {
    return "schema-shape";
  }
  if (/^drop\s+index\b/.test(t)) {
    return "schema-shape";
  }

  // Postgres-only constructs the SQLite mirror has no use for.
  if (/^(grant|revoke)\b/.test(t)) {
    return "drop";
  }
  if (/^(create|alter|drop)\s+(or\s+replace\s+)?policy\b/.test(t)) {
    return "drop";
  }
  if (/^(create|alter|drop)\s+(or\s+replace\s+)?function\b/.test(t)) {
    return "drop";
  }
  if (/^(create|alter|drop)\s+(or\s+replace\s+)?trigger\b/.test(t)) {
    return "drop";
  }
  if (/^(create|alter|drop)\s+type\b/.test(t)) {
    return "drop";
  }
  if (/^create\s+(or\s+replace\s+)?extension\b/.test(t)) {
    return "drop";
  }
  if (/^create\s+schema\b/.test(t)) {
    return "drop";
  }
  // Views are derived read models, not schema shape. Today they are all
  // reporting views in the `analytics` schema, defined over
  // `usage_analytics_events` and other tables the mirror excludes, so
  // none of them could resolve locally even though SQLite does have
  // views. Dropped for the same reason functions are.
  if (
    /^(create|alter|drop)\s+(or\s+replace\s+)?(materialized\s+)?view\b/.test(t)
  ) {
    return "drop";
  }
  if (/^comment\s+on\b/.test(t)) {
    return "drop";
  }
  if (/^set\b/.test(t)) {
    return "drop";
  }
  // Data-mutation statements inside a Postgres migration are usually
  // backfills that fix legacy rows. SQLite mirrors get fresh data from
  // the snapshot bootstrap, so dropping these is the right default.
  if (/^(update|insert|delete|truncate)\b/.test(t)) {
    return "drop";
  }
  // Postgres anonymous DO block (`do $$ ... $$;`) is procedural and has
  // no SQLite equivalent.
  if (/^do\s+\$/.test(t)) {
    return "drop";
  }

  return "unknown";
}

/**
 * True when the statement is schema-shape but identifies no primary
 * table on its own (today, only Postgres `DROP INDEX` qualifies because
 * the syntax names the index, not the table it belonged to). The
 * partition step includes these statements verbatim because SQLite
 * accepts them as-is.
 *
 * @param sql - The raw statement.
 * @returns True iff the statement is a "global" schema-shape one.
 */
export function isGlobalSchemaShape(sql: string): boolean {
  return /^\s*drop\s+index\b/i.test(sql);
}

function _stripComments(raw: string): string {
  // Remove /* ... */ blocks first (greedy across newlines), then -- lines.
  const noBlock = raw.replace(/\/\*[\s\S]*?\*\//g, "");
  return noBlock.replace(/--[^\n]*/g, "");
}

const _DOLLAR_TAG_PATTERN = /^\$([A-Za-z_][A-Za-z0-9_]*)?\$/;

function _splitOnUnquotedSemicolons(raw: string): string[] {
  const out: string[] = [];
  let current = "";
  let inSingle = false;
  let inDouble = false;
  // Postgres uses `$tag$ ... $tag$` (or `$$ ... $$`) for procedural-
  // language function bodies. The body contains semicolons that are
  // NOT statement terminators; we track the open tag here so they do
  // not split.
  let dollarTag: string | undefined;
  let i = 0;

  while (i < raw.length) {
    const ch = raw[i]!;

    if (dollarTag !== undefined) {
      const closer = `$${dollarTag}$`;
      if (ch === "$" && raw.startsWith(closer, i)) {
        current += closer;
        i += closer.length;
        dollarTag = undefined;
        continue;
      }
      current += ch;
      i += 1;
      continue;
    }

    if (!inDouble && ch === "'") {
      inSingle = !inSingle;
      current += ch;
      i += 1;
      continue;
    }
    if (!inSingle && ch === '"') {
      inDouble = !inDouble;
      current += ch;
      i += 1;
      continue;
    }
    if (!inSingle && !inDouble && ch === "$") {
      const opener = _DOLLAR_TAG_PATTERN.exec(raw.slice(i));
      if (opener !== null) {
        dollarTag = opener[1] ?? "";
        current += opener[0];
        i += opener[0].length;
        continue;
      }
    }
    if (ch === ";" && !inSingle && !inDouble) {
      out.push(current);
      current = "";
      i += 1;
      continue;
    }
    current += ch;
    i += 1;
  }
  if (current.trim().length > 0) {
    out.push(current);
  }
  return out;
}

/*
 * Patterns used by _findPrimaryTable. The leading anchor `^\s*` ensures
 * we only pick up the table the statement is *acting on*, not table
 * names that happen to appear later (in FK clauses, USING clauses,
 * etc.).
 */
const _PRIMARY_TABLE_PATTERNS: RegExp[] = [
  /^\s*(?:create|alter|drop)\s+table\s+(?:if\s+(?:not\s+)?exists\s+)?(?:"?[a-zA-Z_][a-zA-Z0-9_]*"?\.)?"?([a-zA-Z_][a-zA-Z0-9_]*)"?/i,
  /^\s*create\s+(?:unique\s+)?index\s+(?:concurrently\s+)?(?:if\s+not\s+exists\s+)?(?:"?[a-zA-Z_][a-zA-Z0-9_]*"?\s+)?on\s+(?:"?[a-zA-Z_][a-zA-Z0-9_]*"?\.)?"?([a-zA-Z_][a-zA-Z0-9_]*)"?/i,
];

function _findPrimaryTable(sql: string): string | undefined {
  return _PRIMARY_TABLE_PATTERNS
    .map((re) => {
      return re.exec(sql);
    })
    .find((match) => {
      return match !== null && match[1] !== undefined;
    })?.[1];
}

/*
 * Match FOREIGN KEY clauses, including inline column-level REFERENCES.
 * The trailing `\(` (after optional whitespace) is what distinguishes
 * a real FK reference from GRANT REFERENCES ON TABLE, which has no
 * column list and would otherwise capture the next keyword (`on`) as
 * a table.
 */
const _FK_REFERENCE_PATTERN =
  /\breferences\s+(?:"?([a-zA-Z_][a-zA-Z0-9_]*)"?\s*\.\s*)?"?([a-zA-Z_][a-zA-Z0-9_]*)"?\s*\(/gi;

function _findFkReferences(sql: string): FkReference[] {
  const refs: FkReference[] = [];
  [...sql.matchAll(_FK_REFERENCE_PATTERN)].forEach((match) => {
    const rawSchema = match[1];
    const table = match[2];
    if (table === undefined) {
      return;
    }
    const schema =
      rawSchema === undefined || rawSchema.toLowerCase() === "public" ?
        undefined
      : rawSchema;
    refs.push({ schema, table });
  });
  return refs;
}
