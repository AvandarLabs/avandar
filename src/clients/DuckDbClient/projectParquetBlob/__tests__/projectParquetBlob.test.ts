/** Pins projection SQL: selected columns, no DISTINCT, parquet return. */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { TRUSTED_INTERNAL_SQL } from "@/clients/DuckDbClient/duckDbClientOperations";
import type { DatasetDuckDbLease } from "@/clients/DuckDbClient/DatasetDuckDbCoordinator/DatasetDuckDbCoordinator";
import type { DuckDbClientOperations } from "@/clients/DuckDbClient/duckDbClientOperations";

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

/** Answers the schema read with `fileColumns` and the COPY with a blob. */
function _mockFileColumns(fileColumns: readonly string[]): void {
  runRawQueryMock.mockImplementation(
    async (_sql: string, options: { returnType?: string }) => {
      return options.returnType === "parquet"
        ? new Blob(["projected"])
        : {
            data: fileColumns.map((columnName) => {
              return { column_name: columnName };
            }),
          };
    },
  );
}

function _getProjectionSql(): string | undefined {
  const projectionCall = runRawQueryMock.mock.calls.find((call) => {
    return (call[1] as { returnType?: string }).returnType === "parquet";
  });
  return projectionCall?.[0] as string | undefined;
}

beforeEach(() => {
  vi.clearAllMocks();
  getDbMock.mockResolvedValue({ dropFile: dropFileMock });
  _mockFileColumns(["case_id", "status", "district"]);
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
    const sql = _getProjectionSql()!;
    expect(sql).toContain('SELECT "case_id", "status" FROM read_parquet');
    expect(sql).not.toMatch(/\bDISTINCT\b/i);
    expect(sql).not.toMatch(/\bGROUP BY\b/i);
    expect(sql).not.toMatch(/\bORDER BY\b/i);
    expect(runRawQueryMock.mock.calls.at(-1)?.[1]).toEqual(
      expect.objectContaining({
        datasetDuckDbLease: LEASE,
        returnType: "parquet",
        [TRUSTED_INTERNAL_SQL]: true,
        params: { fileName: "ava_proj_proj-id" },
      }),
    );
    expect(dropFileMock).toHaveBeenCalledWith("ava_proj_proj-id");
  });

  it("drops requested names that are not columns of the file, such as CTE names, aliases, and keywords", async () => {
    const { projectParquetBlob } =
      await import("@/clients/DuckDbClient/projectParquetBlob/projectParquetBlob");
    _mockFileColumns(["Province_State", "daily_new_deaths", "date"]);

    await projectParquetBlob({
      client: _client() as DuckDbClientOperations,
      columns: [
        "Province_State",
        "QUALIFY",
        "daily_new_deaths",
        "DATE",
        "state",
        "state_deaths",
        "total_covid_deaths",
      ],
      datasetDuckDbLease: LEASE,
      parquetBlob: new Blob(["src"]),
    });

    expect(_getProjectionSql()).toContain(
      'SELECT "Province_State", "daily_new_deaths", "date" FROM read_parquet',
    );
  });

  it("returns the source blob unchanged when no requested name is a column", async () => {
    const { projectParquetBlob } =
      await import("@/clients/DuckDbClient/projectParquetBlob/projectParquetBlob");
    const parquetBlob = new Blob(["src"]);

    const result = await projectParquetBlob({
      client: _client() as DuckDbClientOperations,
      columns: ["state", "total"],
      datasetDuckDbLease: LEASE,
      parquetBlob,
    });

    expect(result).toBe(parquetBlob);
    expect(_getProjectionSql()).toBeUndefined();
    expect(dropFileMock).toHaveBeenCalledWith("ava_proj_proj-id");
  });
});
