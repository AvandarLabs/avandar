import { describe, expect, it, vi } from "vitest";
import { TRUSTED_INTERNAL_SQL } from "@/clients/DuckDbClient/duckDbClientOperations";
import { loadParquetIntoDuckDb } from "@/clients/DuckDbClient/duckDbParquetLoad";
import type { ColumnConversion } from "$/models/dataDictionaries/ColumnConversion/ColumnConversion";
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
    if (queryString.startsWith("SELECT DISTINCT kept_value")) {
      return { data: [{ kept_value: "7" }] };
    }
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

  describe("a dataset with an ordered conversion", () => {
    const DATASET_ID = "22222222-2222-4222-8222-222222222222";
    const SES_CONVERSION: ColumnConversion.T = {
      datasetColumnId: "col-ses",
      direction: "decode",
      pairs: [
        { code: "1", label: "Low", acceptedSpellings: [], isMissing: false },
        { code: "2", label: "High", acceptedSpellings: [], isMissing: false },
      ],
      isOrdered: true,
      overrides: [],
      keepsOriginalAs: undefined,
      outputDataType: "varchar",
      inputDataType: undefined,
    };

    async function _load(): Promise<ReturnType<typeof vi.fn>> {
      const { client, runRawQuery } = _createFakeClient();
      await loadParquetIntoDuckDb({
        client,
        datasetDuckDbLease: {} as DatasetDuckDbLease,
        tableName: DATASET_ID,
        blob: new Blob(),
        columnReplacements: {
          SES: { alias: "ses_level", valueMapping: SES_CONVERSION },
        },
      });
      return runRawQuery;
    }

    function _findCall(
      runRawQuery: ReturnType<typeof vi.fn>,
      predicate: (queryString: string, viewName: unknown) => boolean,
    ): unknown[] | undefined {
      return runRawQuery.mock.calls.find((call) => {
        return predicate(call[0] as string, call[1]?.params?.viewName);
      });
    }

    it("reads the kept values from the file first, as trusted internal SQL", async () => {
      const runRawQuery = await _load();
      const queries = runRawQuery.mock.calls.map((call) => {
        return call[0] as string;
      });
      const keptIndex = queries.findIndex((queryString) => {
        return queryString.startsWith("SELECT DISTINCT kept_value");
      });

      expect(queries[keptIndex]).toContain(
        `FROM read_parquet("${DATASET_ID}")`,
      );
      expect(
        runRawQuery.mock.calls[keptIndex]?.[1]?.[TRUSTED_INTERNAL_SQL],
      ).toBe(true);
      expect(
        queries.findIndex((queryString) => {
          return queryString.startsWith("CREATE VIEW");
        }),
      ).toBeGreaterThan(keptIndex);
    });

    it("casts the public view's ordered column to an ENUM that ends with the kept values", async () => {
      const runRawQuery = await _load();
      const publicView = _findCall(runRawQuery, (queryString, viewName) => {
        return (
          queryString.includes('CREATE VIEW IF NOT EXISTS "$tableName$"') &&
          viewName === undefined
        );
      });

      expect(
        (publicView![1] as { params: { replaceClause: string } }).params
          .replaceClause,
      ).toContain(`AS ENUM('Low', 'High', '7')) AS "ses_level"`);
    });

    it("drops and recreates the raw-values view with the rename and no conversion", async () => {
      const runRawQuery = await _load();
      const rawViewName = `ava_raw_${DATASET_ID}`;
      const drop = _findCall(runRawQuery, (queryString, viewName) => {
        return queryString.startsWith("DROP VIEW") && viewName === rawViewName;
      });
      const create = _findCall(runRawQuery, (queryString, viewName) => {
        return (
          queryString.startsWith("CREATE VIEW") && viewName === rawViewName
        );
      });

      expect(drop).toBeDefined();
      expect(runRawQuery.mock.calls.indexOf(create!)).toBeGreaterThan(
        runRawQuery.mock.calls.indexOf(drop!),
      );
      expect(
        (create![1] as { params: Record<string, string> }).params,
      ).toMatchObject({
        excludeClause: 'EXCLUDE ("SES")',
        replaceClause: ', "SES" AS "ses_level"',
        readParquetOptions: "",
      });
    });
  });
});
