import { propEq } from "@avandar/utils";
import { createPostgresConnector } from "@sbfn/connectors/connectors/postgres/createPostgresConnector/createPostgresConnector.ts";
import { describe, expect, it, vi } from "vitest";
import type { ExternalDatasetConnectorContext } from "@sbfn/connectors/connectors/ExternalDatasetConnector.ts";
import type { PostgresConnectionConfig } from "@sbfn/connectors/connectors/postgres/PostgresConnectionConfig.ts";
import type { PostgresSql } from "@sbfn/connectors/connectors/postgres/PostgresSql.types.ts";

/**
 * SQL-injection-shaped payloads for every `test-and-save` connection-form
 * field. None of these should ever reach a raw query string or a connection
 * string built by concatenation - this file proves each field reaches the
 * driver only as a discrete, untouched property on a structured config
 * object (`PostgresConnectionConfig`), never stitched into text anywhere in
 * the call chain.
 */
const INJECTION_PAYLOAD = "'; select pg_sleep(5); --";

function _makeFakeSql(
  catalogRows: Array<{
    table_schema: string;
    table_name: string;
    table_type: string;
  }> = [],
): PostgresSql {
  const fakeSql = vi.fn(async () => {
    return catalogRows;
  }) as unknown as PostgresSql;
  fakeSql.unsafe = vi.fn(async () => {
    return [];
  });
  fakeSql.end = vi.fn(async () => {});
  return fakeSql;
}

function _makeFakeSupabaseAdminClient() {
  const insertedRows: Record<string, Array<Record<string, unknown>>> = {};
  const rpcCalls: Array<{ name: string; params: Record<string, unknown> }> = [];

  const client = {
    rpc: vi.fn(async (name: string, params: Record<string, unknown>) => {
      rpcCalls.push({ name, params });
      if (name === "rpc_db_connections__create_vault_secret") {
        return { data: "11111111-1111-1111-1111-111111111111", error: null };
      }
      return { data: null, error: null };
    }),
    from: vi.fn((table: string) => {
      const builder = {
        select: vi.fn(() => {
          return builder;
        }),
        eq: vi.fn(() => {
          return builder;
        }),
        maybeSingle: vi.fn(async () => {
          return { data: null, error: null };
        }),
        single: vi.fn(async () => {
          return {
            data: { id: "22222222-2222-2222-2222-222222222222" },
            error: null,
          };
        }),
        insert: vi.fn((row: Record<string, unknown>) => {
          insertedRows[table] = [...(insertedRows[table] ?? []), row];
          return builder;
        }),
        update: vi.fn(() => {
          return builder;
        }),
      };
      return builder;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any,
  };

  return { client, insertedRows, rpcCalls };
}

describe("createPostgresConnector - field parameterization", () => {
  it("passes every connection-form field through to the connect config untouched, never concatenated", async () => {
    let capturedConfig: PostgresConnectionConfig | undefined;
    const connectToPostgres = vi.fn((config: PostgresConnectionConfig) => {
      capturedConfig = config;
      return _makeFakeSql([
        {
          table_schema: "public",
          table_name: "customers",
          table_type: "BASE TABLE",
        },
      ]);
    });

    const connector = createPostgresConnector({ connectToPostgres });
    const { client, insertedRows, rpcCalls } = _makeFakeSupabaseAdminClient();

    const context: ExternalDatasetConnectorContext = {
      workspaceId: "33333333-3333-3333-3333-333333333333",
      // Not exercised by this connector method - only the admin client
      // matters here.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabaseClient: undefined as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabaseAdminClient: client as any,
    };

    // `host` is deliberately a plain public IP here, not the injection
    // payload: it is the one field the SSRF guard resolves via real DNS
    // before `connectToPostgres` is ever reached (a literal IP skips that
    // lookup entirely), so it is covered by its own dedicated matrix in
    // `validateHostNotPrivate.test.ts` instead. Every other field below -
    // the ones actually capable of reaching a query or a connection
    // string - carries the payload.
    const result = await connector.testAndSaveConnection(context, {
      workspaceId: context.workspaceId,
      name: INJECTION_PAYLOAD,
      host: "8.8.8.8",
      port: 5432,
      databaseName: INJECTION_PAYLOAD,
      username: INJECTION_PAYLOAD,
      password: INJECTION_PAYLOAD,
      sslMode: "require",
    });

    expect(connectToPostgres).toHaveBeenCalledTimes(1);
    expect(capturedConfig).toEqual({
      host: "8.8.8.8",
      port: 5432,
      database: INJECTION_PAYLOAD,
      username: INJECTION_PAYLOAD,
      password: INJECTION_PAYLOAD,
      ssl: "require",
    });

    // The Vault RPC received the password as a bound parameter value, not
    // embedded in any query text.
    const createSecretCall = rpcCalls.find(
      propEq("name", "rpc_db_connections__create_vault_secret"),
    );
    expect(createSecretCall?.params.p_secret).toBe(INJECTION_PAYLOAD);

    // The persisted row carries the raw payload as a plain object property,
    // never interpolated into a string anywhere along the way.
    const connectionRow = insertedRows["db_connections__postgres"]?.[0];
    expect(connectionRow?.host).toBe("8.8.8.8");
    expect(connectionRow?.username).toBe(INJECTION_PAYLOAD);
    expect(connectionRow?.database_name).toBe(INJECTION_PAYLOAD);

    expect(result.relations).toEqual([
      {
        relationId: "public.customers",
        label: "public.customers",
        kind: "table",
      },
    ]);
  });

  it("maps 'disable' sslMode to ssl: false, never a truthy passthrough of the string", async () => {
    let capturedConfig: PostgresConnectionConfig | undefined;
    const connectToPostgres = vi.fn((config: PostgresConnectionConfig) => {
      capturedConfig = config;
      return _makeFakeSql([]);
    });
    const connector = createPostgresConnector({ connectToPostgres });
    const { client } = _makeFakeSupabaseAdminClient();

    const context: ExternalDatasetConnectorContext = {
      workspaceId: "33333333-3333-3333-3333-333333333333",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabaseClient: undefined as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabaseAdminClient: client as any,
    };

    await connector.testAndSaveConnection(context, {
      workspaceId: context.workspaceId,
      name: "local",
      host: "8.8.8.8",
      port: 5432,
      databaseName: "postgres",
      username: "reader",
      password: "hunter2",
      sslMode: "disable",
    });

    expect(capturedConfig?.ssl).toBe(false);
  });

  it("refuses a loopback host before ever calling connectToPostgres (SSRF guard runs first)", async () => {
    const connectToPostgres = vi.fn();
    const connector = createPostgresConnector({ connectToPostgres });
    const { client } = _makeFakeSupabaseAdminClient();

    const context: ExternalDatasetConnectorContext = {
      workspaceId: "33333333-3333-3333-3333-333333333333",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabaseClient: undefined as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabaseAdminClient: client as any,
    };

    await expect(
      connector.testAndSaveConnection(context, {
        workspaceId: context.workspaceId,
        name: "local",
        host: "127.0.0.1",
        port: 5432,
        databaseName: "postgres",
        username: "reader",
        password: "hunter2",
        sslMode: "disable",
      }),
    ).rejects.toThrow();

    expect(connectToPostgres).not.toHaveBeenCalled();
  });
});
