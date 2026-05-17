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

/**
 * A single SQL statement extracted from a migration file, plus the names
 * of every Postgres table it references. The partition logic in
 * {@link partitionStatements} keys off `tables`; the raw `sql` is what gets
 * transpiled to SQLite.
 */
export type Statement = {
  tables: string[];
  sql: string;
};

/**
 * Result of partitioning a batch of statements against the manifest.
 * `unknown` always blocks generation: every Postgres table must be
 * explicitly categorised before the generator will emit anything.
 */
export type PartitionResult = {
  included: Statement[];
  skipped: Statement[];
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
 * Partition statements by their table membership against the manifest.
 *
 * - Statement touches at least one unknown table -> `unknown`.
 *   (Includes the "mix of syncable and excluded" case: the engineer must
 *   make an explicit call by adjusting the SQL or the manifest.)
 * - Statement touches only excluded tables -> `skipped`.
 * - Statement touches only syncable tables -> `included`.
 * - Statement references no tables at all (CREATE EXTENSION, comments,
 *   SET, etc.) -> `skipped`, on the grounds that nothing user-owned
 *   depends on it for SQLite.
 *
 * @param options - Parsed statements plus the syncable / excluded manifest.
 * @returns The three buckets. `unknown` being non-empty is a generator
 *   error in the orchestration layer; the function itself does not throw.
 */
export function partitionStatements(
  options: Readonly<PartitionStatementsOptions>,
): PartitionResult {
  const { statements, syncable, excluded } = options;
  const included: Statement[] = [];
  const skipped: Statement[] = [];
  const unknown: Statement[] = [];

  statements.forEach((stmt) => {
    if (stmt.tables.length === 0) {
      skipped.push(stmt);
      return;
    }

    const hasUnknown = stmt.tables.some((t) => {
      return !syncable.includes(t) && !excluded.includes(t);
    });
    if (hasUnknown) {
      unknown.push(stmt);
      return;
    }

    const allExcluded = stmt.tables.every((t) => {
      return excluded.includes(t);
    });
    if (allExcluded) {
      skipped.push(stmt);
      return;
    }

    const allSyncable = stmt.tables.every((t) => {
      return syncable.includes(t);
    });
    if (allSyncable) {
      included.push(stmt);
      return;
    }

    // Mix of syncable + excluded: ambiguous, surface for engineer review.
    unknown.push(stmt);
  });

  return { included, skipped, unknown };
}

/**
 * Split a raw SQL blob into statements and identify every table each
 * statement references. The parser is intentionally simple: it strips
 * line / block comments, splits on unquoted semicolons, then scans each
 * statement for `CREATE TABLE`, `ALTER TABLE`, `CREATE INDEX ... ON`,
 * `DROP TABLE`, and `REFERENCES` clauses.
 *
 * It is not a real SQL parser; if a migration uses syntax this misses,
 * the generator will see `tables: []` and mark the statement as skipped
 * even when it should be included. In that case extend the patterns here
 * rather than working around it in the manifest.
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
      return { sql, tables: _findTableNames(sql) };
    });
}

function _stripComments(raw: string): string {
  // Remove /* ... */ blocks first (greedy across newlines), then -- lines.
  const noBlock = raw.replace(/\/\*[\s\S]*?\*\//g, "");
  return noBlock.replace(/--[^\n]*/g, "");
}

function _splitOnUnquotedSemicolons(raw: string): string[] {
  const out: string[] = [];
  let current = "";
  let inSingle = false;
  let inDouble = false;

  for (let i = 0; i < raw.length; i += 1) {
    const ch = raw[i]!;
    if (!inDouble && ch === "'") {
      inSingle = !inSingle;
      current += ch;
      continue;
    }
    if (!inSingle && ch === '"') {
      inDouble = !inDouble;
      current += ch;
      continue;
    }
    if (ch === ";" && !inSingle && !inDouble) {
      out.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  if (current.trim().length > 0) {
    out.push(current);
  }
  return out;
}

function _findTableNames(sql: string): string[] {
  // Normalise whitespace but preserve identifier characters.
  const found = new Set<string>();
  // Patterns: `(create|alter|drop) table [if not exists] [public.]"name"`
  // and `create [unique] index ... on [public.]"name"`
  // and `references [public.]"name" (...)`.
  const patterns: RegExp[] = [
    /\b(?:create|alter|drop)\s+table\s+(?:if\s+not\s+exists\s+)?(?:if\s+exists\s+)?(?:"?public"?\.)?"?([a-zA-Z_][a-zA-Z0-9_]*)"?/gi,
    /\bcreate\s+(?:unique\s+)?index\s+(?:concurrently\s+)?(?:if\s+not\s+exists\s+)?(?:[a-zA-Z_][a-zA-Z0-9_]*\s+)?on\s+(?:"?public"?\.)?"?([a-zA-Z_][a-zA-Z0-9_]*)"?/gi,
    /\breferences\s+(?:"?public"?\.)?"?([a-zA-Z_][a-zA-Z0-9_]*)"?/gi,
  ];
  patterns.forEach((re) => {
    [...sql.matchAll(re)].forEach((match) => {
      const tableName = match[1];
      if (tableName !== undefined) {
        found.add(tableName);
      }
    });
  });
  return [...found];
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
export function runGenerator(outDir: string): {
  filesWritten: number;
  statementsIncluded: number;
  statementsSkipped: number;
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
      const tables = [
        ...new Set(
          partition.unknown.flatMap((s) => {
            return s.tables;
          }),
        ),
      ];
      throw new Error(
        `gen-sqlite-migrations: ${sourceFile} touches uncategorised tables: ${tables.join(", ")}. Add each one to either SYNCABLE_TABLES or EXCLUDED_TABLES in apps/desktop/sync/syncable-tables.ts and re-run.`,
      );
    }

    statementsIncluded += partition.included.length;
    statementsSkipped += partition.skipped.length;

    if (partition.included.length === 0) {
      return;
    }

    const transpiled = _transpileToSqlite(
      partition.included.map((s) => {
        return s.sql;
      }),
    );
    const body = transpiled.join(";\n\n") + ";\n";
    const outName = sourceFile.replace(/\.sql$/i, ".gen.sql");
    writeFileSync(join(outDir, outName), body);
    filesWritten += 1;
  });

  return { filesWritten, statementsIncluded, statementsSkipped };
}

function _assertSqlglotAvailable(): void {
  const probe = spawnSync(
    "python3",
    ["-c", "import sqlglot; print(sqlglot.__version__)"],
    { encoding: "utf8" },
  );
  if (probe.status !== 0) {
    throw new Error(
      "python3 + sqlglot are required to run this script. See apps/desktop/migrations/README.md for setup.",
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
  const result = spawnSync("python3", ["-c", py], {
    input: joined,
    encoding: "utf8",
  });
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
