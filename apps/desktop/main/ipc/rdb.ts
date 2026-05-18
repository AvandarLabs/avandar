import type { SQLQueryBindings } from "bun:sqlite";
import { RdbContracts } from "../../../../shared/platform/ipc/contracts/RdbContracts.ts";
import type { AvaSqliteDatabase } from "../services/Sqlite.ts";
import type { IpcServer } from "./server.ts";

/*
 * Cast helper. The IPC contract types `params` as `unknown[]` (it has no
 * way to express bun:sqlite's binding union across the wire); on the
 * server side every value lands as a number / string / null / boolean /
 * bigint / Uint8Array, which all satisfy `SQLQueryBindings`. Bad
 * payloads surface as a bun:sqlite "wrong type" error and propagate
 * back to the caller via the reply envelope.
 */
function toBindings(params: unknown[]): SQLQueryBindings[] {
  return params as SQLQueryBindings[];
}

/**
 * Registers the `rdb.run`, `rdb.query`, and `rdb.transaction` IPC
 * handlers on `server`, bound to the given bun:sqlite database. The
 * webview's `createSqliteCrudClient` (Phase 2 Task 8) calls these via
 * `callIpc` to read and write the local metadata DB.
 *
 * Every handler treats `req.params` as positional bind arguments and
 * never interpolates them into the SQL string — the caller is
 * responsible for emitting parameterised SQL.
 *
 * @param server - Server returned by `createIpcServer`.
 * @param db - Open bun:sqlite handle to the local metadata DB.
 */
export function registerRdbHandlers(
  server: IpcServer,
  db: AvaSqliteDatabase,
): void {
  server.handle(RdbContracts.run, (req) => {
    const stmt = db.prepare(req.sql);
    const result = stmt.run(...toBindings(req.params as unknown[]));
    return {
      changes: result.changes,
      lastInsertRowid: Number(result.lastInsertRowid ?? 0),
    };
  });

  server.handle(RdbContracts.query, (req) => {
    const stmt = db.prepare(req.sql);
    const rows = stmt.all(...toBindings(req.params as unknown[])) as Array<
      Record<string, unknown>
    >;
    return { rows };
  });

  server.handle(RdbContracts.transaction, (req) => {
    const tx = db.transaction(
      (statements: ReadonlyArray<{ sql: string; params: unknown[] }>) => {
        const results: Array<{ changes: number }> = [];
        for (const s of statements) {
          const r = db.prepare(s.sql).run(...toBindings(s.params));
          results.push({ changes: r.changes });
        }
        return results;
      },
    );
    return { results: tx(req.statements) };
  });
}
