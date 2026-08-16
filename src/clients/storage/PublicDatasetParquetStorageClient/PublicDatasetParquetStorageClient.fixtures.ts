/**
 * Shared Supabase storage mocks for the PublicDatasetParquetStorageClient
 * tests. Scenario files import this first so its `vi.mock` call is
 * registered before the client module loads.
 */
import { vi } from "vitest";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

const { downloadMock, fromMock, listMock, removeMock, uploadMock } = vi.hoisted(
  () => {
    const mockedUpload = vi.fn();
    const mockedDownload = vi.fn();
    const mockedList = vi.fn();
    const mockedRemove = vi.fn();
    const mockedFrom = vi.fn(() => {
      return {
        upload: mockedUpload,
        download: mockedDownload,
        list: mockedList,
        remove: mockedRemove,
      };
    });

    return {
      downloadMock: mockedDownload,
      fromMock: mockedFrom,
      listMock: mockedList,
      removeMock: mockedRemove,
      uploadMock: mockedUpload,
    };
  },
);

vi.mock("$/db/supabase/AvaSupabase", () => {
  return {
    AvaSupabase: {
      db: () => {
        return { storage: { from: fromMock } };
      },
    },
  };
});

export const { PublicDatasetParquetStorageClient } =
  await import("./PublicDatasetParquetStorageClient");

export const DASHBOARD_ID =
  "11111111-1111-4111-8111-111111111111" as Dashboard.Id;
export const DATASET_ID = "22222222-2222-4222-8222-222222222222" as Dataset.Id;
export const STALE_DATASET_ID =
  "33333333-3333-4333-8333-333333333333" as Dataset.Id;
export const SNAPSHOT_REVISION = "44444444-4444-4444-8444-444444444444";
export const OLD_SNAPSHOT_REVISION = "55555555-5555-4555-8555-555555555555";
export const DATASET_PATH = `dashboards/${DASHBOARD_ID}/revisions/${SNAPSHOT_REVISION}/datasets/${DATASET_ID}.parquet`;

/** Makes `remove` report every requested object as deleted. */
export function configureSuccessfulRemove(): void {
  removeMock.mockImplementation(async (objectPaths: readonly string[]) => {
    return {
      data: objectPaths.map((name) => {
        return { name };
      }),
      error: null,
    };
  });
}

export { downloadMock, fromMock, listMock, removeMock, uploadMock };
