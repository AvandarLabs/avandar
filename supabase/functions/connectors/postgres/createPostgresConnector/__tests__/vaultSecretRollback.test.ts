import { makeFakeSql } from "@sbfn/connectors/postgres/createPostgresConnector/__tests__/createPostgresConnector.fixtures.ts";
import { createPostgresConnector } from "@sbfn/connectors/postgres/createPostgresConnector/createPostgresConnector.ts";
import { describe, expect, it, vi } from "vitest";
import type { ConnectorContext } from "@sbfn/connectors/Connector.ts";

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
          // `insert` above returns either `builder` itself or a
          // differently-shaped error object, which TypeScript cannot infer
          // as one self-referencing object type without this cast.
        } as unknown as ReturnType<
          ConnectorContext["supabaseAdminClient"]["from"]
        >;
        return builder;
      }) as unknown as ConnectorContext["supabaseAdminClient"]["from"],
    };

    return { client, rpcCalls, deletedConnectionIds };
  }

  it("deletes the Vault secret and the orphaned connection row when the satellite insert fails", async () => {
    const connector = createPostgresConnector({
      connectToPostgres: vi.fn(() => {
        return makeFakeSql(() => {
          return Promise.resolve([]);
        });
      }),
    });
    const { client, rpcCalls, deletedConnectionIds } =
      _makeFailingSatelliteInsertAdminClient();

    const context: ConnectorContext = {
      workspaceId: "33333333-3333-3333-3333-333333333333",
      supabaseClient:
        undefined as unknown as ConnectorContext["supabaseClient"],
      supabaseAdminClient:
        client as unknown as ConnectorContext["supabaseAdminClient"],
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
