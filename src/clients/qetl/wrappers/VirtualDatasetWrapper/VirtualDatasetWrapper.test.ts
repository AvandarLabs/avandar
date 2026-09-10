/** Tests that a virtual dataset is acquired by running its defining SQL. */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { createVirtualDatasetWrapper } from "@/clients/qetl/wrappers/VirtualDatasetWrapper/VirtualDatasetWrapper";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { RelationRef } from "$/models/relations/RelationRef/RelationRef";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { ILogger } from "@avandar/logger";

const DATASET_ID = "33333333-3333-4333-8333-333333333333" as Dataset.Id;

const DATASET_REF = {
  kind: "dataset",
  id: DATASET_ID,
} as const satisfies RelationRef.T;

const CONTEXT = {
  workspaceId: "99999999-9999-4999-8999-999999999999" as Workspace.Id,
  logger: console as unknown as ILogger,
};

const { datasetColumnGetAllMock, virtualSourceGetAllMock } = vi.hoisted(() => {
  return {
    datasetColumnGetAllMock: vi.fn(),
    virtualSourceGetAllMock: vi.fn(),
  };
});

function _cachedClient(fns: Record<string, unknown>): {
  withCache: () => { withEnsureQueryData: () => Record<string, unknown> };
} {
  return {
    withCache: () => {
      return {
        withEnsureQueryData: () => {
          return fns;
        },
      };
    },
  };
}

vi.mock("@/clients/datasets/source-datasets/VirtualDatasetClient", () => {
  return {
    VirtualDatasetClient: _cachedClient({ getAll: virtualSourceGetAllMock }),
  };
});

vi.mock("@/clients/datasets/DatasetColumnClient", () => {
  return {
    DatasetColumnClient: _cachedClient({ getAll: datasetColumnGetAllMock }),
  };
});

beforeEach(() => {
  vi.clearAllMocks();
  datasetColumnGetAllMock.mockResolvedValue([]);
});

describe("VirtualDatasetWrapper", () => {
  it("runs the stored raw sql and returns its parquet", async () => {
    virtualSourceGetAllMock.mockResolvedValue([
      { datasetId: DATASET_ID, rawSql: 'SELECT * FROM "other"' },
    ]);
    const parquetBlob = new Blob(["virtual-parquet"]);
    const runParquetQuery = vi.fn().mockResolvedValue(parquetBlob);
    const wrapper = createVirtualDatasetWrapper({ runParquetQuery });

    const acquired = await wrapper.acquire!(
      { ref: DATASET_REF, columns: "all" },
      CONTEXT,
    );

    expect(runParquetQuery).toHaveBeenCalledWith({
      rawSql: 'SELECT * FROM "other"',
    });
    expect(acquired).toEqual({
      ref: DATASET_REF,
      parquetBlob,
      sourceVersion: undefined,
    });
  });

  it("names the dataset when no virtual source record exists", async () => {
    virtualSourceGetAllMock.mockResolvedValue([]);
    const wrapper = createVirtualDatasetWrapper({
      runParquetQuery: vi.fn(),
    });

    await expect(
      wrapper.acquire!({ ref: DATASET_REF, columns: "all" }, CONTEXT),
    ).rejects.toThrow(`No virtual source record for dataset '${DATASET_ID}'`);
  });

  it("does not run the defining sql just to describe the relation", async () => {
    datasetColumnGetAllMock.mockResolvedValue([
      { name: "total", dataType: "double" },
    ]);
    const runParquetQuery = vi.fn();
    const wrapper = createVirtualDatasetWrapper({ runParquetQuery });

    await expect(wrapper.describe(DATASET_REF, CONTEXT)).resolves.toEqual({
      columns: [{ name: "total", dataType: "DOUBLE", isArray: false }],
    });
    expect(runParquetQuery).not.toHaveBeenCalled();
  });
});
