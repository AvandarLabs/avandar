/*
 * Postgres -> SQLite migration generator.
 *
 * Reads every file in `supabase/migrations/`, slices each file into
 * statements, partitions them against the manifest in
 * `apps/desktop/sync/syncable-tables.ts`, transpiles the kept ones to
 * SQLite via `python3 -m sqlglot`, and writes the result to
 * `apps/desktop/migrations/`.
 *
 * `sqlglot` is a *developer-machine* dependency (Python, installed via
 * pip). It is not an npm dependency and is not bundled into the web or
 * desktop runtime. This script and the matching `check-sqlite-migrations`
 * script are the only callers; they are invoked manually via
 * `pnpm gen:sqlite-migrations` / `pnpm check:sqlite-migrations`. Nothing
 * under `src/`, `shared/`, or `packages/` imports anything from this file.
 */

import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { EXCLUDED_TABLES, SYNCABLE_TABLES } from "../sync/syncable-tables";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..", "..", "..");
const PG_MIGRATIONS_DIR = join(REPO_ROOT, "supabase", "migrations");
const SQLITE_MIGRATIONS_DIR = join(REPO_ROOT, "apps", "desktop", "migrations");

/*
 * Pin the sqlglot version this script depends on. uv resolves and caches
 * this spec on first run; bumping the version is a one-line change.
 *
 * Range form (`>=A,<B`) lets uv pick the latest patch within the major,
 * which is cheap to update via `uv cache prune` if needed.
 */
const SQLGLOT_SPEC = "sqlglot>=26.0.0,<27.0.0";

/**
 * What kind of Postgres statement we are looking at, from the desktop
 * mirror's perspective.
 *
 * - `schema-shape`: CREATE/ALTER/DROP TABLE, CREATE/DROP INDEX, or any
 *   other statement that defines the table layout the SQLite mirror
 *   needs. These are what we transpile and emit.
 * - `drop`: Postgres-only construct that has no SQLite equivalent or
 *   would not be useful locally (RLS policies, PL/pgSQL functions,
 *   triggers, GRANT/REVOKE, COMMENT, SET, CREATE EXTENSION, ENUM types,
 *   `ENABLE/DISABLE ROW LEVEL SECURITY`, `VALIDATE CONSTRAINT`). The
 *   generator silently discards these.
 * - `unknown`: leading keyword we do not recognise. The generator
 *   hard-errors so the classifier gets extended for the new syntax.
 */
export type StatementKind = "schema-shape" | "drop" | "unknown";

/**
 * A foreign-key reference extracted from a schema-shape statement.
 * `schema` is `undefined` for unqualified or `public.` references; any
 * other value means the FK targets a different Postgres schema (e.g.
 * `auth.users`), which the SQLite mirror cannot satisfy.
 */
export type FkReference = {
  schema: string | undefined;
  table: string;
};

/**
 * A single SQL statement extracted from a Postgres migration, enriched
 * with the metadata the partition step needs:
 *
 * - `kind` decides whether the statement makes it to SQLite at all.
 * - `primaryTable` keys `schema-shape` statements against the
 *   `SYNCABLE_TABLES` / `EXCLUDED_TABLES` manifest.
 * - `fkReferences` lets the partition step drop FK constraints whose
 *   target table does not exist locally (cross-schema or excluded).
 */
export type Statement = {
  sql: string;
  kind: StatementKind;
  primaryTable: string | undefined;
  fkReferences: FkReference[];
};

/**
 * Result of partitioning a batch of statements against the manifest.
 *
 * - `included`: write to the `.gen.sql` output as-is (after sqlglot).
 * - `skipped`: discard silently (Postgres-only or table is excluded).
 * - `needsHandEdit`: schema-relevant but SQLite cannot accept the
 *   statement as written; the generator prints a warning so a human
 *   can inline the change into the right `.gen.sql` file. Today the
 *   only case is `ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY`,
 *   which SQLite only supports inline in `CREATE TABLE`.
 * - `unknown`: blocks generation; the classifier or the manifest
 *   needs to grow before this run can succeed.
 */
export type PartitionResult = {
  included: Statement[];
  skipped: Statement[];
  needsHandEdit: Statement[];
  unknown: Statement[];
};

/**
 * Options for {@link partitionStatements}.
 */
export type PartitionStatementsOptions = {
  statements: Statement[];
  syncable: string[];
  excluded: string[];
};

/**
 * Partition statements by what the SQLite mirror should do with them.
 *
 * - `kind === "drop"` -> `skipped` (Postgres-only construct).
 * - `kind === "unknown"` -> `unknown` (block generation).
 * - `kind === "schema-shape"` with no detectable primary table ->
 *   `unknown` (extend `_findPrimaryTable`).
 * - Primary table in `EXCLUDED_TABLES` -> `skipped` (we do not mirror
 *   that table).
 * - Primary table not in `SYNCABLE_TABLES` or `EXCLUDED_TABLES` ->
 *   `unknown` (the manifest needs an entry).
 * - Primary table in `SYNCABLE_TABLES` with at least one FK target that
 *   is cross-schema or non-syncable -> `skipped` (we drop the whole
 *   constraint; SQLite cannot enforce a FK to a table it does not
 *   have).
 * - Primary table in `SYNCABLE_TABLES` and every FK target is also in
 *   `SYNCABLE_TABLES` -> `included` (FKs that the SQLite mirror can
 *   honour are preserved verbatim).
 *
 * @param options - Parsed statements plus the syncable / excluded manifest.
 * @returns The three buckets. `unknown` being non-empty is a generator
 *   error in the orchestration layer; the function itself does not throw.
 */
export function partitionStatements(
  options: Readonly<PartitionStatementsOptions>,
): PartitionResult {
  const { statements, syncable, excluded } = options;
  const syncableSet = new Set(syncable);
  const excludedSet = new Set(excluded);
  const included: Statement[] = [];
  const skipped: Statement[] = [];
  const needsHandEdit: Statement[] = [];
  const unknown: Statement[] = [];

  statements.forEach((stmt) => {
    if (stmt.kind === "drop") {
      skipped.push(stmt);
      return;
    }
    if (stmt.kind === "unknown") {
      unknown.push(stmt);
      return;
    }
    // schema-shape from here on
    if (stmt.primaryTable === undefined) {
      // Some schema-shape statements name no table (e.g. DROP INDEX in
      // Postgres, where the index name alone is enough). Include those
      // verbatim; SQLite ignores DROP INDEX IF EXISTS for unknown names.
      if (_isGlobalSchemaShape(stmt.sql)) {
        included.push(stmt);
        return;
      }
      unknown.push(stmt);
      return;
    }
    if (excludedSet.has(stmt.primaryTable)) {
      skipped.push(stmt);
      return;
    }
    if (!syncableSet.has(stmt.primaryTable)) {
      unknown.push(stmt);
      return;
    }
    const fkToNonSyncable = stmt.fkReferences.some((ref) => {
      if (ref.schema !== undefined) {
        return true;
      }
      return !syncableSet.has(ref.table);
    });
    if (fkToNonSyncable) {
      skipped.push(stmt);
      return;
    }
    // ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY is schema-shape we
    // want, but SQLite only accepts FKs inline inside CREATE TABLE.
    // Surface for a hand-edit instead of silently dropping.
    if (_needsHandEdit(stmt)) {
      needsHandEdit.push(stmt);
      return;
    }
    included.push(stmt);
  });

  return { included, skipped, needsHandEdit, unknown };
}

function _needsHandEdit(stmt: Readonly<Statement>): boolean {
  // SQLite's ALTER TABLE only supports RENAME / ADD COLUMN / DROP
  // COLUMN. Anything else against a still-existing CREATE TABLE must
  // be inlined into the CREATE TABLE by hand:
  //
  // - `ADD CONSTRAINT` (FK, CHECK, PRIMARY KEY, UNIQUE) - the earlier
  //   classifier already drops the `USING INDEX` flavour, so anything
  //   left here is a real constraint.
  // - `ALTER COLUMN` (type change, SET/DROP DEFAULT, SET/DROP NOT NULL)
  //   - SQLite has no equivalent verb at all.
  if (!/^\s*alter\s+table\b/i.test(stmt.sql)) {
    return false;
  }
  if (/\badd\s+constraint\b/i.test(stmt.sql)) {
    return true;
  }
  if (/\balter\s+column\b/i.test(stmt.sql)) {
    return true;
  }
  return false;
}

/**
 * Classify a single SQL statement by its leading keyword. The classifier
 * is deliberately keyword-based: it does not need to understand the
 * statement, just to decide whether the SQLite mirror cares about it.
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
  // Postgres uses `$tag$ ... $tag$` (or `$$ ... $$`) for procedural-language
  // function bodies. The body contains semicolons that are NOT statement
  // terminators; we track the open tag here so they do not split.
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
 * Patterns used by _findPrimaryTable. The leading anchor `^\s*` ensures we
 * only pick up the table the statement is *acting on*, not table names
 * that happen to appear later (in FK clauses, USING clauses, etc.).
 */
const _PRIMARY_TABLE_PATTERNS: RegExp[] = [
  /^\s*(?:create|alter|drop)\s+table\s+(?:if\s+(?:not\s+)?exists\s+)?(?:"?[a-zA-Z_][a-zA-Z0-9_]*"?\.)?"?([a-zA-Z_][a-zA-Z0-9_]*)"?/i,
  /^\s*create\s+(?:unique\s+)?index\s+(?:concurrently\s+)?(?:if\s+not\s+exists\s+)?(?:[a-zA-Z_][a-zA-Z0-9_]*\s+)?on\s+(?:"?[a-zA-Z_][a-zA-Z0-9_]*"?\.)?"?([a-zA-Z_][a-zA-Z0-9_]*)"?/i,
];

function _isGlobalSchemaShape(sql: string): boolean {
  return /^\s*drop\s+index\b/i.test(sql);
}

function _findPrimaryTable(sql: string): string | undefined {
  return _PRIMARY_TABLE_PATTERNS.map((re) => {
    return re.exec(sql);
  }).find((match) => {
    return match !== null && match[1] !== undefined;
  })?.[1];
}

/*
 * Match FOREIGN KEY clauses, including inline column-level REFERENCES.
 * The trailing `\(` (after optional whitespace) is what distinguishes a
 * real FK reference from GRANT REFERENCES ON TABLE, which has no column
 * list and would otherwise capture the next keyword (`on`) as a table.
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
      rawSchema === undefined || rawSchema.toLowerCase() === "public"
        ? undefined
        : rawSchema;
    refs.push({ schema, table });
  });
  return refs;
}

/**
 * Run the full generator end-to-end against `supabase/migrations/` and
 * write the SQLite equivalents to `apps/desktop/migrations/`. Used by the
 * `pnpm gen:sqlite-migrations` script; exposed for the `check` script.
 *
 * @param outDir - Where to write the generated `.sql` files. The directory
 *   is created if missing and its contents are wiped before writing.
 * @returns Summary counts for logging by the caller.
 */
/**
 * A statement that needs a human to inline it into the right
 * `.gen.sql` file. Carries the source migration file name (for the
 * warning message) plus the statement itself.
 */
export type HandEditItem = {
  sourceFile: string;
  statement: Statement;
};

export function runGenerator(outDir: string): {
  filesWritten: number;
  statementsIncluded: number;
  statementsSkipped: number;
  needsHandEdit: HandEditItem[];
} {
  _assertSqlglotAvailable();

  const sourceFiles = readdirSync(PG_MIGRATIONS_DIR)
    .filter((f) => {
      return f.endsWith(".sql");
    })
    .sort();

  // Wipe and recreate the output directory, but preserve README.md so we
  // do not nuke the operator-facing documentation that lives alongside.
  const readmePath = join(outDir, "README.md");
  const readme = existsSync(readmePath)
    ? readFileSync(readmePath, "utf8")
    : undefined;
  if (existsSync(outDir)) {
    rmSync(outDir, { recursive: true, force: true });
  }
  mkdirSync(outDir, { recursive: true });
  if (readme !== undefined) {
    writeFileSync(readmePath, readme);
  }

  let filesWritten = 0;
  let statementsIncluded = 0;
  let statementsSkipped = 0;
  const allHandEdits: HandEditItem[] = [];

  sourceFiles.forEach((sourceFile) => {
    const sourcePath = join(PG_MIGRATIONS_DIR, sourceFile);
    const raw = readFileSync(sourcePath, "utf8");
    const statements = extractStatements(raw);
    const partition = partitionStatements({
      statements,
      syncable: SYNCABLE_TABLES,
      excluded: EXCLUDED_TABLES,
    });

    if (partition.unknown.length > 0) {
      const samples = partition.unknown.slice(0, 5).map((s) => {
        const reason =
          s.kind === "unknown"
            ? "unrecognised leading keyword"
            : s.primaryTable === undefined
              ? "schema-shape with no detectable primary table"
              : `uncategorised table: ${s.primaryTable}`;
        const preview = s.sql.replace(/\s+/g, " ").slice(0, 120);
        const ellipsis = s.sql.length > 120 ? "..." : "";
        return `  - [${reason}] ${preview}${ellipsis}`;
      });
      throw new Error(
        `gen-sqlite-migrations: ${sourceFile} has ${partition.unknown.length} unhandled statement(s). Fix by extending classifyStatement() (in this file) or by categorising the table in apps/desktop/sync/syncable-tables.ts.\n${samples.join("\n")}`,
      );
    }

    statementsIncluded += partition.included.length;
    statementsSkipped += partition.skipped.length;
    partition.needsHandEdit.forEach((statement) => {
      allHandEdits.push({ sourceFile, statement });
    });

    // Always emit a file, even when nothing schema-shape survived. That
    // keeps `apps/desktop/migrations/` 1-to-1 with
    // `supabase/migrations/`, which makes review easier (each Postgres
    // migration is paired with a SQLite migration documenting what
    // changed locally - even if the answer is "nothing").
    const header = _buildHeader({ sourceFile, partition });
    const body =
      partition.included.length === 0
        ? `${header}\n-- No schema-shape changes: every statement was RLS / GRANT / function / trigger / type / data backfill, none of which has a SQLite equivalent.\n`
        : `${header}\n${_transpileToSqlite(
            partition.included.map((s) => {
              return s.sql;
            }),
          )
            .map((sql) => {
              return _stripPostgresIsms(sql);
            })
            .join(";\n\n")};\n`;
    const outName = sourceFile.replace(/\.sql$/i, ".gen.sql");
    writeFileSync(join(outDir, outName), body);
    filesWritten += 1;
  });

  if (allHandEdits.length > 0) {
    _printHandEditWarning(allHandEdits);
  }

  return {
    filesWritten,
    statementsIncluded,
    statementsSkipped,
    needsHandEdit: allHandEdits,
  };
}

function _buildHeader(args: Readonly<{
  sourceFile: string;
  partition: PartitionResult;
}>): string {
  const { sourceFile, partition } = args;
  return [
    `-- Generated from supabase/migrations/${sourceFile} by`,
    "-- apps/desktop/scripts/gen-sqlite-migrations.ts. Do not edit by hand",
    "-- unless the matching `needs hand-edit` warning calls for it.",
    `-- Schema-shape statements emitted: ${partition.included.length}`,
    `-- Statements dropped (RLS/funcs/triggers/data/etc.): ${partition.skipped.length}`,
    `-- Statements needing hand-edit (ADD CONSTRAINT, ALTER COLUMN): ${partition.needsHandEdit.length}`,
  ].join("\n");
}

const _ANSI_YELLOW = "\x1b[33m";
const _ANSI_BOLD = "\x1b[1m";
const _ANSI_RESET = "\x1b[0m";

function _printHandEditWarning(items: readonly HandEditItem[]): void {
  const header = `${_ANSI_BOLD}${_ANSI_YELLOW}\u26a0  ${items.length} statement(s) could not be transpiled and need a hand-edit${_ANSI_RESET}`;
  const blurb = `${_ANSI_YELLOW}SQLite's ALTER TABLE supports RENAME / ADD COLUMN / DROP COLUMN only. Postgres-style \`ALTER TABLE ... ADD CONSTRAINT ...\` (FK, CHECK, PRIMARY KEY, UNIQUE) cannot be transpiled, so the constraints below were dropped from the generated output. To preserve them on the SQLite side, open the matching \`apps/desktop/migrations/<source>.gen.sql\` and inline each constraint into the CREATE TABLE for the affected table (column-level \`REFERENCES\`, table-level \`FOREIGN KEY\`, or a \`CHECK (...)\` clause).${_ANSI_RESET}`;
  const bullets = items.map((item) => {
    const fkTargets = item.statement.fkReferences
      .map((ref) => {
        return ref.schema === undefined ? ref.table : `${ref.schema}.${ref.table}`;
      })
      .join(", ");
    const preview = item.statement.sql.replace(/\s+/g, " ").slice(0, 200);
    const ellipsis = item.statement.sql.length > 200 ? "..." : "";
    return `${_ANSI_YELLOW}  - ${item.sourceFile}\n      table: ${item.statement.primaryTable ?? "?"}, references: ${fkTargets}\n      ${preview}${ellipsis}${_ANSI_RESET}`;
  });
  console.warn("");
  console.warn(header);
  console.warn(blurb);
  console.warn("");
  bullets.forEach((line) => {
    console.warn(line);
  });
  console.warn("");
}

/*
 * Post-process sqlglot's SQLite output to strip Postgres-specific noise
 * that survives the transpile pass:
 *
 * - `"public".name` and `public.name` -> just `name`. SQLite treats a dot
 *   prefix as an attached-database name, not a schema, so the original
 *   prefix is a parse error.
 * - `NOT VALID` on ADD CONSTRAINT -> dropped. Postgres-only modifier
 *   meaning "do not validate existing rows"; SQLite always validates.
 * - `DEFAULT <fn>(...)` -> dropped. Postgres builtins like
 *   `gen_random_uuid()` and `auth.uid()` survive as `UUID()` /
 *   `auth.uid()` in the transpile, which SQLite cannot evaluate at DDL
 *   time. The sync bootstrap inserts rows with explicit values, so
 *   defaults of this form are dead weight on the SQLite mirror anyway.
 *   `DEFAULT CURRENT_TIMESTAMP` (a keyword, no parens) is preserved.
 */
function _stripPostgresIsms(sql: string): string {
  let out = sql;
  out = out.replace(/"public"\s*\./gi, "");
  out = out.replace(/\bpublic\s*\./gi, "");
  out = out.replace(/\s+NOT\s+VALID\b/gi, "");
  out = out.replace(
    /\s+DEFAULT\s+[a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)?\s*\([^)]*\)/gi,
    "",
  );
  // `USING btree` (and other Postgres index methods) inside CREATE INDEX:
  // SQLite indexes are always B-trees and reject the explicit clause.
  out = out.replace(/\s+USING\s+(btree|gin|gist|hash|brin|spgist)\b/gi, "");
  // `NULLS FIRST` / `NULLS LAST` inside CREATE INDEX: SQLite indexes do
  // not accept null-ordering clauses (supported only in ORDER BY since
  // 3.30, not in index definitions at all).
  out = out.replace(/\s+NULLS\s+(FIRST|LAST)\b/gi, "");
  // `ARRAY<TEXT>` (sqlglot's normalisation of Postgres `TEXT[]`) is a
  // syntax error on SQLite. Collapse to plain `TEXT`; the runtime
  // stores arrays as JSON strings.
  out = out.replace(/\bARRAY\s*<[^>]+>/gi, "TEXT");
  // SQLite's ALTER TABLE ADD COLUMN does not accept `IF NOT EXISTS`
  // (supported in Postgres but not SQLite). Fresh-DB-on-replay means
  // the column won't exist anyway, so the guard is unneeded.
  out = out.replace(/\bADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\b/gi, "ADD COLUMN");
  return out;
}

function _assertSqlglotAvailable(): void {
  // 1. uv itself must be installed.
  const uvCheck = spawnSync("uv", ["--version"], { encoding: "utf8" });
  if (uvCheck.status !== 0) {
    throw new Error(
      "uv is required to run this script. Install it (e.g. `brew install uv` on macOS, or follow https://astral.sh/uv). See apps/desktop/migrations/README.md.",
    );
  }
  // 2. uv must be able to resolve and import sqlglot under SQLGLOT_SPEC.
  //    First run downloads sqlglot into uv's cache; subsequent runs reuse
  //    the cached env.
  const probe = spawnSync(
    "uv",
    [
      "run",
      "--quiet",
      "--with",
      SQLGLOT_SPEC,
      "python",
      "-c",
      "import sqlglot; print(sqlglot.__version__)",
    ],
    { encoding: "utf8" },
  );
  if (probe.status !== 0) {
    throw new Error(
      `Failed to resolve sqlglot via uv (spec: ${SQLGLOT_SPEC}):\n${probe.stderr}`,
    );
  }
}

function _transpileToSqlite(statements: readonly string[]): string[] {
  // Feed every kept statement to a single sqlglot invocation so we pay
  // python startup cost once per migration file rather than once per
  // statement.
  const joined = statements.join(";\n") + ";";
  const py = [
    "import sys, sqlglot",
    "sql = sys.stdin.read()",
    'out = sqlglot.transpile(sql, read="postgres", write="sqlite")',
    'print("\\n;;;SQLGLOT_DELIM;;;\\n".join(out))',
  ].join("\n");
  const result = spawnSync(
    "uv",
    ["run", "--quiet", "--with", SQLGLOT_SPEC, "python", "-c", py],
    { input: joined, encoding: "utf8" },
  );
  if (result.status !== 0) {
    throw new Error(`sqlglot transpile failed:\n${result.stderr}`);
  }
  return result.stdout
    .split("\n;;;SQLGLOT_DELIM;;;\n")
    .map((s) => {
      return s.trim();
    })
    .filter((s) => {
      return s.length > 0;
    });
}

const isDirectlyInvoked =
  import.meta.url === `file://${process.argv[1] ?? ""}` ||
  process.argv[1]?.endsWith("gen-sqlite-migrations.ts") === true;

if (isDirectlyInvoked) {
  const summary = runGenerator(SQLITE_MIGRATIONS_DIR);
  console.log(
    `[gen-sqlite-migrations] wrote ${summary.filesWritten} files; included ${summary.statementsIncluded} statements, skipped ${summary.statementsSkipped}`,
  );
}
