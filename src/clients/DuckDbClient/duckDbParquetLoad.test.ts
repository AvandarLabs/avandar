import { describe, expect, it, vi } from "vitest";
import { TRUSTED_INTERNAL_SQL } from "@/clients/DuckDbClient/duckDbClientOperations";
import { loadParquetIntoDuckDb } from "@/clients/DuckDbClient/duckDbParquetLoad";
import type { DatasetDuckDbLease } from "@/clients/DuckDbClient/DatasetDuckDbCoordinator/DatasetDuckDbCoordinator";
import type { DuckDbClientOperations } from "@/clients/DuckDbClient/duckDbClientOperations";

vi.mock("@/clients/DuckDbClient/duckDbFileRegistry", () => {
  return { registerParquetFile: vi.fn(async () => {}) };
});

/** A concept spine's table name, which resolves to no relation. */
const SPINE_TABLE_NAME =
  "concept_d6dddc05-d87a-4ee5-9395-ea3ff9ad1227__individuals";

function _createFakeClient(): {
  client: DuckDbClientOperations;
  runRawQuery: ReturnType<typeof vi.fn>;
} {
  const runRawQuery = vi.fn(async (queryString: string) => {
    return {
      data: queryString.startsWith("DESCRIBE")
        ? [{ column_name: "external_id", column_type: "VARCHAR" }]
        : [{ count: 3n }],
    };
  });
  const client = {
    connect: vi.fn(async () => {
      return { query: vi.fn(async () => {}) };
    }),
    closeConnection: vi.fn(async () => {}),
    dropTableViewAndFile: vi.fn(async () => {}),
    getDb: vi.fn(async () => {
      return {};
    }),
    runRawQuery,
    // A single cast fails: the stub has only the operations the loader calls.
  } as unknown as DuckDbClientOperations;
  return { client, runRawQuery };
}

describe("loadParquetIntoDuckDb", () => {
  // The loader reads back the view it just created. A concept spine's name is
  // no relation, so the fail-closed analyzer refuses that read unless it is
  // trusted internal SQL, and every non-empty concept query would fail.
  it("reads back the loaded view's schema and row count as trusted internal SQL", async () => {
    const { client, runRawQuery } = _createFakeClient();

    const result = await loadParquetIntoDuckDb({
      client,
      datasetDuckDbLease: {} as DatasetDuckDbLease,
      tableName: SPINE_TABLE_NAME,
      blob: new Blob(),
    });

    const readBackCalls = runRawQuery.mock.calls.filter((call) => {
      const queryString = call[0] as string;
      return (
        queryString.startsWith("DESCRIBE") || queryString.includes("count(*)")
      );
    });
    expect(readBackCalls).toHaveLength(2);
    readBackCalls.forEach((call) => {
      expect(call[1]?.[TRUSTED_INTERNAL_SQL]).toBe(true);
      expect(call[1]?.params).toEqual({ tableName: SPINE_TABLE_NAME });
    });
    expect(result.numRows).toBe(3);
    expect(result.columns).toEqual([
      { column_name: "external_id", column_type: "VARCHAR" },
    ]);
  });
});
