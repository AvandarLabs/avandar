/*
 * Native DuckDB service for the Bun-main process.
 *
 * Wraps the `duckdb` Node binding (same package `@avandar/etl` uses) so
 * the desktop shell can run analytical SQL against an on-disk DuckDB file
 * without paying the duckdb-wasm tax in the webview. The IPC handlers in
 * `apps/desktop/main/ipc/duckdb.ts` are the only consumer in Phase 2; the
 * webview adapter (`shared/platform/desktop/DesktopDuckDbClient.ts`) calls
 * those handlers through the typed contracts.
 *
 * API surface intentionally mirrors what `DuckDbContracts.runRawQuery`
 * promises across the wire: a single `runRawQuery<TRow>(sql, params)` plus
 * `close()`. The richer ingest/export helpers stay in the IPC handler layer
 * so this module is just the typed shim over the callback-based binding.
 */

import duckdb from "duckdb";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

/**
 * Public surface of the native DuckDB service. The IPC handler layer is
 * the sole consumer for now.
 */
export type DuckDbService = {
  runRawQuery<TRow>(sql: string, params: readonly unknown[]): Promise<TRow[]>;
  close(): Promise<void>;
};

/**
 * Opens (creating if needed) a DuckDB database file at `filePath` and
 * returns a {@link DuckDbService} bound to a single connection. The handle
 * is callback-based; this wrapper promisifies `all` and `close` so call
 * sites can `await` like every other Bun-main service.
 *
 * The connection is opened eagerly: a failure to load the native binding
 * (wrong arch, missing prebuild) surfaces synchronously at boot rather
 * than on the first query.
 *
 * @param filePath - Absolute path where the DuckDB file should live.
 * @returns A ready-to-use {@link DuckDbService}.
 */
export function createDuckDbService(filePath: string): DuckDbService {
  mkdirSync(dirname(filePath), { recursive: true });
  const db = new duckdb.Database(filePath);
  const conn = db.connect();

  const runRawQuery = <TRow>(
    sql: string,
    params: readonly unknown[],
  ): Promise<TRow[]> => {
    return new Promise((resolve, reject) => {
      const callback = (err: Error | null, rows: TRow[]): void => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      };
      /*
       * The `duckdb` Node binding's `Connection.all` is variadic:
       * `(sql, ...bindings, callback)`. TS can't narrow `[sql,
       * ...params, callback]` to the binding's tuple type, so dispatch
       * via `Function.prototype.apply` to keep the call site honest
       * about what's happening on the wire.
       */
      (conn.all as (...a: unknown[]) => void).apply(conn, [
        sql,
        ...params,
        callback,
      ]);
    });
  };

  const close = (): Promise<void> => {
    return new Promise<void>((resolve, reject) => {
      conn.close((connErr: Error | null) => {
        if (connErr) {
          reject(connErr);
          return;
        }
        db.close((dbErr: Error | null) => {
          if (dbErr) {
            reject(dbErr);
          } else {
            resolve();
          }
        });
      });
    });
  };

  return { runRawQuery, close };
}
