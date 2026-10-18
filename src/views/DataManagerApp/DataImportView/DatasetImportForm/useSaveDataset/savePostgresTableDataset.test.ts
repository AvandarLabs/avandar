import { describe, expect, it, vi } from "vitest";
import { savePostgresTableDataset } from "@/views/DataManagerApp/DataImportView/DatasetImportForm/useSaveDataset/savePostgresTableDataset";
import type { DatabaseConnection } from "$/models/connections/DatabaseConnection/DatabaseConnection";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { DuckDbColumnSchema } from "@/clients/DuckDbClient/DuckDbClient.types";
import type { DataSourceMetadata } from "@/views/DataManagerApp/DataImportView/DatasetImportForm/DatasetImportForm.types";

const { insertPostgresTableDatasetMock } = vi.hoisted(() => {
  return { insertPostgresTableDatasetMock: vi.fn() };
});

vi.mock("@/clients/datasets/DatasetClient/DatasetClient", () => {
  return {
    DatasetClient: { insertPostgresTableDataset: insertPostgresTableDatasetMock },
  };
});

function _column(
  columnName: string,
  columnType: DuckDbColumnSchema["column_type"],
): DuckDbColumnSchema {
  return {
    column_name: columnName,
    column_type: columnType,
    default: undefined,
    extra: null,
    key: null,
    null: "YES",
  };
}

describe("savePostgresTableDataset", () => {
  it("stores each column as text on the wire and its declared type as the queryable type", async () => {
    const payload = {
      sourceType: "postgres_table",
      connectionId: "10000000-0000-4000-8000-000000000001" as DatabaseConnection.Id,
      datasetLoadResult: {
        datasetId: "30000000-0000-4000-8000-000000000001" as Dataset.Id,
        schemaName: "public",
        tableName: "customers",
        relationKind: "table",
        columns: [_column("id", "BIGINT"), _column("zip_code", "VARCHAR")],
      },
      parseOptions: { type: "postgres_table" },
    } as unknown as Extract<
      DataSourceMetadata,
      { sourceType: "postgres_table" }
    >;

    await savePostgresTableDataset({
      context: {
        datasetDescription: "",
        datasetName: "Customers",
        workspaceId: "00000000-0000-4000-8000-000000000002" as Workspace.Id,
      },
      payload,
    });

    const { columns } = insertPostgresTableDatasetMock.mock.calls[0]?.[0] as {
      columns: Array<Record<string, unknown>>;
    };
    expect(
      columns.map((column) => {
        return [
          column.name,
          column.detected_data_type,
          column.data_type,
          column.original_data_type,
        ];
      }),
    ).toEqual([
      ["id", "VARCHAR", "bigint", "BIGINT"],
      ["zip_code", "VARCHAR", "varchar", "VARCHAR"],
    ]);
  });
});
