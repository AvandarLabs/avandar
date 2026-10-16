import { propEq } from "@avandar/utils";
import { ConnectorError } from "@sbfn/connectors/Connector.ts";
import { createPostgresConnector } from "@sbfn/connectors/postgres/createPostgresConnector/createPostgresConnector.ts";
import { describe, expect, it, vi } from "vitest";
import type { ConnectorContext } from "@sbfn/connectors/Connector.ts";
import type { PostgresConnectionConfig } from "@sbfn/connectors/postgres/PostgresConnectionConfig.ts";
import type { PostgresSql } from "@sbfn/connectors/postgres/PostgresSql.types.ts";

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
  fakeSql.end = vi.fn(async () => {});
  return fakeSql;
}

function _makeFakeSupabaseAdminClient() {
  const insertedRows: Record<string, Array<Record<string, unknown>>> = {};
  const rpcCalls: Array<{ name: string; params: Record<string, unknown> }> = [];

  const client = {
    rpc: vi.fn(async (name: string, params: Record<string, unknown>) => {
      rpcCalls.push({ name, params });
      if (name === "rpc_connections__create_vault_secret") {
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

    const context: ConnectorContext = {
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
      propEq("name", "rpc_connections__create_vault_secret"),
    );
    expect(createSecretCall?.params.p_secret).toBe(INJECTION_PAYLOAD);

    // The persisted row carries the raw payload as a plain object property,
    // never interpolated into a string anywhere along the way.
    const connectionRow = insertedRows["connections__postgres"]?.[0];
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

    const context: ConnectorContext = {
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

    const context: ConnectorContext = {
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

  it("refuses a loopback host with the host_not_allowed code, not a generic 'unknown'", async () => {
    const connector = createPostgresConnector({ connectToPostgres: vi.fn() });
    const { client } = _makeFakeSupabaseAdminClient();

    const context: ConnectorContext = {
      workspaceId: "33333333-3333-3333-3333-333333333333",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabaseClient: undefined as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabaseAdminClient: client as any,
    };

    try {
      await connector.testAndSaveConnection(context, {
        workspaceId: context.workspaceId,
        name: "local",
        host: "127.0.0.1",
        port: 5432,
        databaseName: "postgres",
        username: "reader",
        password: "hunter2",
        sslMode: "disable",
      });
      expect.unreachable("Expected testAndSaveConnection to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(ConnectorError);
      expect((error as ConnectorError).code).toBe("host_not_allowed");
    }
  });
});

describe("createPostgresConnector - rolls back an orphaned Vault secret", () => {
  /**
   * A client whose `connections__postgres` insert fails after the
   * `connections` row and the Vault secret both already succeeded - the
   * exact partial-failure shape `_createConnection` has no try/catch around
   * today without this rollback.
   */
  function _makeFailingSatelliteInsertAdminClient() {
    const rpcCalls: Array<{ name: string; params: Record<string, unknown> }> =
      [];
    const deletedConnectionIds: string[] = [];

    const client = {
      rpc: vi.fn(async (name: string, params: Record<string, unknown>) => {
        rpcCalls.push({ name, params });
        if (name === "rpc_connections__create_vault_secret") {
          return { data: "11111111-1111-1111-1111-111111111111", error: null };
        }
        return { data: null, error: null };
      }),
      from: vi.fn((table: string) => {
        const builder = {
          select: vi.fn(() => {
            return builder;
          }),
          eq: vi.fn((_column: string, value: string) => {
            if (table === "connections") {
              deletedConnectionIds.push(value);
            }
            return builder;
          }),
          single: vi.fn(async () => {
            return {
              data: { id: "22222222-2222-2222-2222-222222222222" },
              error: null,
            };
          }),
          insert: vi.fn(() => {
            if (table === "connections__postgres") {
              return Promise.resolve({
                error: { message: "insert failed" },
              });
            }
            return builder;
          }),
          delete: vi.fn(() => {
            return builder;
          }),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any;
        return builder;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as any,
    };

    return { client, rpcCalls, deletedConnectionIds };
  }

  it("deletes the Vault secret and the orphaned connection row when the satellite insert fails", async () => {
    const connector = createPostgresConnector({
      connectToPostgres: vi.fn(() => {
        return _makeFakeSql([]);
      }),
    });
    const { client, rpcCalls, deletedConnectionIds } =
      _makeFailingSatelliteInsertAdminClient();

    const context: ConnectorContext = {
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
        host: "8.8.8.8",
        port: 5432,
        databaseName: "postgres",
        username: "reader",
        password: "hunter2",
        sslMode: "disable",
      }),
    ).rejects.toThrow();

    expect(rpcCalls).toContainEqual(
      expect.objectContaining({
        name: "rpc_connections__delete_vault_secret",
        params: {
          p_secret_id: "11111111-1111-1111-1111-111111111111",
          p_workspace_id: "33333333-3333-3333-3333-333333333333",
        },
      }),
    );
    expect(deletedConnectionIds).toContain(
      "22222222-2222-2222-2222-222222222222",
    );
  });
});

describe("createPostgresConnector - SSRF re-check on an already-saved connection", () => {
  /**
   * `listRelations`/`previewRelation`/`getRelationRows` all re-run the SSRF
   * guard against a saved connection's stored host before opening a live
   * connection (never trusting a previously-saved host as still safe). This
   * pins that a rejection from that re-check comes back as a classified
   * `ConnectorError`, the same as every other connector failure, rather than
   * an unclassified error the route layer would otherwise turn into a raw
   * 500 - that gap previously existed because the SSRF check ran outside
   * each method's own try/catch.
   */
  function _makeSavedLoopbackConnectionAdminClient() {
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
                host: "127.0.0.1",
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as any,
    };
    return client;
  }

  it("classifies listRelations' SSRF rejection instead of leaking an uncaught error", async () => {
    const connector = createPostgresConnector({ connectToPostgres: vi.fn() });
    const context: ConnectorContext = {
      workspaceId: "33333333-3333-3333-3333-333333333333",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabaseClient: undefined as any,
      supabaseAdminClient:
        _makeSavedLoopbackConnectionAdminClient() as unknown as ConnectorContext["supabaseAdminClient"],
    };

    try {
      await connector.listRelations(
        context,
        "44444444-4444-4444-4444-444444444444",
      );
      expect.unreachable("Expected listRelations to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(ConnectorError);
      expect((error as ConnectorError).code).toBe("host_not_allowed");
    }
  });
});
