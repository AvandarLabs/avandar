import { identity } from "@avandar/utils";
import { runReadOnlyTransaction } from "@sbfn/connectors/postgres/runReadOnlyTransaction/runReadOnlyTransaction.ts";
import { describe, expect, it, vi } from "vitest";
import type {
  PostgresQueryRunner,
  PostgresSql,
} from "@sbfn/connectors/postgres/PostgresSql.types.ts";

/** A fake connection that records each query and the transaction mode. */
function _makeRecordingSql(): {
  sql: PostgresSql;
  queries: Array<{ text: string; values: unknown[] }>;
} {
  const queries: Array<{ text: string; values: unknown[] }> = [];
  const transaction = vi.fn(
    (strings: TemplateStringsArray, ...values: unknown[]) => {
      queries.push({ text: strings.join("?"), values });
      return Promise.resolve([]);
    },
  ) as unknown as PostgresQueryRunner;
  transaction.unsafe = vi.fn(identity);
  const sql = {
    begin: vi.fn(
      async (
        _options: string,
        run: (runner: PostgresQueryRunner) => Promise<unknown>,
      ) => {
        return run(transaction);
      },
    ),
  } as unknown as PostgresSql;
  return { sql, queries };
}

describe("runReadOnlyTransaction", () => {
  it("runs inside a read-only transaction, so the connector can never write to the remote database", async () => {
    const { sql } = _makeRecordingSql();

    await runReadOnlyTransaction({
      sql,
      statementTimeoutMs: 15_000,
      run: async () => {
        return "done";
      },
    });

    expect(sql.begin).toHaveBeenCalledWith("read only", expect.any(Function));
  });

  it("sets a transaction-local statement timeout before running anything else", async () => {
    const { sql, queries } = _makeRecordingSql();

    const result = await runReadOnlyTransaction({
      sql,
      statementTimeoutMs: 15_000,
      run: async (transaction) => {
        await transaction`select 1`;
        return "done";
      },
    });

    expect(result).toBe("done");
    expect(queries[0]?.text).toContain("set_config('statement_timeout'");
    // `true` makes the setting transaction-local.
    expect(queries[0]?.text).toContain("true");
    expect(queries[0]?.values).toEqual(["15000"]);
    expect(queries[1]?.text).toContain("select 1");
  });
});
