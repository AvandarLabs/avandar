import { DuckDBInstance } from "@duckdb/node-api";
import type { DuckDBConnection } from "@duckdb/node-api";

/**
 * An in-memory DuckDB connection for executed tests, plus a `close` that
 * releases both the connection and its backing instance.
 */
export type ExecutedDuckDb = {
  connection: DuckDBConnection;
  close: () => void;
};

/**
 * Creates an in-memory DuckDB instance and connection for a test that
 * executes real SQL. Callers own the returned `close` and must call it (or
 * use `withDuckDb` instead) so the connection and instance do not leak.
 */
export async function createExecutedDuckDb(): Promise<ExecutedDuckDb> {
  const instance = await DuckDBInstance.create(":memory:");
  const connection = await instance.connect();

  return {
    connection,
    close: (): void => {
      connection.closeSync();
      instance.closeSync();
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
  const { connection, close } = await createExecutedDuckDb();
  try {
    return await run(connection);
  } finally {
    close();
  }
}
