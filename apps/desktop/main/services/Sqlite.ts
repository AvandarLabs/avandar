import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { Database } from "bun:sqlite";

/**
 * The bun:sqlite Database handle the rest of the desktop main process
 * works with. Aliased so call sites only depend on this module.
 */
export type AvaSqliteDatabase = Database;

/**
 * A single migration step. `name` is the filename (used both for ordering
 * and as the primary key in `_schema_migrations`); `sql` is the raw SQL
 * the runner will execute.
 */
export type Migration = {
  readonly name: string;
  readonly sql: string;
};

/**
 * Opens (creating if needed) a bun:sqlite database file at `filePath`.
 *
 * Ensures the parent directory exists, then enables Write-Ahead Logging
 * (better concurrent-read characteristics for the webview→Bun-main IPC
 * workload) and foreign key enforcement (off by default in SQLite).
 *
 * @param filePath - Absolute path where the database should live.
 * @returns A ready-to-use bun:sqlite Database.
 */
export function openSqliteDatabase(filePath: string): AvaSqliteDatabase {
  mkdirSync(dirname(filePath), { recursive: true });
  const db = new Database(filePath, { create: true });
  db.run("pragma journal_mode = WAL;");
  db.run("pragma foreign_keys = ON;");
  return db;
}

/**
 * Applies any pending migrations to `db` in input order. Maintains an
 * internal `_schema_migrations(name, applied_at)` bookkeeping table.
 *
 * Invariants:
 * - Every migration already recorded in the DB must appear, in the same
 *   order, at the head of `migrations` — otherwise the runner throws
 *   `migration history mismatch` (caller built the input from a stale or
 *   re-ordered manifest).
 * - The batch of new migrations is wrapped in a single transaction so a
 *   failing statement rolls back everything (including the bookkeeping
 *   inserts), leaving the DB on the last successfully-applied migration.
 * - Calling with the same input twice is a no-op on the second call.
 *
 * @param db - Open database handle from {@link openSqliteDatabase}.
 * @param migrations - Ordered list of migrations the caller believes the
 *   DB should be at. The runner applies whichever ones are not yet in
 *   `_schema_migrations`.
 */
export function runMigrations(
  db: AvaSqliteDatabase,
  migrations: ReadonlyArray<Migration>,
): void {
  db.run(`
    create table if not exists _schema_migrations (
      name text primary key,
      applied_at integer not null
    );
  `);

  const applied = db
    .query<
      { name: string },
      []
    >("select name from _schema_migrations order by name")
    .all()
    .map((r) => r.name);

  for (let i = 0; i < applied.length; i++) {
    if (migrations[i]?.name !== applied[i]) {
      throw new Error(
        `migration history mismatch: db has ${applied[i]} at index ${i}, ` +
          `but caller provided ${migrations[i]?.name ?? "<none>"}`,
      );
    }
  }

  const toApply = migrations.slice(applied.length);
  if (toApply.length === 0) return;

  const tx = db.transaction((batch: ReadonlyArray<Migration>) => {
    for (const m of batch) {
      if (hasExecutableSql(m.sql)) {
        db.run(m.sql);
      }
      db.run(
        "insert into _schema_migrations (name, applied_at) values (?, ?);",
        [m.name, Date.now()],
      );
    }
  });

  tx(toApply);
}

/**
 * True iff `sql` contains at least one non-comment, non-whitespace
 * token. Generated `.gen.sql` files are comment-only when the upstream
 * Postgres migration was pure RLS / function / data backfill — they
 * carry no schema-shape statements, so the runner must record them in
 * `_schema_migrations` (to keep history in step with the manifest) but
 * must not hand the all-comment body to bun:sqlite, which errors with
 * "Query contained no valid SQL statement".
 *
 * Strips `--` line comments and `slash-star ... star-slash` block
 * comments and checks whether anything remains.
 */
function hasExecutableSql(sql: string): boolean {
  const stripped = sql
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/--[^\n]*/g, "")
    .trim();
  return stripped.length > 0;
}
