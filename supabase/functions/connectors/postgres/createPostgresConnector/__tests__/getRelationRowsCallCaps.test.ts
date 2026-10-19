import { ConnectorError } from "@sbfn/connectors/Connector.ts";
import {
  makeFakeSql,
  readBlobText,
} from "@sbfn/connectors/postgres/createPostgresConnector/__tests__/createPostgresConnector.fixtures.ts";
import { createPostgresConnector } from "@sbfn/connectors/postgres/createPostgresConnector/createPostgresConnector.ts";
import { describe, expect, it, vi } from "vitest";
import type { ConnectorContext } from "@sbfn/connectors/Connector.ts";
import type { PostgresSql } from "@sbfn/connectors/postgres/PostgresSql.types.ts";

describe("createPostgresConnector - getRelationRows row/byte cap enforcement", () => {
  /**
   * `getRelationRows`'s pre-read and post-read size gates both go through
   * `isWithinRelationCallCaps`, fed `postgresMaxRowsPerCall` and
   * `POSTGRES_MAX_BYTES_PER_ACQUIRE` - the same shared contract
   * `PostgresTableWrapper.ts`'s capability record advertises, rather than two
   * ad hoc `if (estimate > cap)` comparisons duplicating that contract's
   * threshold logic. These tests exercise the real enforcement path end to
   * end: a saved connection, a live (faked) query round trip, and the actual
   * `ConnectorError` the route returns.
   */
  function _makeSavedConnectionAdminClient() {
    const client = {
      rpc: vi.fn(async (name: string) => {
        if (name === "rpc_connections__get_decrypted_secret") {
          return { data: "hunter2", error: null };
        }
        return { data: null, error: null };
      }),
      from: vi.fn(() => {
        const builder = {
          select: vi.fn(() => {
            return builder;
          }),
          eq: vi.fn(() => {
            return builder;
          }),
          maybeSingle: vi.fn(async () => {
            return {
              data: {
                connection_id: "44444444-4444-4444-4444-444444444444",
                workspace_id: "33333333-3333-3333-3333-333333333333",
                host: "8.8.8.8",
                port: 5432,
                database_name: "postgres",
                username: "reader",
                ssl_mode: "disable",
                vault_secret_id: "55555555-5555-5555-5555-555555555555",
              },
              error: null,
            };
          }),
          update: vi.fn(() => {
            return builder;
          }),
        };
        return builder;
      }) as unknown as ConnectorContext["supabaseAdminClient"]["from"],
    };
    return client;
  }

  /**
   * Dispatches on each query's own text, since `getRelationRows` issues four
   * distinct queries against the same fake `sql` in sequence: the
   * still-exists check, the sized columns read, the exact row count, and the
   * full row read. `sql.unsafe(text)` (the quoted `"schema"."table"`
   * fragment in the final two queries) just echoes its argument back - this
   * fake never actually interprets SQL, so the quoted value itself is unused.
   */
  function _makeFakeSqlForRows(options: {
    rowCount: number;
    dataRows: Array<Record<string, unknown>>;
  }): PostgresSql {
    return makeFakeSql((queryText) => {
      if (queryText.includes("limit 1")) {
        return Promise.resolve([{ table_type: "BASE TABLE" }]);
      }
      if (queryText.includes("count(*)")) {
        return Promise.resolve([{ exact_count: options.rowCount }]);
      }
      if (queryText.includes("character_maximum_length")) {
        return Promise.resolve([
          {
            column_name: "id",
            data_type: "bigint",
            character_maximum_length: null,
          },
        ]);
      }
      return Object.assign(Promise.resolve(options.dataRows), {
        cursor: async function* () {
          yield options.dataRows;
        },
      });
    });
  }

  it("throws too_large, via the shared cap contract, when the pre-read estimate exceeds the byte cap", async () => {
    // A single `bigint` column is ~14 bytes/row as CSV (12 + the \r\n
    // terminator, no comma). 20,000,000 rows estimates to ~267MB, over the
    // 150MB shared cap - well before any row is actually read.
    const connectToPostgres = vi.fn(() => {
      return _makeFakeSqlForRows({ rowCount: 20_000_000, dataRows: [] });
    });
    const connector = createPostgresConnector({ connectToPostgres });
    const context: ConnectorContext = {
      workspaceId: "33333333-3333-3333-3333-333333333333",
      supabaseClient:
        undefined as unknown as ConnectorContext["supabaseClient"],
      supabaseAdminClient:
        _makeSavedConnectionAdminClient() as unknown as ConnectorContext["supabaseAdminClient"],
    };

    try {
      await connector.getRelationRows(context, {
        connectionId: "44444444-4444-4444-4444-444444444444",
        relationId: "public.customers",
        columnNames: ["id"],
      });
      expect.unreachable("Expected getRelationRows to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(ConnectorError);
      expect((error as ConnectorError).code).toBe("too_large");
    }
  });

  it("returns CSV rows when both the row count and byte estimate are within the shared caps", async () => {
    const dataRows = Array.from({ length: 10 }, (_, index) => {
      return { id: index };
    });
    const connectToPostgres = vi.fn(() => {
      return _makeFakeSqlForRows({ rowCount: dataRows.length, dataRows });
    });
    const connector = createPostgresConnector({ connectToPostgres });
    const context: ConnectorContext = {
      workspaceId: "33333333-3333-3333-3333-333333333333",
      supabaseClient:
        undefined as unknown as ConnectorContext["supabaseClient"],
      supabaseAdminClient:
        _makeSavedConnectionAdminClient() as unknown as ConnectorContext["supabaseAdminClient"],
    };

    const csv = await connector.getRelationRows(context, {
      connectionId: "44444444-4444-4444-4444-444444444444",
      relationId: "public.customers",
      columnNames: ["id"],
    });

    const csvText = await readBlobText(csv);
    expect(csvText).toContain("id");
    expect(csvText.split("\r\n")).toHaveLength(11); // header + 10 rows
  });
});
