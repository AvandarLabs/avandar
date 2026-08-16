/** Fixture builders and mock wiring for each transition scenario. */
import { Model } from "@avandar/models";
import { makeObjectFromEntries } from "@avandar/utils";
import { vi } from "vitest";
import {
  apiPostMock,
  dbDeleteThrowOnErrorMock,
  dbThrowOnErrorMock,
  deleteDashboardMock,
  deleteSnapshotGenerationMock,
  deleteSnapshotsMock,
  downloadDatasetMock,
  getDashboardByIdMock,
  getDatasetsMock,
  operationLog,
  persistedVisibilityState,
  reconcileSnapshotsMock,
  uploadDatasetMock,
  uuidMock,
} from "@/clients/dashboards/DashboardClient/DashboardClient.transitions.fixtures";
import {
  CLEANUP_REVISION,
  DASHBOARD,
  DASHBOARD_ID,
  DATASET_IDS,
  PREVIOUS_REVISION,
  SNAPSHOT_REVISION,
  WORKSPACE_ID,
} from "@/clients/dashboards/DashboardClient/dashboardTransitionConstants";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

export function makePublishConfig(): {
  slices: Record<Dataset.Id, { mode: "all_columns" } | { mode: "queried" }>;
} {
  return {
    slices: makeObjectFromEntries(
      DATASET_IDS.map((datasetId, datasetIndex) => {
        return [
          datasetId,
          { mode: datasetIndex === 1 ? "queried" : "all_columns" },
        ];
      }),
    ),
  };
}

export function makeCsvDataset(datasetId: Dataset.Id): Dataset.T {
  return Model.make("Dataset", {
    createdAt: "2026-08-14T00:00:00.000Z",
    dateOfLastSync: undefined,
    description: undefined,
    id: datasetId,
    isRestricted: false,
    name: `Dataset ${datasetId}`,
    sourceType: "csv_file",
    ownerId: "55555555-5555-4555-8555-555555555555" as Dataset.T["ownerId"],
    ownerProfileId:
      "66666666-6666-4666-8666-666666666666" as Dataset.T["ownerProfileId"],
    workspaceId: WORKSPACE_ID,
    updatedAt: "2026-08-14T00:00:00.000Z",
  });
}

export function makePersistedDashboard(): Dashboard.T {
  return {
    ...DASHBOARD,
    visibility: persistedVisibilityState.current,
    snapshotRevision: persistedVisibilityState.snapshotRevision,
    snapshotTransitionKind: persistedVisibilityState.snapshotTransitionKind,
    snapshotTransitionPriorRevision:
      persistedVisibilityState.snapshotTransitionPriorRevision,
    snapshotTransitionPriorVisibility:
      persistedVisibilityState.snapshotTransitionPriorVisibility,
    snapshotTransitionRevision:
      persistedVisibilityState.snapshotTransitionRevision,
    snapshotTransitionTargetVisibility:
      persistedVisibilityState.snapshotTransitionTargetVisibility,
    updatedAt: persistedVisibilityState.updatedAt,
  };
}

function _resetTransitionMocks(): void {
  vi.clearAllMocks();
  [
    apiPostMock,
    dbDeleteThrowOnErrorMock,
    dbThrowOnErrorMock,
    deleteSnapshotsMock,
    deleteSnapshotGenerationMock,
    reconcileSnapshotsMock,
    uploadDatasetMock,
  ].forEach((mock) => {
    return mock.mockReset();
  });
  operationLog.length = 0;
  Object.assign(persistedVisibilityState, {
    current: "draft",
    isDashboardDeleted: false,
    pending: undefined,
    snapshotRevision: undefined,
    pendingSnapshotRevision: undefined,
    shouldUpdateSnapshotRevision: false,
    snapshotTransitionKind: undefined,
    snapshotTransitionPriorRevision: undefined,
    snapshotTransitionPriorVisibility: undefined,
    snapshotTransitionRevision: undefined,
    snapshotTransitionTargetVisibility: undefined,
    updatedAt: DASHBOARD.updatedAt,
  });
}

function _configureDatabaseMocks(): void {
  apiPostMock.mockImplementation(async () => {
    operationLog.push("validate");
    return { isValid: true };
  });
  dbThrowOnErrorMock.mockImplementation(async () => {
    if (persistedVisibilityState.pending !== undefined) {
      persistedVisibilityState.current = persistedVisibilityState.pending;
      persistedVisibilityState.pending = undefined;
    }
    if (persistedVisibilityState.shouldUpdateSnapshotRevision) {
      persistedVisibilityState.snapshotRevision =
        persistedVisibilityState.pendingSnapshotRevision;
      persistedVisibilityState.pendingSnapshotRevision = undefined;
      persistedVisibilityState.shouldUpdateSnapshotRevision = false;
    }
    persistedVisibilityState.updatedAt = "2026-08-14T00:00:01.000Z";
    return { data: [makePersistedDashboard()] };
  });
  getDashboardByIdMock.mockImplementation(async () => {
    return persistedVisibilityState.isDashboardDeleted ? undefined : (
        makePersistedDashboard()
      );
  });
}

function _makeDatasetFromIndex(
  options: Readonly<{ datasetId: Dataset.Id; datasetIndex: number }>,
): Dataset.T {
  const sourceType =
    options.datasetIndex === 0 ? "virtual"
    : options.datasetIndex === 2 ? "open_data"
    : "csv_file";
  return Model.make("Dataset", {
    createdAt: "2026-08-14T00:00:00.000Z",
    dateOfLastSync: undefined,
    description: undefined,
    id: options.datasetId,
    isRestricted: false,
    name: `Dataset ${options.datasetId}`,
    sourceType,
    ownerId: "55555555-5555-4555-8555-555555555555" as Dataset.T["ownerId"],
    ownerProfileId:
      "66666666-6666-4666-8666-666666666666" as Dataset.T["ownerProfileId"],
    workspaceId: WORKSPACE_ID,
    updatedAt: "2026-08-14T00:00:00.000Z",
  });
}

function _configureStorageMocks(): void {
  deleteDashboardMock.mockImplementation(async () => {
    operationLog.push("delete-row");
    persistedVisibilityState.isDashboardDeleted = true;
  });
  dbDeleteThrowOnErrorMock.mockImplementation(async () => {
    operationLog.push("delete-row");
    persistedVisibilityState.isDashboardDeleted = true;
    return { data: { id: DASHBOARD_ID } };
  });
  deleteSnapshotsMock.mockImplementation(async ({ bucket }) => {
    operationLog.push(`clear:${String(bucket)}`);
  });
  deleteSnapshotGenerationMock.mockImplementation(async ({ bucket }) => {
    operationLog.push(`delete-generation:${String(bucket)}`);
  });
  reconcileSnapshotsMock.mockImplementation(async ({ bucket }) => {
    operationLog.push(`reconcile:${String(bucket)}`);
  });
  downloadDatasetMock.mockResolvedValue(new Blob(["parquet"]));
  getDatasetsMock.mockResolvedValue(
    DATASET_IDS.map((datasetId, datasetIndex) => {
      return _makeDatasetFromIndex({ datasetId, datasetIndex });
    }),
  );
  uploadDatasetMock.mockImplementation(async ({ bucket }) => {
    operationLog.push(`upload:${String(bucket)}`);
  });
}

export function configureVisibilityUpdateFailure(): void {
  dbThrowOnErrorMock
    .mockImplementationOnce(async () => {
      Object.assign(persistedVisibilityState, {
        snapshotTransitionKind: "publish",
        snapshotTransitionRevision: SNAPSHOT_REVISION,
        snapshotTransitionPriorVisibility: "draft",
        snapshotTransitionTargetVisibility: "public",
      });
      return {
        data: [
          {
            ...DASHBOARD,
            snapshotRevision: undefined,
            snapshotTransitionKind: "publish",
            snapshotTransitionPriorRevision: undefined,
            snapshotTransitionPriorVisibility: "draft",
            snapshotTransitionRevision: SNAPSHOT_REVISION,
            snapshotTransitionTargetVisibility: "public",
            updatedAt: "2026-08-14T00:00:01.000Z",
          },
        ],
      };
    })
    .mockImplementationOnce(async () => {
      persistedVisibilityState.pending = undefined;
      persistedVisibilityState.pendingSnapshotRevision = undefined;
      persistedVisibilityState.snapshotTransitionKind = "publish";
      persistedVisibilityState.snapshotTransitionRevision = SNAPSHOT_REVISION;
      persistedVisibilityState.snapshotTransitionPriorVisibility = "draft";
      persistedVisibilityState.snapshotTransitionTargetVisibility = "public";
      throw new Error("update failed");
    });
  getDashboardByIdMock.mockResolvedValueOnce(DASHBOARD).mockResolvedValueOnce({
    ...DASHBOARD,
    snapshotTransitionKind: "publish",
    snapshotTransitionPriorVisibility: "draft",
    snapshotTransitionRevision: SNAPSHOT_REVISION,
    snapshotTransitionTargetVisibility: "public",
    updatedAt: "2026-08-14T00:00:01.000Z",
  });
}

export function configurePausedBroadCleanup(): {
  cleanupPaused: Promise<void>;
  releaseCleanup: () => void;
} {
  let releaseCleanup = () => {};
  const cleanupPaused = new Promise<void>((resolve) => {
    releaseCleanup = resolve;
  });
  uuidMock.mockReturnValueOnce(CLEANUP_REVISION);
  getDashboardByIdMock
    .mockResolvedValueOnce({
      ...DASHBOARD,
      snapshotRevision: PREVIOUS_REVISION,
      visibility: "public",
    })
    .mockResolvedValueOnce({
      ...DASHBOARD,
      snapshotRevision: PREVIOUS_REVISION,
      snapshotTransitionKind: "delete",
      snapshotTransitionPriorRevision: PREVIOUS_REVISION,
      snapshotTransitionPriorVisibility: "public",
      snapshotTransitionRevision: CLEANUP_REVISION,
      visibility: "draft",
      updatedAt: "2026-08-14T00:00:01.000Z",
    });
  deleteSnapshotsMock.mockImplementation(async ({ bucket }) => {
    operationLog.push(`clear:${String(bucket)}`);
    await cleanupPaused;
  });
  return { cleanupPaused, releaseCleanup };
}

/** Resets every transition mock to its default, published-nothing state. */
export function setUpDashboardTransitionMocks(): void {
  _resetTransitionMocks();
  _configureDatabaseMocks();
  _configureStorageMocks();
}
