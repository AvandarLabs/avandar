import { describe, expect, it } from "vitest";
import { PostgresTableDatasetParsers } from "$/models/datasets/PostgresTableDataset/PostgresTableDatasetParsers.ts";
import type { PostgresTableDataset } from "$/models/datasets/PostgresTableDataset/PostgresTableDataset.ts";

function _dbRow(
  overrides: Partial<PostgresTableDataset.T<"DBRead">> = {},
): PostgresTableDataset.T<"DBRead"> {
  return {
    connection_id: "11111111-1111-4111-8111-111111111111",
    created_at: "2026-10-15T00:00:00.000Z",
    dataset_id: "22222222-2222-4222-8222-222222222222",
    id: "33333333-3333-4333-8333-333333333333",
    relation_kind: "table",
    schema_name: "public",
    table_name: "customers",
    updated_at: "2026-10-15T00:00:00.000Z",
    workspace_id: "44444444-4444-4444-8444-444444444444",
    ...overrides,
  };
}

describe("PostgresTableDatasetParsers", () => {
  it("reads a table row", () => {
    const model = PostgresTableDatasetParsers.fromDBReadToModelRead(_dbRow());

    expect(model.connectionId).toBe("11111111-1111-4111-8111-111111111111");
    expect(model.schemaName).toBe("public");
    expect(model.tableName).toBe("customers");
    expect(model.relationKind).toBe("table");
  });

  it("reads a view row", () => {
    const model = PostgresTableDatasetParsers.fromDBReadToModelRead(
      _dbRow({ relation_kind: "view", table_name: "active_customers" }),
    );

    expect(model.relationKind).toBe("view");
    expect(model.tableName).toBe("active_customers");
  });

  it("still rejects a row that is missing table_name", () => {
    // Proves `DBReadSchema` is still being enforced on every read.
    const { table_name: _omitted, ...withoutTableName } = _dbRow();

    expect(() => {
      return PostgresTableDatasetParsers.fromDBReadToModelRead(
        withoutTableName as PostgresTableDataset.T<"DBRead">,
      );
    }).toThrow();
  });

  it("rejects a relation_kind outside table/view", () => {
    expect(() => {
      return PostgresTableDatasetParsers.fromDBReadToModelRead(
        _dbRow({
          relation_kind: "materialized_view" as PostgresTableDataset.T<
            "DBRead"
          >["relation_kind"],
        }),
      );
    }).toThrow();
  });
});
