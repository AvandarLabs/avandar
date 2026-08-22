/** Pins projection SQL: selected columns, no DISTINCT, parquet return. */

import type { DatasetDuckDbLease } from "@/clients/DuckDbClient/DatasetDuckDbCoordinator/DatasetDuckDbCoordinator";
import type { DuckDbClientOperations } from "@/clients/DuckDbClient/duckDbClientOperations";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { TRUSTED_INTERNAL_SQL } from "@/clients/DuckDbClient/duckDbClientOperations";

const registerParquetFileMock = vi.hoisted(() => {
  return vi.fn();
});
const uuidMock = vi.hoisted(() => {
  return vi.fn(() => {
    return "proj-id";
  });
});

vi.mock("@/clients/DuckDbClient/duckDbFileRegistry", () => {
  return { registerParquetFile: registerParquetFileMock };
});

vi.mock("$/lib/uuid", () => {
  return { uuid: uuidMock };
});

const dropFileMock = vi.fn();
const runRawQueryMock = vi.fn();
const getDbMock = vi.fn();

function _client(): Pick<DuckDbClientOperations, "getDb" | "runRawQuery"> {
  return {
    getDb: getDbMock,
    runRawQuery: runRawQueryMock,
  };
}

const LEASE = {
  datasetIds: new Set<string>(),
} as unknown as DatasetDuckDbLease;

beforeEach(() => {
  vi.clearAllMocks();
  getDbMock.mockResolvedValue({ dropFile: dropFileMock });
  runRawQueryMock.mockResolvedValue(new Blob(["projected"]));
  registerParquetFileMock.mockResolvedValue(undefined);
});

describe("projectParquetBlob", () => {
  it("throws before touching DuckDB when no columns are given", async () => {
    const { projectParquetBlob } =
      await import("@/clients/DuckDbClient/projectParquetBlob/projectParquetBlob");

    await expect(
      projectParquetBlob({
        client: _client() as DuckDbClientOperations,
        columns: [],
        datasetDuckDbLease: LEASE,
        parquetBlob: new Blob(["src"]),
      }),
    ).rejects.toThrow("projectParquetBlob requires at least one column");

    expect(getDbMock).not.toHaveBeenCalled();
  });

  it("selects the requested columns from read_parquet with no DISTINCT, GROUP BY, or ORDER BY", async () => {
    const { projectParquetBlob } =
      await import("@/clients/DuckDbClient/projectParquetBlob/projectParquetBlob");
    const parquetBlob = new Blob(["src"], {
      type: "application/vnd.apache.parquet",
    });

    const result = await projectParquetBlob({
      client: _client() as DuckDbClientOperations,
      columns: ["status", "case_id"],
      datasetDuckDbLease: LEASE,
      parquetBlob,
    });

    expect(result).toEqual(new Blob(["projected"]));
    const sql = runRawQueryMock.mock.calls[0]?.[0] as string;
    expect(sql).toContain('SELECT "case_id", "status" FROM read_parquet');
    expect(sql).not.toMatch(/\bDISTINCT\b/i);
    expect(sql).not.toMatch(/\bGROUP BY\b/i);
    expect(sql).not.toMatch(/\bORDER BY\b/i);
    expect(runRawQueryMock.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        datasetDuckDbLease: LEASE,
        returnType: "parquet",
        [TRUSTED_INTERNAL_SQL]: true,
        params: { fileName: "ava_proj_proj-id" },
      }),
    );
    expect(dropFileMock).toHaveBeenCalledWith("ava_proj_proj-id");
  });
});
