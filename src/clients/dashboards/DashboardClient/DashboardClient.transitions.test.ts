import { Model } from "@avandar/models";
import { makeObjectFromEntries } from "@avandar/utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { Workspace } from "$/models/Workspace/Workspace";

const DASHBOARD_ID = "11111111-1111-4111-8111-111111111111" as Dashboard.Id;
const WORKSPACE_ID = "22222222-2222-4222-8222-222222222222" as Workspace.Id;
const DATASET_IDS = [
  "33333333-3333-4333-8333-333333333333" as Dataset.Id,
  "44444444-4444-4444-8444-444444444444" as Dataset.Id,
  "55555555-5555-4555-8555-555555555555" as Dataset.Id,
  "66666666-6666-4666-8666-666666666666" as Dataset.Id,
] as const;
const SNAPSHOT_REVISION = "99999999-9999-4999-8999-999999999999";
const PREVIOUS_REVISION = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const CLEANUP_REVISION = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const WINNING_REVISION = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

type VisibilityState = {
  current: Dashboard.Visibility;
  isDashboardDeleted: boolean;
  pending: Dashboard.Visibility | undefined;
  snapshotRevision: string | undefined;
  pendingSnapshotRevision: string | undefined;
  shouldUpdateSnapshotRevision: boolean;
  snapshotTransitionKind: Dashboard.SnapshotTransitionKind | undefined;
  snapshotTransitionPriorRevision: string | undefined;
  snapshotTransitionPriorVisibility: Dashboard.Visibility | undefined;
  snapshotTransitionRevision: string | undefined;
  snapshotTransitionTargetVisibility: Dashboard.Visibility | undefined;
  updatedAt: string;
};

type MockClientConfig = {
  clientLogger: {
    appendName: () => { log: () => void; warn: () => void };
  };
  dbClient: { from: typeof dbFromMock };
  parsers: {
    fromDBReadToModelRead: (dashboard: Dashboard.T) => Dashboard.T;
    fromModelUpdateToDBUpdate: (
      dashboard: Partial<Dashboard.T>,
    ) => Partial<Dashboard.T>;
  };
};

type MockClientSpec = {
  mutations?: (config: MockClientConfig) => Record<string, unknown>;
};

const DASHBOARD = Model.make("Dashboard", {
  id: DASHBOARD_ID,
  workspaceId: WORKSPACE_ID,
  config: {},
  createdAt: "2026-08-14T00:00:00.000Z",
  description: undefined,
  visibility: "draft",
  isPublic: false,
  isRestricted: false,
  name: "Dashboard",
  ownerId: "77777777-7777-4777-8777-777777777777" as Dashboard.T["ownerId"],
  ownerProfileId:
    "88888888-8888-4888-8888-888888888888" as Dashboard.T["ownerProfileId"],
  slug: "existing-slug",
  updatedAt: "2026-08-14T00:00:00.000Z",
});

const { createVisibilityState } = vi.hoisted(() => {
  return {
    createVisibilityState: (): VisibilityState => {
      return {
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
        updatedAt: "2026-08-14T00:00:00.000Z",
      };
    },
  };
});

const { createThrowOnErrorMock } = vi.hoisted(() => {
  return {
    createThrowOnErrorMock: (visibilityState: VisibilityState) => {
      return vi.fn<() => Promise<{ data: Dashboard.T[] }>>(async () => {
        if (visibilityState.pending !== undefined) {
          visibilityState.current = visibilityState.pending;
          visibilityState.pending = undefined;
        }
        if (visibilityState.shouldUpdateSnapshotRevision) {
          visibilityState.snapshotRevision =
            visibilityState.pendingSnapshotRevision;
          visibilityState.pendingSnapshotRevision = undefined;
          visibilityState.shouldUpdateSnapshotRevision = false;
        }
        visibilityState.updatedAt = "2026-08-14T00:00:01.000Z";
        return {
          data: [
            {
              ...DASHBOARD,
              visibility: visibilityState.current,
              snapshotRevision: visibilityState.snapshotRevision,
              snapshotTransitionKind: visibilityState.snapshotTransitionKind,
              snapshotTransitionPriorRevision:
                visibilityState.snapshotTransitionPriorRevision,
              snapshotTransitionPriorVisibility:
                visibilityState.snapshotTransitionPriorVisibility,
              snapshotTransitionRevision:
                visibilityState.snapshotTransitionRevision,
              snapshotTransitionTargetVisibility:
                visibilityState.snapshotTransitionTargetVisibility,
              updatedAt: visibilityState.updatedAt,
            },
          ],
        };
      });
    },
  };
});

const { updateTransitionState } = vi.hoisted(() => {
  return {
    updateTransitionState: (
      options: Readonly<{
        updateModel: Record<string, unknown>;
        visibilityState: VisibilityState;
      }>,
    ): void => {
      const { updateModel, visibilityState } = options;
      const stringValue = (key: string) => {
        return typeof updateModel[key] === "string" ?
            updateModel[key]
          : undefined;
      };
      if ("snapshotTransitionKind" in updateModel) {
        visibilityState.snapshotTransitionKind = stringValue(
          "snapshotTransitionKind",
        ) as VisibilityState["snapshotTransitionKind"];
      }
      if ("snapshotTransitionPriorRevision" in updateModel) {
        visibilityState.snapshotTransitionPriorRevision = stringValue(
          "snapshotTransitionPriorRevision",
        ) as string | undefined;
      }
      if ("snapshotTransitionPriorVisibility" in updateModel) {
        visibilityState.snapshotTransitionPriorVisibility = stringValue(
          "snapshotTransitionPriorVisibility",
        ) as VisibilityState["snapshotTransitionPriorVisibility"];
      }
      if ("snapshotTransitionRevision" in updateModel) {
        visibilityState.snapshotTransitionRevision = stringValue(
          "snapshotTransitionRevision",
        ) as string | undefined;
      }
      if ("snapshotTransitionTargetVisibility" in updateModel) {
        visibilityState.snapshotTransitionTargetVisibility = stringValue(
          "snapshotTransitionTargetVisibility",
        ) as VisibilityState["snapshotTransitionTargetVisibility"];
      }
    },
  };
});

const { createUpdateMock } = vi.hoisted(() => {
  return {
    createUpdateMock: (
      options: Readonly<{
        operationHistory: string[];
        queryBuilder: Record<string, unknown>;
        visibilityState: VisibilityState;
      }>,
    ) => {
      const { operationHistory, queryBuilder, visibilityState } = options;
      return vi.fn((updateModel: Record<string, unknown>) => {
        operationHistory.push(`update:${String(updateModel.visibility)}`);
        const isVisibility = ["draft", "public", "workspace"].includes(
          String(updateModel.visibility),
        );
        if (isVisibility) {
          visibilityState.pending =
            updateModel.visibility as Dashboard.Visibility;
        }
        if ("snapshotRevision" in updateModel) {
          visibilityState.shouldUpdateSnapshotRevision = true;
          visibilityState.pendingSnapshotRevision =
            typeof updateModel.snapshotRevision === "string" ?
              updateModel.snapshotRevision
            : undefined;
        }
        if ("snapshotTransitionKind" in updateModel) {
          updateTransitionState({ visibilityState, updateModel });
        }
        return queryBuilder;
      });
    },
  };
});

const {
  apiPostMock,
  bulkDeleteDashboardsMock,
  dbDeleteEqMock,
  dbDeleteMock,
  dbDeleteSelectMock,
  dbDeleteSingleMock,
  dbDeleteThrowOnErrorMock,
  dbFromMock,
  dbEqMock,
  dbIsMock,
  dbLimitMock,
  dbThrowOnErrorMock,
  dbUpdateMock,
  deleteDashboardMock,
  deleteSnapshotsMock,
  deleteSnapshotGenerationMock,
  downloadDatasetMock,
  getDashboardByIdMock,
  getDatasetsMock,
  operationLog,
  persistedVisibilityState,
  reconcileSnapshotsMock,
  uploadDatasetMock,
  useBulkDeleteDashboardsMock,
  useDeleteDashboardMock,
  uuidMock,
} = vi.hoisted(() => {
  const operationHistory: string[] = [];
  const visibilityState = createVisibilityState();
  const throwOnErrorMock = createThrowOnErrorMock(visibilityState);
  const limitMock = vi.fn(() => {
    return { throwOnError: throwOnErrorMock };
  });
  const selectMock = vi.fn(() => {
    return { limit: limitMock };
  });
  const deleteThrowOnErrorMock = vi.fn();
  const deleteSingleMock = vi.fn(() => {
    return { throwOnError: deleteThrowOnErrorMock };
  });
  const deleteSelectMock = vi.fn(() => {
    return { single: deleteSingleMock };
  });
  const deleteEqMock = vi.fn(() => {
    return { select: deleteSelectMock };
  });
  const deleteMock = vi.fn(() => {
    return { eq: deleteEqMock };
  });
  const queryBuilder = { eq: vi.fn(), is: vi.fn(), select: selectMock };
  queryBuilder.eq.mockReturnValue(queryBuilder);
  queryBuilder.is.mockReturnValue(queryBuilder);
  const updateMock = createUpdateMock({
    operationHistory,
    queryBuilder,
    visibilityState,
  });

  return {
    apiPostMock: vi.fn(),
    bulkDeleteDashboardsMock: vi.fn(),
    dbFromMock: vi.fn(() => {
      return { delete: deleteMock, update: updateMock };
    }),
    dbDeleteEqMock: deleteEqMock,
    dbDeleteMock: deleteMock,
    dbDeleteSelectMock: deleteSelectMock,
    dbDeleteSingleMock: deleteSingleMock,
    dbDeleteThrowOnErrorMock: deleteThrowOnErrorMock,
    dbEqMock: queryBuilder.eq,
    dbIsMock: queryBuilder.is,
    dbLimitMock: limitMock,
    dbThrowOnErrorMock: throwOnErrorMock,
    dbUpdateMock: updateMock,
    deleteDashboardMock: vi.fn(),
    deleteSnapshotsMock: vi.fn(),
    deleteSnapshotGenerationMock: vi.fn(),
    downloadDatasetMock: vi.fn(),
    getDashboardByIdMock: vi.fn(),
    getDatasetsMock: vi.fn(),
    operationLog: operationHistory,
    persistedVisibilityState: visibilityState,
    reconcileSnapshotsMock: vi.fn(),
    uploadDatasetMock: vi.fn(),
    useBulkDeleteDashboardsMock: vi.fn(),
    useDeleteDashboardMock: vi.fn(),
    uuidMock: vi.fn(() => {
      return SNAPSHOT_REVISION;
    }),
  };
});

vi.mock("$/lib/uuid", () => {
  return { uuid: uuidMock };
});

vi.mock("$/RdbCrudClient/createRdbCrudClient", () => {
  return {
    createRdbCrudClient: (clientSpec: MockClientSpec) => {
      if (!clientSpec.mutations) {
        return {};
      }
      const mutations = clientSpec.mutations({
        clientLogger: {
          appendName: () => {
            return {
              log: () => {
                return undefined;
              },
              warn: () => {
                return undefined;
              },
            };
          },
        },
        dbClient: { from: dbFromMock },
        parsers: {
          fromDBReadToModelRead: (dashboard) => {
            return dashboard;
          },
          fromModelUpdateToDBUpdate: (dashboard) => {
            return dashboard;
          },
        },
      });
      // The real CRUD client exposes the whole delete surface. The stand-in
      // has to expose it too, otherwise the API-surface guards below would
      // pass on absence rather than on production's `omit` list.
      return {
        ...mutations,
        bulkDelete: bulkDeleteDashboardsMock,
        delete: deleteDashboardMock,
        getById: getDashboardByIdMock,
        useBulkDelete: useBulkDeleteDashboardsMock,
        useDelete: useDeleteDashboardMock,
      };
    },
  };
});

vi.mock("@/utils/createUsableServiceClient", () => {
  return {
    createUsableServiceClient: <Client>(client: Client): Client => {
      return client;
    },
  };
});

vi.mock("@/clients/APIClient", () => {
  return { APIClient: { post: apiPostMock } };
});

vi.mock(
  "@/clients/dashboards/getDatasetIdsFromDashboardConfig/getDatasetIdsFromDashboardConfig",
  () => {
    return {
      getDatasetIdsFromDashboardConfig: () => {
        return DATASET_IDS;
      },
    };
  },
);

vi.mock(
  "@/clients/dashboards/DashboardSliceBuilder/DashboardSliceBuilder",
  () => {
    return {
      DashboardSliceBuilder: {
        DEFAULT: { mode: "all_columns" },
        buildSliceSql: vi.fn(),
        extractReferencedColumns: () => {
          return { perDataset: {}, unparseable: new Set<Dataset.Id>() };
        },
        readDashboardPublishConfig: () => {
          return { slices: {} };
        },
        writeDashboardPublishConfig: ({
          dashboardConfig,
        }: Readonly<{
          dashboardConfig: Dashboard.T["config"];
        }>) => {
          return dashboardConfig;
        },
      },
    };
  },
);

vi.mock("@/clients/datasets/DatasetClient/DatasetClient", () => {
  return { DatasetClient: { getAll: getDatasetsMock } };
});

vi.mock("@/clients/datasets/DatasetColumnClient", () => {
  return { DatasetColumnClient: { getAll: vi.fn().mockResolvedValue([]) } };
});

vi.mock("@/clients/datasets/LocalDatasetClient/LocalDatasetClient", () => {
  return {
    LocalDatasetClient: {
      getById: vi.fn().mockResolvedValue({
        parseStatus: "ready",
        parquetData: new Blob(["open-data-parquet"]),
      }),
    },
  };
});

vi.mock("@/clients/datasets/source-datasets/VirtualDatasetClient", () => {
  return {
    VirtualDatasetClient: {
      getOne: vi.fn().mockResolvedValue({ rawSql: "SELECT 1" }),
    },
  };
});

vi.mock("@/clients/qetl/WorkspaceQetlClient/WorkspaceQetlClient", () => {
  return {
    WorkspaceQetlClient: {
      runQuery: vi.fn().mockResolvedValue(new Blob(["query-parquet"])),
    },
  };
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
      PublicDatasetParquetStorageClient: {
        deleteDatasetsForDashboard: deleteSnapshotsMock,
        deleteSnapshotGeneration: deleteSnapshotGenerationMock,
        reconcileDatasetsForDashboard: reconcileSnapshotsMock,
        uploadDataset: uploadDatasetMock,
      },
    };
  },
);

vi.mock("@/utils/notifications/notify", () => {
  return { notifyError: vi.fn() };
});

const { DashboardClient } = await import("./DashboardClient");

function _makePublishConfig(): {
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

function _makeCsvDataset(datasetId: Dataset.Id): Dataset.T {
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

/**
 * Mirrors the audience split enforced by the published bucket SELECT policies.
 * The pgTAP storage tests exercise the actual database policies; this seam
 * links client failure ordering to the persisted visibility state.
 */
function _canReadPublishedSnapshotUnderDatabasePolicy(
  options: Readonly<{
    hasDashboardAccess: boolean;
    canEdit?: boolean;
    snapshotRevision: string;
  }>,
): boolean {
  return (
    options.canEdit === true ||
    (options.snapshotRevision === persistedVisibilityState.snapshotRevision &&
      (persistedVisibilityState.current === "public" ||
        options.hasDashboardAccess))
  );
}

function _makePersistedDashboard(): Dashboard.T {
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
    return { data: [_makePersistedDashboard()] };
  });
  getDashboardByIdMock.mockImplementation(async () => {
    return persistedVisibilityState.isDashboardDeleted ? undefined : (
        _makePersistedDashboard()
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

function _assertPublishTransition(
  options: Readonly<{
    uploadBucket: string;
    visibility: Dashboard.Visibility;
  }>,
): void {
  expect(apiPostMock).toHaveBeenCalledWith({
    route: "dashboards/validate-slug",
    body: {
      slug: "sales-overview",
      dashboardId: DASHBOARD_ID,
      visibility: options.visibility,
    },
  });
  expect(uploadDatasetMock).toHaveBeenCalledTimes(DATASET_IDS.length);
  expect(uploadDatasetMock).toHaveBeenCalledWith(
    expect.objectContaining({
      bucket: options.uploadBucket,
      snapshotRevision: SNAPSHOT_REVISION,
    }),
  );
  expect(deleteSnapshotsMock).not.toHaveBeenCalled();
  expect(dbUpdateMock).toHaveBeenCalledWith(
    expect.objectContaining({ visibility: options.visibility }),
  );
  expect(dbEqMock).toHaveBeenCalledWith("updated_at", DASHBOARD.updatedAt);
  expect(dbIsMock).toHaveBeenCalledWith("snapshot_revision", null);
  expect(dbLimitMock).toHaveBeenCalledWith(1);
  expect(operationLog).toEqual([
    "validate",
    "update:undefined",
    ...Array.from({ length: DATASET_IDS.length }, () => {
      return `upload:${options.uploadBucket}`;
    }),
    `reconcile:${options.uploadBucket}`,
    `update:${options.visibility}`,
  ]);
  expect(dbUpdateMock).toHaveBeenCalledWith(
    expect.objectContaining({
      snapshotRevision: SNAPSHOT_REVISION,
      visibility: options.visibility,
    }),
  );
}

function _assertOldGenerationRevoked(): void {
  expect(deleteSnapshotGenerationMock).toHaveBeenCalledWith({
    bucket: "published",
    dashboardId: DASHBOARD_ID,
    snapshotRevision: PREVIOUS_REVISION,
  });
  expect(deleteSnapshotsMock).not.toHaveBeenCalled();
  expect(dbUpdateMock).toHaveBeenCalledWith(
    expect.objectContaining({ snapshotRevision: SNAPSHOT_REVISION }),
  );
  expect(
    _canReadPublishedSnapshotUnderDatabasePolicy({
      hasDashboardAccess: false,
      snapshotRevision: PREVIOUS_REVISION,
    }),
  ).toBe(false);
  expect(
    _canReadPublishedSnapshotUnderDatabasePolicy({
      hasDashboardAccess: false,
      snapshotRevision: SNAPSHOT_REVISION,
    }),
  ).toBe(true);
  expect(
    _canReadPublishedSnapshotUnderDatabasePolicy({
      hasDashboardAccess: true,
      canEdit: true,
      snapshotRevision: PREVIOUS_REVISION,
    }),
  ).toBe(true);
}

function _configureVisibilityUpdateFailure(): void {
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

function _assertFailedVisibilityUpdateCleanup(): void {
  expect(uploadDatasetMock).toHaveBeenCalledTimes(DATASET_IDS.length);
  expect(deleteSnapshotsMock).not.toHaveBeenCalled();
  expect(deleteSnapshotGenerationMock).toHaveBeenCalledWith({
    bucket: "published",
    dashboardId: DASHBOARD_ID,
    snapshotRevision: SNAPSHOT_REVISION,
  });
  expect(dbUpdateMock).toHaveBeenCalledWith(
    expect.objectContaining({ visibility: "public" }),
  );
  expect(
    _canReadPublishedSnapshotUnderDatabasePolicy({
      hasDashboardAccess: false,
      snapshotRevision: SNAPSHOT_REVISION,
    }),
  ).toBe(false);
  expect(
    _canReadPublishedSnapshotUnderDatabasePolicy({
      hasDashboardAccess: true,
      canEdit: true,
      snapshotRevision: SNAPSHOT_REVISION,
    }),
  ).toBe(true);
}

function _configurePausedBroadCleanup(): {
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

beforeEach(() => {
  _resetTransitionMocks();
  _configureDatabaseMocks();
  _configureStorageMocks();
});

describe("DashboardClient.publishDashboard", () => {
  it.each([
    {
      visibility: "public" as const,
      uploadBucket: "published",
    },
    {
      visibility: "workspace" as const,
      uploadBucket: "published-private",
    },
  ])(
    "validates and transitions snapshots before publishing to $visibility",
    async ({ visibility, uploadBucket }) => {
      await DashboardClient.publishDashboard({
        dashboardId: DASHBOARD_ID,
        visibility,
        slug: { action: "set", value: "sales-overview" },
        publishConfig: _makePublishConfig(),
      });

      _assertPublishTransition({ visibility, uploadBucket });
    },
  );

  it("reconciles removed datasets after uploads on a same-audience republish", async () => {
    getDashboardByIdMock.mockResolvedValueOnce({
      ...DASHBOARD,
      visibility: "public",
      isPublic: true,
      snapshotRevision: PREVIOUS_REVISION,
    });

    await DashboardClient.publishDashboard({
      dashboardId: DASHBOARD_ID,
      visibility: "public",
      publishConfig: _makePublishConfig(),
    });

    expect(reconcileSnapshotsMock).toHaveBeenCalledWith({
      bucket: "published",
      dashboardId: DASHBOARD_ID,
      snapshotRevision: SNAPSHOT_REVISION,
      datasetIds: DATASET_IDS,
    });
    expect(operationLog.indexOf("reconcile:published")).toBeGreaterThan(
      operationLog.lastIndexOf("upload:published"),
    );
    expect(deleteSnapshotGenerationMock).toHaveBeenCalledWith({
      bucket: "published",
      dashboardId: DASHBOARD_ID,
      snapshotRevision: PREVIOUS_REVISION,
    });
    expect(deleteSnapshotsMock).not.toHaveBeenCalled();
  });

  it("rejects a dangling configured dataset before any storage write", async () => {
    const danglingDatasetId = DATASET_IDS[3];
    const resolvedDatasetIds = DATASET_IDS.slice(0, -1);
    getDatasetsMock.mockResolvedValueOnce(
      resolvedDatasetIds.map(_makeCsvDataset),
    );

    await expect(
      DashboardClient.publishDashboard({
        dashboardId: DASHBOARD_ID,
        visibility: "public",
        publishConfig: _makePublishConfig(),
      }),
    ).rejects.toThrow(String(danglingDatasetId));

    expect(uploadDatasetMock).not.toHaveBeenCalled();
    expect(reconcileSnapshotsMock).not.toHaveBeenCalled();
    expect(deleteSnapshotsMock).not.toHaveBeenCalled();
    expect(deleteSnapshotGenerationMock).not.toHaveBeenCalled();
    expect(dbUpdateMock).not.toHaveBeenCalled();
  });

  it("does not clear the other bucket or commit when target reconciliation fails", async () => {
    reconcileSnapshotsMock.mockRejectedValueOnce(
      new Error("reconciliation failed"),
    );

    await expect(
      DashboardClient.publishDashboard({
        dashboardId: DASHBOARD_ID,
        visibility: "workspace",
        publishConfig: _makePublishConfig(),
      }),
    ).rejects.toThrow("reconciliation failed");

    expect(uploadDatasetMock).toHaveBeenCalledTimes(DATASET_IDS.length);
    expect(deleteSnapshotsMock).not.toHaveBeenCalled();
    expect(dbUpdateMock).toHaveBeenCalledTimes(3);
    expect(deleteSnapshotGenerationMock).toHaveBeenCalledWith({
      bucket: "published-private",
      dashboardId: DASHBOARD_ID,
      snapshotRevision: SNAPSHOT_REVISION,
    });
  });

  it("does not touch storage when target slug validation fails", async () => {
    apiPostMock.mockResolvedValueOnce({ isValid: false, reason: "taken" });

    await expect(
      DashboardClient.publishDashboard({
        dashboardId: DASHBOARD_ID,
        visibility: "workspace",
        slug: { action: "set", value: "sales-overview" },
        publishConfig: _makePublishConfig(),
      }),
    ).rejects.toThrow("sales-overview");

    expect(uploadDatasetMock).not.toHaveBeenCalled();
    expect(deleteSnapshotsMock).not.toHaveBeenCalled();
    expect(deleteSnapshotGenerationMock).not.toHaveBeenCalled();
    expect(dbUpdateMock).not.toHaveBeenCalled();
  });

  it("rejects an empty explicit slug before touching storage", async () => {
    apiPostMock.mockResolvedValueOnce({ isValid: false, reason: "invalid" });

    await expect(
      DashboardClient.publishDashboard({
        dashboardId: DASHBOARD_ID,
        visibility: "public",
        slug: { action: "set", value: "" },
        publishConfig: _makePublishConfig(),
      }),
    ).rejects.toThrow('custom URL ""');

    expect(apiPostMock).toHaveBeenCalledWith({
      route: "dashboards/validate-slug",
      body: {
        slug: "",
        dashboardId: DASHBOARD_ID,
        visibility: "public",
      },
    });
    expect(uploadDatasetMock).not.toHaveBeenCalled();
    expect(deleteSnapshotsMock).not.toHaveBeenCalled();
    expect(deleteSnapshotGenerationMock).not.toHaveBeenCalled();
    expect(dbUpdateMock).not.toHaveBeenCalled();
  });

  it("skips slug validation when clearing and persists slug removal", async () => {
    await DashboardClient.publishDashboard({
      dashboardId: DASHBOARD_ID,
      visibility: "workspace",
      slug: { action: "clear" },
      publishConfig: _makePublishConfig(),
    });

    expect(apiPostMock).not.toHaveBeenCalled();
    expect(dbUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({ slug: undefined, visibility: "workspace" }),
    );
  });

  it("validates a preserved slug before touching storage", async () => {
    apiPostMock.mockResolvedValueOnce({ isValid: false, reason: "taken" });

    await expect(
      DashboardClient.publishDashboard({
        dashboardId: DASHBOARD_ID,
        visibility: "public",
        publishConfig: _makePublishConfig(),
      }),
    ).rejects.toThrow("existing-slug");

    expect(apiPostMock).toHaveBeenCalledWith({
      route: "dashboards/validate-slug",
      body: {
        slug: "existing-slug",
        dashboardId: DASHBOARD_ID,
        visibility: "public",
      },
    });
    expect(uploadDatasetMock).not.toHaveBeenCalled();
    expect(deleteSnapshotsMock).not.toHaveBeenCalled();
    expect(dbUpdateMock).not.toHaveBeenCalled();
  });

  it("does not clear snapshots or update visibility when an upload fails", async () => {
    uploadDatasetMock
      .mockImplementationOnce(async ({ bucket }) => {
        operationLog.push(`upload:${String(bucket)}`);
      })
      .mockRejectedValueOnce(new Error("upload failed"));

    await expect(
      DashboardClient.publishDashboard({
        dashboardId: DASHBOARD_ID,
        visibility: "public",
        publishConfig: _makePublishConfig(),
      }),
    ).rejects.toThrow("upload failed");

    expect(uploadDatasetMock.mock.calls.length).toBeGreaterThan(1);
    uploadDatasetMock.mock.calls.forEach(([uploadOptions]) => {
      expect(uploadOptions).toEqual(
        expect.objectContaining({ bucket: "published" }),
      );
    });
    expect(deleteSnapshotsMock).not.toHaveBeenCalled();
    expect(deleteSnapshotGenerationMock).toHaveBeenCalledWith({
      bucket: "published",
      dashboardId: DASHBOARD_ID,
      snapshotRevision: SNAPSHOT_REVISION,
    });
    expect(dbUpdateMock).toHaveBeenCalledTimes(3);
    expect(
      _canReadPublishedSnapshotUnderDatabasePolicy({
        hasDashboardAccess: false,
        snapshotRevision: SNAPSHOT_REVISION,
      }),
    ).toBe(false);
    expect(
      _canReadPublishedSnapshotUnderDatabasePolicy({
        hasDashboardAccess: true,
        canEdit: true,
        snapshotRevision: SNAPSHOT_REVISION,
      }),
    ).toBe(true);
  });

  it("keeps the committed generation live when post-commit cleanup fails", async () => {
    getDashboardByIdMock.mockResolvedValueOnce({
      ...DASHBOARD,
      snapshotRevision: PREVIOUS_REVISION,
      visibility: "public",
    });
    deleteSnapshotGenerationMock.mockRejectedValueOnce(
      new Error("cleanup failed"),
    );

    await DashboardClient.publishDashboard({
      dashboardId: DASHBOARD_ID,
      visibility: "workspace",
      publishConfig: _makePublishConfig(),
    });

    expect(uploadDatasetMock).toHaveBeenCalledTimes(DATASET_IDS.length);
    expect(dbUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({ snapshotRevision: SNAPSHOT_REVISION }),
    );
    expect(dbUpdateMock.mock.invocationCallOrder[0]).toBeLessThan(
      deleteSnapshotGenerationMock.mock.invocationCallOrder[0] ?? 0,
    );
    expect(deleteSnapshotsMock).not.toHaveBeenCalled();
  });

  it("revokes the old generation even when post-commit cleanup fails", async () => {
    getDashboardByIdMock.mockResolvedValueOnce({
      ...DASHBOARD,
      isPublic: true,
      snapshotRevision: PREVIOUS_REVISION,
      visibility: "public",
    });
    persistedVisibilityState.current = "public";
    persistedVisibilityState.snapshotRevision = PREVIOUS_REVISION;
    deleteSnapshotGenerationMock.mockRejectedValueOnce(
      new Error("cleanup failed"),
    );

    await DashboardClient.publishDashboard({
      dashboardId: DASHBOARD_ID,
      visibility: "public",
      publishConfig: _makePublishConfig(),
    });

    expect(uploadDatasetMock).toHaveBeenCalledTimes(DATASET_IDS.length);
    expect(uploadDatasetMock).toHaveBeenCalledWith(
      expect.objectContaining({ bucket: "published" }),
    );
    _assertOldGenerationRevoked();
  });

  it("deletes only its staged generation when the visibility update fails", async () => {
    _configureVisibilityUpdateFailure();

    await expect(
      DashboardClient.publishDashboard({
        dashboardId: DASHBOARD_ID,
        visibility: "public",
        publishConfig: _makePublishConfig(),
      }),
    ).rejects.toThrow("update failed");

    _assertFailedVisibilityUpdateCleanup();
  });

  it("recovers a prior process publish before claiming a new revision", async () => {
    persistedVisibilityState.snapshotTransitionKind = "publish";
    persistedVisibilityState.snapshotTransitionPriorVisibility = "draft";
    persistedVisibilityState.snapshotTransitionRevision = WINNING_REVISION;
    persistedVisibilityState.snapshotTransitionTargetVisibility = "public";
    getDashboardByIdMock.mockResolvedValueOnce({
      ...DASHBOARD,
      snapshotTransitionKind: "publish",
      snapshotTransitionPriorVisibility: "draft",
      snapshotTransitionRevision: WINNING_REVISION,
      snapshotTransitionTargetVisibility: "public",
      updatedAt: "2026-08-14T00:00:01.000Z",
    });

    await DashboardClient.publishDashboard({
      dashboardId: DASHBOARD_ID,
      visibility: "public",
      publishConfig: _makePublishConfig(),
    });

    expect(deleteSnapshotGenerationMock).toHaveBeenCalledWith({
      bucket: "published",
      dashboardId: DASHBOARD_ID,
      snapshotRevision: WINNING_REVISION,
    });
    expect(
      deleteSnapshotGenerationMock.mock.invocationCallOrder[0],
    ).toBeLessThan(uploadDatasetMock.mock.invocationCallOrder[0] ?? 0);
    expect(uploadDatasetMock).toHaveBeenCalledWith(
      expect.objectContaining({ snapshotRevision: SNAPSHOT_REVISION }),
    );
  });

  it("durably fences a prior publisher before deleting its staged revision", async () => {
    let releaseDelete: (() => void) | undefined;
    const deletePaused = new Promise<void>((resolve) => {
      releaseDelete = resolve;
    });
    persistedVisibilityState.snapshotTransitionKind = "publish";
    persistedVisibilityState.snapshotTransitionPriorVisibility = "draft";
    persistedVisibilityState.snapshotTransitionRevision = WINNING_REVISION;
    persistedVisibilityState.snapshotTransitionTargetVisibility = "public";
    getDashboardByIdMock.mockResolvedValueOnce({
      ...DASHBOARD,
      snapshotTransitionKind: "publish",
      snapshotTransitionPriorVisibility: "draft",
      snapshotTransitionRevision: WINNING_REVISION,
      snapshotTransitionTargetVisibility: "public",
      updatedAt: "2026-08-14T00:00:01.000Z",
    });
    deleteSnapshotGenerationMock.mockImplementationOnce(async () => {
      await deletePaused;
    });

    const recoveryPromise = DashboardClient.publishDashboard({
      dashboardId: DASHBOARD_ID,
      visibility: "public",
      publishConfig: _makePublishConfig(),
    });
    await vi.waitFor(() => {
      expect(deleteSnapshotGenerationMock).toHaveBeenCalledTimes(1);
    });

    expect(persistedVisibilityState.snapshotTransitionKind).toBe(
      "abort_publish",
    );
    expect(dbUpdateMock.mock.invocationCallOrder[0]).toBeLessThan(
      deleteSnapshotGenerationMock.mock.invocationCallOrder[0] ?? 0,
    );

    releaseDelete?.();
    await recoveryPromise;
  });

  it("fences a losing publisher before any storage write", async () => {
    persistedVisibilityState.current = "public";
    persistedVisibilityState.snapshotRevision = WINNING_REVISION;
    dbThrowOnErrorMock.mockResolvedValueOnce({ data: [] });

    await expect(
      DashboardClient.publishDashboard({
        dashboardId: DASHBOARD_ID,
        visibility: "public",
        publishConfig: _makePublishConfig(),
      }),
    ).rejects.toThrow("transition could start");

    expect(uploadDatasetMock).not.toHaveBeenCalled();
    expect(deleteSnapshotGenerationMock).not.toHaveBeenCalled();
    expect(deleteSnapshotsMock).not.toHaveBeenCalled();
    expect(persistedVisibilityState.snapshotRevision).toBe(WINNING_REVISION);
  });

  it("compares a previously committed pointer as well as updated_at", async () => {
    getDashboardByIdMock.mockResolvedValueOnce({
      ...DASHBOARD,
      snapshotRevision: PREVIOUS_REVISION,
      visibility: "public",
    });
    persistedVisibilityState.snapshotRevision = PREVIOUS_REVISION;

    await DashboardClient.publishDashboard({
      dashboardId: DASHBOARD_ID,
      visibility: "workspace",
      publishConfig: _makePublishConfig(),
    });

    expect(dbEqMock).toHaveBeenCalledWith(
      "snapshot_revision",
      PREVIOUS_REVISION,
    );
    expect(dbEqMock).toHaveBeenCalledWith("updated_at", DASHBOARD.updatedAt);
    expect(dbEqMock).toHaveBeenCalledWith(
      "snapshot_revision",
      PREVIOUS_REVISION,
    );
  });
});

describe("DashboardClient.unpublishDashboard", () => {
  it("claims cleanup with CAS before clearing every generation", async () => {
    uuidMock.mockReturnValueOnce(CLEANUP_REVISION);
    getDashboardByIdMock.mockResolvedValueOnce({
      ...DASHBOARD,
      snapshotRevision: PREVIOUS_REVISION,
      visibility: "workspace",
    });
    await DashboardClient.unpublishDashboard({ dashboardId: DASHBOARD_ID });

    expect(operationLog).toEqual([
      "update:draft",
      "clear:published",
      "clear:published-private",
      "update:draft",
    ]);
    expect(dbUpdateMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        snapshotTransitionRevision: CLEANUP_REVISION,
        visibility: "draft",
      }),
    );
    expect(dbUpdateMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        snapshotRevision: undefined,
        snapshotTransitionRevision: undefined,
        visibility: "draft",
      }),
    );
    expect(dbEqMock).toHaveBeenCalledWith(
      "snapshot_revision",
      PREVIOUS_REVISION,
    );
  });

  it("revalidates the exact cleanup claim with CAS before removals", async () => {
    uuidMock.mockReturnValueOnce(CLEANUP_REVISION);
    getDashboardByIdMock.mockResolvedValueOnce({
      ...DASHBOARD,
      snapshotRevision: PREVIOUS_REVISION,
      visibility: "workspace",
    });
    deleteSnapshotsMock.mockImplementation(
      async ({ assertCanDelete, bucket }) => {
        operationLog.push(`clear:${String(bucket)}`);
        await assertCanDelete();
      },
    );

    await DashboardClient.unpublishDashboard({ dashboardId: DASHBOARD_ID });

    expect(dbUpdateMock).toHaveBeenCalledTimes(4);
    expect(dbUpdateMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        snapshotTransitionRevision: CLEANUP_REVISION,
      }),
    );
    expect(dbUpdateMock).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        snapshotTransitionRevision: CLEANUP_REVISION,
      }),
    );
  });

  it("keeps the cleanup claim unpublished when broad cleanup fails", async () => {
    uuidMock.mockReturnValueOnce(CLEANUP_REVISION);
    getDashboardByIdMock.mockResolvedValueOnce({
      ...DASHBOARD,
      snapshotRevision: PREVIOUS_REVISION,
      visibility: "public",
    });
    persistedVisibilityState.snapshotRevision = PREVIOUS_REVISION;
    deleteSnapshotsMock.mockRejectedValueOnce(new Error("cleanup failed"));

    await expect(
      DashboardClient.unpublishDashboard({ dashboardId: DASHBOARD_ID }),
    ).rejects.toThrow("cleanup failed");

    expect(dbUpdateMock).toHaveBeenCalledTimes(1);
    expect(dbUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        snapshotTransitionRevision: CLEANUP_REVISION,
        visibility: "draft",
      }),
    );
    expect(deleteSnapshotsMock).toHaveBeenCalledTimes(2);
    expect(persistedVisibilityState.current).toBe("draft");
    expect(persistedVisibilityState.snapshotRevision).toBe(PREVIOUS_REVISION);
    expect(persistedVisibilityState.snapshotTransitionRevision).toBe(
      CLEANUP_REVISION,
    );

    getDashboardByIdMock.mockResolvedValueOnce({
      ...DASHBOARD,
      snapshotRevision: PREVIOUS_REVISION,
      snapshotTransitionKind: "unpublish",
      snapshotTransitionPriorRevision: PREVIOUS_REVISION,
      snapshotTransitionPriorVisibility: "public",
      snapshotTransitionRevision: CLEANUP_REVISION,
      visibility: "draft",
      updatedAt: persistedVisibilityState.updatedAt,
    });
    await DashboardClient.unpublishDashboard({ dashboardId: DASHBOARD_ID });
    expect(deleteSnapshotsMock).toHaveBeenCalledTimes(4);
    expect(persistedVisibilityState.snapshotRevision).toBeUndefined();
  });
});

describe("DashboardClient.fullDelete", () => {
  it("does not expose raw delete mutations that bypass snapshot cleanup", () => {
    // A positive control: the CRUD stand-in really does hand these keys over,
    // so the absences below are production's `omit` list and not a gap in the
    // mock.
    expect(DashboardClient).toHaveProperty("getById");
    expect(DashboardClient).not.toHaveProperty("delete");
    expect(DashboardClient).not.toHaveProperty("bulkDelete");
    expect(DashboardClient).not.toHaveProperty("useDelete");
    expect(DashboardClient).not.toHaveProperty("useBulkDelete");
  });

  it("resumes cleanup when a lost CAS response already revoked access", async () => {
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
    dbThrowOnErrorMock.mockRejectedValueOnce(new Error("response lost"));

    await DashboardClient.fullDelete({ id: DASHBOARD_ID });

    expect(deleteSnapshotsMock).toHaveBeenCalledTimes(2);
    expect(dbDeleteMock).toHaveBeenCalledOnce();
    expect(dbDeleteEqMock).toHaveBeenCalledWith("id", DASHBOARD_ID);
  });

  it("revokes snapshot access before clearing buckets and deleting", async () => {
    uuidMock.mockReturnValueOnce(CLEANUP_REVISION);
    getDashboardByIdMock.mockResolvedValueOnce({
      ...DASHBOARD,
      snapshotRevision: PREVIOUS_REVISION,
      visibility: "public",
    });

    await DashboardClient.fullDelete({ id: DASHBOARD_ID });

    expect(operationLog).toEqual([
      "update:draft",
      "clear:published",
      "clear:published-private",
      "delete-row",
    ]);
    expect(dbUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        snapshotTransitionRevision: CLEANUP_REVISION,
        visibility: "draft",
      }),
    );
    expect(dbDeleteSelectMock).toHaveBeenCalledWith("id");
    expect(dbDeleteSingleMock).toHaveBeenCalledOnce();
    expect(deleteDashboardMock).not.toHaveBeenCalled();
  });

  it("rejects a definite zero-row delete even when a reread would hide the row", async () => {
    uuidMock.mockReturnValueOnce(CLEANUP_REVISION);
    getDashboardByIdMock.mockResolvedValueOnce({
      ...DASHBOARD,
      snapshotRevision: PREVIOUS_REVISION,
      visibility: "public",
    });
    persistedVisibilityState.isDashboardDeleted = true;
    const cardinalityError = Object.assign(new Error("zero rows"), {
      code: "PGRST116",
    });
    dbDeleteThrowOnErrorMock.mockRejectedValueOnce(cardinalityError);

    await expect(DashboardClient.fullDelete({ id: DASHBOARD_ID })).rejects.toBe(
      cardinalityError,
    );
    expect(getDashboardByIdMock).toHaveBeenCalledOnce();
  });

  it("rejects a successful delete response for a different dashboard", async () => {
    uuidMock.mockReturnValueOnce(CLEANUP_REVISION);
    getDashboardByIdMock.mockResolvedValueOnce({
      ...DASHBOARD,
      snapshotRevision: PREVIOUS_REVISION,
      visibility: "public",
    });
    dbDeleteThrowOnErrorMock.mockResolvedValueOnce({
      data: { id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd" },
    });

    await expect(
      DashboardClient.fullDelete({ id: DASHBOARD_ID }),
    ).rejects.toThrow("Dashboard delete returned an unexpected row");
    expect(getDashboardByIdMock).toHaveBeenCalledOnce();
  });

  it("accepts a lost final-delete response when the dashboard is gone", async () => {
    uuidMock.mockReturnValueOnce(CLEANUP_REVISION);
    getDashboardByIdMock.mockResolvedValueOnce({
      ...DASHBOARD,
      snapshotRevision: PREVIOUS_REVISION,
      visibility: "public",
    });
    dbDeleteThrowOnErrorMock.mockImplementationOnce(async () => {
      operationLog.push("delete-row");
      persistedVisibilityState.isDashboardDeleted = true;
      throw new Error("response lost");
    });

    await expect(
      DashboardClient.fullDelete({ id: DASHBOARD_ID }),
    ).resolves.toBeUndefined();
    expect(getDashboardByIdMock).toHaveBeenCalledTimes(2);
  });

  it("leaves an inaccessible draft row when snapshot cleanup fails", async () => {
    uuidMock.mockReturnValueOnce(CLEANUP_REVISION);
    deleteSnapshotsMock.mockRejectedValueOnce(new Error("cleanup failed"));

    await expect(
      DashboardClient.fullDelete({ id: DASHBOARD_ID }),
    ).rejects.toThrow("cleanup failed");

    expect(dbDeleteMock).not.toHaveBeenCalled();
    expect(persistedVisibilityState.current).toBe("draft");
    expect(persistedVisibilityState.snapshotRevision).toBeUndefined();
    expect(persistedVisibilityState.snapshotTransitionRevision).toBe(
      CLEANUP_REVISION,
    );

    getDashboardByIdMock.mockResolvedValueOnce({
      ...DASHBOARD,
      snapshotTransitionKind: "delete",
      snapshotTransitionPriorVisibility: "draft",
      snapshotTransitionRevision: CLEANUP_REVISION,
      visibility: "draft",
      updatedAt: persistedVisibilityState.updatedAt,
    });
    await DashboardClient.fullDelete({ id: DASHBOARD_ID });
    expect(dbDeleteMock).toHaveBeenCalledOnce();
  });

  it("blocks a cross-device publication throughout broad cleanup", async () => {
    const { releaseCleanup } = _configurePausedBroadCleanup();

    const deletePromise = DashboardClient.fullDelete({ id: DASHBOARD_ID });
    await vi.waitFor(() => {
      expect(deleteSnapshotsMock).toHaveBeenCalledTimes(1);
    });

    const publishPromise = DashboardClient.publishDashboard({
      dashboardId: DASHBOARD_ID,
      visibility: "public",
      publishConfig: _makePublishConfig(),
    });
    await vi.waitFor(() => {
      expect(deleteSnapshotsMock).toHaveBeenCalledTimes(2);
    });
    expect(uploadDatasetMock).not.toHaveBeenCalled();

    releaseCleanup();
    await expect(publishPromise).rejects.toThrow("Expected dashboard");
    await deletePromise;
    expect(dbDeleteMock).toHaveBeenCalled();
  });
});
