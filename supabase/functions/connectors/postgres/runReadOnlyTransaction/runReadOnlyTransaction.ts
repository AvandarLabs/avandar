import type {
  PostgresQueryRunner,
  PostgresSql,
} from "@sbfn/connectors/postgres/PostgresSql.types.ts";

/**
 * Runs `run` in a read-only transaction in which any single statement taking
 * longer than `statementTimeoutMs` is cancelled by the server. Read-only so
 * nothing this connector runs, even a view calling a volatile function, can
 * write to the customer's database. The timeout keeps a slow table or view
 * from holding the request until the platform kills the function.
 *
 * @returns Whatever `run` returns.
 */
export async function runReadOnlyTransaction<T>(
  options: Readonly<{
    sql: PostgresSql;
    statementTimeoutMs: number;
    run: (transaction: PostgresQueryRunner) => Promise<T>;
  }>,
): Promise<T> {
  return await options.sql.begin("read only", async (transaction) => {
    // `set_config(..., true)` scopes the timeout to this transaction, so it
    // never leaks into a server session a pooler later hands to another
    // client. A session-level `SET`, or a `statement_timeout` startup
    // parameter (which PgBouncer rejects outright), would not be safe.
    await transaction`select set_config('statement_timeout', ${String(options.statementTimeoutMs)}, true)`;
    return await options.run(transaction);
  });
}
