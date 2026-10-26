import { describe, expect, it, vi } from "vitest";
import { TRUSTED_INTERNAL_SQL } from "@/clients/DuckDbClient/duckDbClientOperations";
import { loadCsvIntoDuckDb } from "@/clients/DuckDbClient/duckDbCsvLoad";
import { DuckDbSqlAnalyzer } from "@/lib/sql/DuckDbSqlAnalyzer/DuckDbSqlAnalyzer";
import type { DatasetDuckDbLease } from "@/clients/DuckDbClient/DatasetDuckDbCoordinator/DatasetDuckDbCoordinator";
import type { DuckDbClientOperations } from "@/clients/DuckDbClient/duckDbClientOperations";

vi.mock("@/clients/DuckDbClient/csvParse/csvParseAttempts", () => {
  return {
    runCsvParseAttempts: vi.fn(async () => {
      return {
        lastSniffRow: undefined,
        parseOptions: {},
        rejectedRows: [],
        rejectedScans: [],
      };
    }),
  };
});

vi.mock("@/clients/DuckDbClient/duckDbFileRegistry", () => {
  return {
    registerCsvFile: vi.fn(async () => {}),
    getParquetBlobFromStagingFiles: vi.fn(async () => {
      return new Blob();
    }),
  };
});

vi.mock("@/clients/DuckDbClient/csvParse/csvSniff", async (importOriginal) => {
  const original =
    await importOriginal<
      typeof import("@/clients/DuckDbClient/csvParse/csvSniff")
    >();
  return { ...original, getCsvSniffResult: vi.fn(() => {}) };
});

/**
 * A concept spine's table name, which deliberately resolves to no relation so
 * the fail-closed analyzer cannot account for it.
 */
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
        : [{ count: 1n }],
    };
  });
  const client = {
    connect: vi.fn(async () => {
      return {};
    }),
    closeConnection: vi.fn(async () => {}),
    dropTableViewAndFile: vi.fn(async () => {}),
    getDb: vi.fn(async () => {
      return {};
    }),
    loadParquet: vi.fn(async () => {}),
    logger: { log: vi.fn(), error: vi.fn() },
    runRawQuery,
  } as unknown as DuckDbClientOperations;
  return { client, runRawQuery };
}

describe("loadCsvIntoDuckDb", () => {
  // The loader reads back the table it just created. For a table whose name
  // is no relation (a concept spine), the fail-closed analyzer refuses that
  // read unless it is marked trusted internal SQL, so without the flag every
  // non-empty concept query fails the moment its spine loads.
  it("reads back the loaded table's schema and row count as trusted internal SQL", async () => {
    const { client, runRawQuery } = _createFakeClient();

    await loadCsvIntoDuckDb({
      client,
      datasetDuckDbLease: {} as DatasetDuckDbLease,
      tableName: SPINE_TABLE_NAME,
      fileText: "external_id\nA\n",
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
  });

  it("needs the trusted flag because the analyzer cannot inspect a spine read", () => {
    expect(
      DuckDbSqlAnalyzer.getDuckDbSqlAnalysisFromSql(
        `DESCRIBE "${SPINE_TABLE_NAME}"`,
      ),
    ).toMatchObject({ kind: "unsafe", reason: "uninspectable-source" });
  });
});
