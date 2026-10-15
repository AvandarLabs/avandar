import { describe, expect, it } from "vitest";
import { PostgresDatabaseConnectionParsers } from "$/models/DatabaseConnection/PostgresDatabaseConnection/PostgresDatabaseConnectionParsers.ts";
import type { PostgresDatabaseConnection } from "$/models/DatabaseConnection/PostgresDatabaseConnection/PostgresDatabaseConnection.ts";

function _dbRow(
  overrides: Partial<PostgresDatabaseConnection.T<"DBRead">> = {},
): PostgresDatabaseConnection.T<"DBRead"> {
  return {
    connection_id: "11111111-1111-4111-8111-111111111111",
    created_at: "2026-10-15T00:00:00.000Z",
    database_name: "reporting",
    host: "db.example.org",
    last_verified_at: null,
    port: 5432,
    ssl_mode: "require",
    updated_at: "2026-10-15T00:00:00.000Z",
    username: "readonly_user",
    vault_secret_id: "22222222-2222-4222-8222-222222222222",
    workspace_id: "33333333-3333-4333-8333-333333333333",
    ...overrides,
  };
}

describe("PostgresDatabaseConnectionParsers", () => {
  it("reads a connection row, never exposing a decrypted password field", () => {
    const model =
      PostgresDatabaseConnectionParsers.fromDBReadToModelRead(_dbRow());

    expect(model.host).toBe("db.example.org");
    expect(model.vaultSecretId).toBe("22222222-2222-4222-8222-222222222222");
    expect(model).not.toHaveProperty("password");
  });

  it("converts a null last_verified_at to undefined", () => {
    const model = PostgresDatabaseConnectionParsers.fromDBReadToModelRead(
      _dbRow({ last_verified_at: null }),
    );

    expect(model.lastVerifiedAt).toBeUndefined();
  });

  it("refuses to build an insert payload from client code", () => {
    expect(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      PostgresDatabaseConnectionParsers.fromModelInsertToDBInsert({} as any);
    }).toThrow(/external-datasets edge function/);
  });

  it("refuses to build an update payload from client code", () => {
    expect(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      PostgresDatabaseConnectionParsers.fromModelUpdateToDBUpdate({} as any);
    }).toThrow(/external-datasets edge function/);
  });
});
