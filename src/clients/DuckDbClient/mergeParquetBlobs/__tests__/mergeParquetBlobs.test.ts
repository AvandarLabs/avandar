/** Pins how Parquet parts are merged: one file list, in order, as Parquet. */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { TRUSTED_INTERNAL_SQL } from "@/clients/DuckDbClient/duckDbClientOperations";
import { mergeParquetBlobs } from "@/clients/DuckDbClient/mergeParquetBlobs/mergeParquetBlobs";
import type { DatasetDuckDbLease } from "@/clients/DuckDbClient/DatasetDuckDbCoordinator/DatasetDuckDbCoordinator";
import type { DuckDbClientOperations } from "@/clients/DuckDbClient/duckDbClientOperations";

const { registerParquetFileMock, uuidMock } = vi.hoisted(() => {
  let count = 0;
  return {
    registerParquetFileMock: vi.fn(),
    uuidMock: vi.fn(() => {
      count += 1;
      return `id-${count}`;
    }),
  };
});

vi.mock("@/clients/DuckDbClient/duckDbFileRegistry", () => {
  return { registerParquetFile: registerParquetFileMock };
});

vi.mock("$/lib/uuid", () => {
  return { uuid: uuidMock };
});

const dropFileMock = vi.fn();
const runRawQueryMock = vi.fn();

const CLIENT = {
  getDb: async () => {
    return { dropFile: dropFileMock };
  },
  runRawQuery: runRawQueryMock,
} as unknown as DuckDbClientOperations;

const LEASE = {
  datasetIds: new Set<string>(),
} as unknown as DatasetDuckDbLease;

beforeEach(() => {
  registerParquetFileMock.mockReset().mockResolvedValue(undefined);
  runRawQueryMock.mockReset().mockResolvedValue(new Blob(["merged"]));
  dropFileMock.mockReset();
});

describe("mergeParquetBlobs", () => {
  it("returns a single blob unchanged, without touching DuckDB", async () => {
    const onlyBlob = new Blob(["only"]);

    const merged = await mergeParquetBlobs({
      client: CLIENT,
      datasetDuckDbLease: LEASE,
      parquetBlobs: [onlyBlob],
    });

    expect(merged).toBe(onlyBlob);
    expect(registerParquetFileMock).not.toHaveBeenCalled();
    expect(runRawQueryMock).not.toHaveBeenCalled();
  });

  it("reads every part in order as one file list and returns Parquet", async () => {
    const partBlobs = [new Blob(["a"]), new Blob(["b"]), new Blob(["c"])];

    const merged = await mergeParquetBlobs({
      client: CLIENT,
      datasetDuckDbLease: LEASE,
      parquetBlobs: partBlobs,
    });

    expect(merged).toEqual(new Blob(["merged"]));
    const fileNames = registerParquetFileMock.mock.calls.map(([call]) => {
      return (call as { tableName: string }).tableName;
    });
    expect(fileNames).toHaveLength(3);
    const [sql, options] = runRawQueryMock.mock.calls[0] as [
      string,
      Record<string | symbol, unknown>,
    ];
    expect(sql).toBe(
      "SELECT * FROM read_parquet(['$part0$', '$part1$', '$part2$'])",
    );
    expect(options).toEqual(
      expect.objectContaining({
        datasetDuckDbLease: LEASE,
        params: {
          part0: fileNames[0],
          part1: fileNames[1],
          part2: fileNames[2],
        },
        returnType: "parquet",
        [TRUSTED_INTERNAL_SQL]: true,
      }),
    );
    expect(
      dropFileMock.mock.calls.map(([name]) => {
        return name;
      }),
    ).toEqual(fileNames);
  });

  it("drops the registered parts even when the merge fails", async () => {
    runRawQueryMock.mockRejectedValue(new Error("merge failed"));

    await expect(
      mergeParquetBlobs({
        client: CLIENT,
        datasetDuckDbLease: LEASE,
        parquetBlobs: [new Blob(["a"]), new Blob(["b"])],
      }),
    ).rejects.toThrow("merge failed");

    expect(dropFileMock).toHaveBeenCalledTimes(2);
  });
});
