/**
 * How `createSqliteCrudClient` reaches a SQLite database.
 *
 * The host supplies the transport, which keeps `@avandar/clients` free of any
 * Avandar-specific binding and lets the client work against any SQLite
 * implementation (Electrobun IPC, better-sqlite3, a remote HTTP endpoint, or a
 * fake in tests).
 *
 * Do not reach for Avandar's `callIpc` or `RdbContracts` from this package
 * instead. That would make `@avandar/clients` depend on the desktop app's IPC
 * layer, which makes the package unpublishable.
 *
 * The two methods mirror the only operations the client performs: a statement
 * that returns rows, and a statement that does not.
 */
export type SqliteTransport = {
  /**
   * Run a statement that returns rows, e.g. `select` or
   * `insert … returning`.
   */
  query: (request: {
    sql: string;
    params: unknown[];
  }) => Promise<{ rows: Array<Record<string, unknown>> }>;

  /** Run a statement that returns no rows, e.g. `delete`. */
  run: (request: {
    sql: string;
    params: unknown[];
  }) => Promise<{ changes: number; lastInsertRowid: number }>;
};
