import { beforeEach, describe, expect, it, vi } from "vitest";
import { previewPostgresRelation } from "@/views/DataManagerApp/DataImportView/PostgresConnectorImportView/useLoadPostgresTable/previewPostgresRelation/previewPostgresRelation";
import type { DatabaseConnection } from "$/models/connections/DatabaseConnection/DatabaseConnection";

const { apiGetMock } = vi.hoisted(() => {
  return { apiGetMock: vi.fn() };
});

vi.mock("@/clients/APIClient", () => {
  return { APIClient: { get: apiGetMock } };
});

const CONNECTION_ID =
  "10000000-0000-4000-8000-000000000001" as DatabaseConnection.Id;

describe("previewPostgresRelation", () => {
  beforeEach(() => {
    apiGetMock.mockReset().mockResolvedValue({
      columns: [
        { columnName: "id", sourceType: "integer" },
        { columnName: "zip_code", sourceType: "text" },
        { columnName: "created_at", sourceType: "timestamp with time zone" },
      ],
      previewRows: [{ id: "1", zip_code: "02134", created_at: "2024-01-01" }],
    });
  });

  it("passes the relation id through unencoded, since the API client encodes every path param itself", async () => {
    // `PostgresRelationId` escapes a dot inside a name as `\.`, which is
    // exactly the character a second round of encoding would mangle.
    await previewPostgresRelation({
      connectionId: CONNECTION_ID,
      relationId: "public.orders\\.2024",
      relationKind: "table",
    });

    expect(apiGetMock).toHaveBeenCalledWith(
      expect.objectContaining({
        pathParams: expect.objectContaining({
          relationId: "public.orders\\.2024",
        }),
      }),
    );
  });

  it("types each column from its declared Postgres type, not as text across the board", async () => {
    const metadata = await previewPostgresRelation({
      connectionId: CONNECTION_ID,
      relationId: "public.customers",
      relationKind: "table",
    });

    expect(
      metadata.datasetLoadResult.columns.map((column) => {
        return [column.column_name, column.column_type];
      }),
    ).toEqual([
      ["id", "BIGINT"],
      ["zip_code", "VARCHAR"],
      ["created_at", "TIMESTAMP"],
    ]);
  });
});
