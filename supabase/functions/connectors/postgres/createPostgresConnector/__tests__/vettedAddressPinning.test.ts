import {
  makeFakeSql,
  makeSavedConnectionContext,
  SAVED_CONNECTION_ID,
} from "@sbfn/connectors/postgres/createPostgresConnector/__tests__/createPostgresConnector.fixtures.ts";
import { createPostgresConnector } from "@sbfn/connectors/postgres/createPostgresConnector/createPostgresConnector.ts";
import { describe, expect, it, vi } from "vitest";
import type { PostgresConnectionConfig } from "@sbfn/connectors/postgres/PostgresConnectionConfig.ts";

describe("createPostgresConnector - connecting to the vetted address", () => {
  it("opens a saved connection to the address the SSRF check vetted, keeping the hostname only for TLS", async () => {
    const connectToPostgres = vi.fn((_config: PostgresConnectionConfig) => {
      return makeFakeSql(() => {
        return Promise.resolve([]);
      });
    });
    const getSafeAddressFromHost = vi.fn(async () => {
      return "203.0.113.7";
    });
    const connector = createPostgresConnector({
      connectToPostgres,
      getSafeAddressFromHost,
    });

    await connector.listRelations(
      makeSavedConnectionContext("db.example.org"),
      SAVED_CONNECTION_ID,
    );

    expect(getSafeAddressFromHost).toHaveBeenCalledWith("db.example.org");
    expect(connectToPostgres).toHaveBeenCalledWith(
      expect.objectContaining({
        host: "203.0.113.7",
        tlsServerName: "db.example.org",
      }),
    );
  });

  it("tests a new connection against the vetted address too", async () => {
    const connectToPostgres = vi.fn((_config: PostgresConnectionConfig) => {
      return makeFakeSql(() => {
        return Promise.resolve([]);
      });
    });
    const connector = createPostgresConnector({
      connectToPostgres,
      getSafeAddressFromHost: async () => {
        return "203.0.113.8";
      },
    });

    // Test-and-save fails afterwards on the fake admin client, but it opens
    // the connection first, which is all this test checks.
    await connector
      .testAndSaveConnection(makeSavedConnectionContext("db.example.org"), {
        workspaceId: "33333333-3333-3333-3333-333333333333",
        name: "Reporting",
        host: "db.example.org",
        port: 5432,
        databaseName: "reporting",
        username: "reader",
        password: "hunter2",
        sslMode: "require",
      })
      .catch(() => {});

    expect(connectToPostgres).toHaveBeenCalledWith(
      expect.objectContaining({
        host: "203.0.113.8",
        tlsServerName: "db.example.org",
      }),
    );
  });
});
