import type { SQLQueryBindings } from "bun:sqlite";
import type { AvaSqliteDatabase } from "./Sqlite.ts";
import type { SupabaseRestClient } from "./SupabaseRest.ts";

/**
 * Optional logger surface so callers can pipe progress somewhere
 * meaningful (the desktop main process logs to stdout). Defaults to a
 * no-op so tests stay quiet.
 */
type Logger = {
  log: (msg: string) => void;
  error: (msg: string) => void;
};

const NOOP_LOGGER: Logger = {
  log: () => {},
  error: () => {},
};

/**
 * Pull every row of every syncable table from Supabase REST into the
 * local SQLite mirror, but only for tables that are currently empty.
 *
 * Behaviour:
 * - Foreign-key enforcement is suspended for the duration of the call
 *   so the input order does not have to match the dependency DAG. Phase
 *   3's sync engine will replace this with a per-row LWW resolver.
 * - Tables that already contain rows are skipped (`count(*) > 0`); this
 *   keeps the bootstrap idempotent across relaunches without an
 *   explicit "have I bootstrapped before" sentinel.
 * - Tables present in `tables` but absent from the local schema (e.g.
 *   `DEPRECATED_TABLES` whose `DROP TABLE` migration has already
 *   landed) are silently skipped — they cannot be inserted into.
 * - Each table's rows are inserted inside a single transaction so a
 *   partial Supabase result leaves SQLite empty (next launch retries
 *   the whole table) rather than half-populated.
 * - Object-valued columns are JSON-stringified before bind
 *   (`jsonb` ⇒ TEXT) and booleans are coerced to 0/1 (SQLite has no
 *   boolean type) so bun:sqlite's stricter binding accepts the
 *   payload.
 */
export async function bootstrapSnapshotIfNeeded(args: {
  db: AvaSqliteDatabase;
  rest: SupabaseRestClient;
  accessToken: string;
  tables: ReadonlyArray<string>;
  logger?: Logger;
}): Promise<void> {
  const { db, rest, accessToken, tables } = args;
  const logger = args.logger ?? NOOP_LOGGER;

  const liveTables = listLocalTables(db);
  const fkPragmaWasOn = readPragma(db, "foreign_keys") === 1;
  if (fkPragmaWasOn) {
    db.run("pragma foreign_keys = OFF;");
  }
  logger.log("[snapshot-bootstrap] starting");

  try {
    for (const table of tables) {
      if (!liveTables.has(table)) {
        logger.log(`[snapshot-bootstrap] skip ${table}: not in local schema`);
        continue;
      }
      const existing = readRowCount(db, table);
      if (existing > 0) {
        logger.log(
          `[snapshot-bootstrap] skip ${table}: already has ${existing} rows`,
        );
        continue;
      }

      logger.log(`[snapshot-bootstrap] fetching ${table}`);
      const rows = await rest.selectAll(table, accessToken);
      if (rows.length === 0) {
        logger.log(`[snapshot-bootstrap] ${table}: 0 rows`);
        continue;
      }

      insertRowsTransactionally(db, table, rows);
      logger.log(`[snapshot-bootstrap] ${table}: inserted ${rows.length} rows`);
    }
  } finally {
    if (fkPragmaWasOn) {
      db.run("pragma foreign_keys = ON;");
    }
    logger.log("[snapshot-bootstrap] done");
  }
}

/**
 * Snapshot of the table names in the local schema, used to skip
 * deprecated tables that exist in the manifest but no longer exist in
 * SQLite after their `DROP TABLE` migration applied.
 */
function listLocalTables(db: AvaSqliteDatabase): Set<string> {
  const rows = db
    .query<
      { name: string },
      []
    >("select name from sqlite_master where type='table'")
    .all();
  return new Set(rows.map((r) => r.name));
}

function readRowCount(db: AvaSqliteDatabase, table: string): number {
  const row = db
    .query<
      { c: number },
      []
    >(`select count(*) as c from "${table.replaceAll('"', '""')}"`)
    .get();
  return row?.c ?? 0;
}

function readPragma(db: AvaSqliteDatabase, name: string): unknown {
  const row = db.query(`pragma ${name};`).get() as
    | Record<string, unknown>
    | undefined;
  if (!row) return undefined;
  // pragma queries return a single-column row; key may be the pragma
  // name or some implementation-defined alias.
  return Object.values(row)[0];
}

function insertRowsTransactionally(
  db: AvaSqliteDatabase,
  table: string,
  rows: ReadonlyArray<Record<string, unknown>>,
): void {
  // Take the column set from the first row; Supabase REST returns a
  // dense shape (every row carries every column).
  const cols = Object.keys(rows[0]!);
  const colsClause = cols.map(quoteIdent).join(", ");
  const placeholders = cols.map(() => "?").join(", ");
  const sql = `insert into ${quoteIdent(table)} (${colsClause}) values (${placeholders})`;
  const stmt = db.prepare(sql);

  const tx = db.transaction(
    (batch: ReadonlyArray<Record<string, unknown>>) => {
      for (const row of batch) {
        stmt.run(...bindValues(cols.map((c) => row[c] ?? null)));
      }
    },
  );
  tx(rows);
}

function quoteIdent(name: string): string {
  return `"${name.replaceAll('"', '""')}"`;
}

/**
 * Coerce the values Supabase REST hands us into shapes bun:sqlite is
 * willing to bind: objects/arrays become JSON strings, booleans
 * become 0/1, everything else passes through unchanged.
 */
function bindValues(values: ReadonlyArray<unknown>): SQLQueryBindings[] {
  return values.map((v) => {
    if (v === null || v === undefined) return null;
    if (typeof v === "boolean") return v ? 1 : 0;
    if (typeof v === "object" && !(v instanceof Date)) {
      return JSON.stringify(v);
    }
    return v as SQLQueryBindings;
  });
}
