import { createWebLogger } from "@avandar/logger";
import { Model } from "@avandar/models";
import { objectEntries, objectKeys } from "@avandar/utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DASHBOARD,
  DATASET_IDS,
  SNAPSHOT_REVISION,
  WORKSPACE_ID,
} from "@/clients/dashboards/DashboardClient/__tests__/dashboardTransitionConstants";
import { uploadPreparedSnapshots } from "@/clients/dashboards/DashboardClient/dashboardSnapshotHelpers/dashboardPublishSnapshots";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetSource } from "$/models/datasets/DatasetSource/DatasetSource";

/** Where a published `all_columns` snapshot's rows come from. */
type SnapshotRowsOrigin =
  | "workspace-query"
  | "stored-dataset-parquet"
  | "open-data-parquet";

/**
 * Every source type must say where its `all_columns` snapshot comes from, so
 * adding a source type without deciding fails the type-check. A source with
 * no stored parquet in Storage (it is acquired live) must take the
 * workspace query, which reads its rows the same way a dashboard widget
 * does.
 */
const EXPECTED_ORIGIN_BY_SOURCE_TYPE: Record<
  DatasetSource.SourceType,
  SnapshotRowsOrigin
> = {
  csv_file: "stored-dataset-parquet",
  google_sheets: "workspace-query",
  open_data: "open-data-parquet",
  pdf_file: "stored-dataset-parquet",
  postgres_table: "workspace-query",
  virtual: "workspace-query",
  xlsx_file: "stored-dataset-parquet",
};

const DATASET_ID = DATASET_IDS[0];

const {
  downloadDatasetMock,
  localDatasetGetByIdMock,
  runQueryMock,
  uploadDatasetMock,
} = vi.hoisted(() => {
  return {
    downloadDatasetMock: vi.fn(),
    localDatasetGetByIdMock: vi.fn(),
    runQueryMock: vi.fn(),
    uploadDatasetMock: vi.fn(),
  };
});

const BLOB_BY_ORIGIN: Record<SnapshotRowsOrigin, Blob> = {
  "workspace-query": new Blob(["workspace-query"]),
  "stored-dataset-parquet": new Blob(["stored-dataset-parquet"]),
  "open-data-parquet": new Blob(["open-data-parquet"]),
};

vi.mock("@/clients/qetl/WorkspaceQuerySession/WorkspaceQuerySession", () => {
  return { WorkspaceQuerySession: { runQuery: runQueryMock } };
});

vi.mock(
  "@/clients/storage/DatasetParquetStorageClient/DatasetParquetStorageClient",
  () => {
    return {
      DatasetParquetStorageClient: { downloadDataset: downloadDatasetMock },
    };
  },
);

vi.mock(
  "@/clients/storage/PublicDatasetParquetStorageClient/PublicDatasetParquetStorageClient",
  () => {
    return {
      PublicDatasetParquetStorageClient: { uploadDataset: uploadDatasetMock },
    };
  },
);

vi.mock("@/clients/datasets/LocalDatasetClient/LocalDatasetClient", () => {
  return { LocalDatasetClient: { getById: localDatasetGetByIdMock } };
});

vi.mock("@/clients/datasets/source-datasets/VirtualDatasetClient", () => {
  return {
    VirtualDatasetClient: {
      getOne: vi.fn().mockResolvedValue({ rawSql: "SELECT 1 AS one" }),
    },
  };
});

vi.mock("@/utils/notifications/notify", () => {
  return { notifyError: vi.fn() };
});

function _makeDataset(sourceType: DatasetSource.SourceType): Dataset.T {
  return Model.make("Dataset", {
    createdAt: "2026-08-14T00:00:00.000Z",
    dateOfLastSync: undefined,
    description: undefined,
    id: DATASET_ID,
    isRestricted: false,
    name: `A ${sourceType} dataset`,
    sourceType,
    ownerId: "55555555-5555-4555-8555-555555555555" as Dataset.T["ownerId"],
    ownerProfileId:
      "66666666-6666-4666-8666-666666666666" as Dataset.T["ownerProfileId"],
    workspaceId: WORKSPACE_ID,
    updatedAt: "2026-08-14T00:00:00.000Z",
  });
}

async function _publishWholeDataset(
  sourceType: DatasetSource.SourceType,
): Promise<void> {
  await uploadPreparedSnapshots({
    bucket: "published",
    dashboard: DASHBOARD,
    logger: createWebLogger({ loggerName: "publish", enabled: false }),
    prepared: {
      columnsByDataset: { [DATASET_ID]: ["name", "population"] },
      datasets: [_makeDataset(sourceType)],
      datasetIds: [DATASET_ID],
      publishConfig: { slices: { [DATASET_ID]: { mode: "all_columns" } } },
      referenced: { perDataset: {}, unparseable: new Set<Dataset.Id>() },
    },
    snapshotRevision: SNAPSHOT_REVISION,
    visibility: "public",
  });
}

/** The origin whose blob was uploaded as the snapshot, by identity. */
function _getUploadedOrigin(): SnapshotRowsOrigin | undefined {
  const uploadedBlob: unknown =
    uploadDatasetMock.mock.calls[0]?.[0]?.parquetBlob;
  return objectKeys(BLOB_BY_ORIGIN).find((origin) => {
    return BLOB_BY_ORIGIN[origin] === uploadedBlob;
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  runQueryMock.mockResolvedValue(BLOB_BY_ORIGIN["workspace-query"]);
  downloadDatasetMock.mockResolvedValue(
    BLOB_BY_ORIGIN["stored-dataset-parquet"],
  );
  localDatasetGetByIdMock.mockResolvedValue({
    parseStatus: "ready",
    parquetData: BLOB_BY_ORIGIN["open-data-parquet"],
  });
  uploadDatasetMock.mockResolvedValue(undefined);
});

describe("publishing a whole-dataset (all_columns) slice", () => {
  it.each(objectEntries(EXPECTED_ORIGIN_BY_SOURCE_TYPE))(
    "publishes a %s dataset's rows from the %s",
    async (sourceType, expectedOrigin) => {
      await _publishWholeDataset(sourceType);

      expect(_getUploadedOrigin()).toBe(expectedOrigin);
    },
  );

  it.each(["google_sheets", "postgres_table"] as const)(
    "reads a live %s dataset through the workspace query, never from Storage",
    async (sourceType) => {
      await _publishWholeDataset(sourceType);

      expect(runQueryMock).toHaveBeenCalledWith(
        expect.objectContaining({
          returnType: "parquet",
          rawSql: expect.stringContaining(`"${DATASET_ID}"`),
        }),
      );
      expect(downloadDatasetMock).not.toHaveBeenCalled();
    },
  );
});
