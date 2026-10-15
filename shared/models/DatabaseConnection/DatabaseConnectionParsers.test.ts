import { describe, expect, it } from "vitest";
import { DatabaseConnectionParsers } from "$/models/DatabaseConnection/DatabaseConnectionParsers.ts";
import type { DatabaseConnection } from "$/models/DatabaseConnection/DatabaseConnection.ts";

function _dbRow(
  overrides: Partial<DatabaseConnection.T<"DBRead">> = {},
): DatabaseConnection.T<"DBRead"> {
  return {
    connection_type: "postgres",
    created_at: "2026-10-15T00:00:00.000Z",
    created_by: "11111111-1111-4111-8111-111111111111",
    id: "22222222-2222-4222-8222-222222222222",
    name: "Prod reporting replica",
    updated_at: "2026-10-15T00:00:00.000Z",
    workspace_id: "33333333-3333-4333-8333-333333333333",
    ...overrides,
  };
}

describe("DatabaseConnectionParsers", () => {
  it("reads a connection row", () => {
    const model = DatabaseConnectionParsers.fromDBReadToModelRead(_dbRow());

    expect(model.name).toBe("Prod reporting replica");
    expect(model.connectionType).toBe("postgres");
  });

  it("converts a null created_by to undefined", () => {
    const model = DatabaseConnectionParsers.fromDBReadToModelRead(
      _dbRow({ created_by: null }),
    );

    expect(model.createdBy).toBeUndefined();
  });

  it("refuses to build an insert payload from client code", () => {
    expect(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      DatabaseConnectionParsers.fromModelInsertToDBInsert({} as any);
    }).toThrow(/external-datasets edge function/);
  });

  it("refuses to build an update payload from client code", () => {
    expect(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      DatabaseConnectionParsers.fromModelUpdateToDBUpdate({} as any);
    }).toThrow(/external-datasets edge function/);
  });
});
