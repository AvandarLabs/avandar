import { ConnectorError } from "@sbfn/connectors/Connector.ts";
import { createPostgresConnector } from "@sbfn/connectors/postgres/createPostgresConnector/createPostgresConnector.ts";
import { describe, expect, it, vi } from "vitest";
import type { ConnectorContext } from "@sbfn/connectors/Connector.ts";

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
      }) as unknown as ConnectorContext["supabaseAdminClient"]["from"],
    };
    return client;
  }

  it("classifies listRelations' SSRF rejection instead of leaking an uncaught error", async () => {
    const connector = createPostgresConnector({ connectToPostgres: vi.fn() });
    const context: ConnectorContext = {
      workspaceId: "33333333-3333-3333-3333-333333333333",
      supabaseClient: undefined as unknown as ConnectorContext["supabaseClient"],
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
