import type { DuckDBConnection } from "@duckdb/node-api";

import { DuckDBInstance } from "@duckdb/node-api";

/**
 * An in-memory DuckDB connection for executed tests, plus a `close` that
 * releases both the connection and its backing instance. Not exported:
 * `withDuckDb` is the only supported way to obtain one, since a raw
 * `close` that a caller might forget to invoke reintroduces the leak this
 * module exists to prevent.
 */
type _ExecutedDuckDb = {
  connection: DuckDBConnection;
  close: () => void;
};

/**
 * Creates an in-memory DuckDB instance and connection for a test that
 * executes real SQL. `close` releases the connection first and the
 * instance second, closing the instance even if closing the connection
 * throws. Not exported: use `withDuckDb` so `close` is always called.
 */
async function _createExecutedDuckDb(): Promise<_ExecutedDuckDb> {
  const instance = await DuckDBInstance.create(":memory:");
  const connection = await instance.connect();

  return {
    connection,
    close: (): void => {
      try {
        connection.closeSync();
      } finally {
        instance.closeSync();
      }
    },
  };
}

/**
 * Runs `run` with a fresh in-memory DuckDB connection and guarantees the
 * connection and its instance are closed afterward, even if `run` throws.
 */
export async function withDuckDb<T>(
  run: (connection: DuckDBConnection) => Promise<T>,
): Promise<T> {
  const { connection, close } = await _createExecutedDuckDb();
  try {
    return await run(connection);
  } finally {
    close();
  }
}
