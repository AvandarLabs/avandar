import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryableRelationColumns } from "@/clients/qetl/QueryMediator/QueryableRelationColumns/QueryableRelationColumns";
import { createRegistryForFetch } from "@/clients/qetl/QueryMediator/relationLoading/createRegistryForFetch";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetDuckDbLease } from "@/clients/DuckDbClient/DatasetDuckDbCoordinator/DatasetDuckDbCoordinator";
import type { QetlRunQuery } from "@/clients/qetl/QueryMediator/QueryMediator.types";
import type { DefaultRegistryOptions } from "@/clients/qetl/wrappers/createDefaultRegistry";

const { createDefaultRegistryMock } = vi.hoisted(() => {
  return { createDefaultRegistryMock: vi.fn() };
});

vi.mock("@/clients/qetl/wrappers/createDefaultRegistry", () => {
  return { createDefaultRegistry: createDefaultRegistryMock };
});

const SHEET_ID = "22222222-2222-4222-8222-222222222222" as Dataset.Id;

/** The `runParquetQuery` the registry is built with, bound to `runQuery`. */
function _getRunParquetQuery(
  runQuery: QetlRunQuery,
): DefaultRegistryOptions["runParquetQuery"] {
  createRegistryForFetch({
    relationSources: [],
    datasetDuckDbLease: {} as DatasetDuckDbLease,
    runQuery,
  });
  const options = createDefaultRegistryMock.mock
    .calls[0]?.[0] as DefaultRegistryOptions;
  return options.runParquetQuery;
}

beforeEach(() => {
  vi.clearAllMocks();
  QueryableRelationColumns.clear();
});

describe("createRegistryForFetch runParquetQuery", () => {
  it("returns the nested query's rows with its dependencies' earliest stale-at time", async () => {
    const parquetBlob = new Blob(["rows"]);
    const runQuery = vi.fn().mockImplementation(async () => {
      // The nested query loads the Sheet, which records when it goes stale.
      QueryableRelationColumns.remember({
        datasetId: SHEET_ID,
        columns: "all",
        staleAt: 123_456,
      });
      return parquetBlob;
    }) as unknown as QetlRunQuery;

    const result = await _getRunParquetQuery(runQuery)({
      rawSql: `SELECT * FROM "${SHEET_ID}"`,
    });

    expect(result).toEqual({ parquetBlob, staleAt: 123_456 });
  });

  it("names no stale-at time when the SQL cannot be analyzed", async () => {
    const runQuery = vi
      .fn()
      .mockResolvedValue(new Blob(["rows"])) as unknown as QetlRunQuery;

    const result = await _getRunParquetQuery(runQuery)({
      rawSql: "garbage ((",
    });

    expect(result.staleAt).toBeUndefined();
  });
});
