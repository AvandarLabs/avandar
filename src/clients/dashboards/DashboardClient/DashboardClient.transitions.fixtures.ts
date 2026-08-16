/**
 * The stateful mock bundle for the DashboardClient snapshot transition
 * tests, plus the client loaded once every mock is registered. Scenario
 * files reach the client through this module so the ordering holds.
 */
import { vi } from "vitest";
import "@/clients/dashboards/DashboardClient/dashboardTransitionStubs";
import {
  DASHBOARD,
  SNAPSHOT_REVISION,
} from "@/clients/dashboards/DashboardClient/dashboardTransitionConstants";
import type { VisibilityState } from "@/clients/dashboards/DashboardClient/dashboardTransitionConstants";
import type { Dashboard } from "$/models/Dashboard/Dashboard";

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

vi.mock("@/clients/datasets/DatasetClient/DatasetClient", () => {
  return { DatasetClient: { getAll: getDatasetsMock } };
});

vi.mock("@/clients/datasets/DatasetColumnClient", () => {
  return { DatasetColumnClient: { getAll: vi.fn().mockResolvedValue([]) } };
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

export const { DashboardClient } =
  await import("@/clients/dashboards/DashboardClient/DashboardClient");

export {
  apiPostMock,
  bulkDeleteDashboardsMock,
  dbDeleteEqMock,
  dbDeleteMock,
  dbDeleteSelectMock,
  dbDeleteSingleMock,
  dbDeleteThrowOnErrorMock,
  dbEqMock,
  dbFromMock,
  dbIsMock,
  dbLimitMock,
  dbThrowOnErrorMock,
  dbUpdateMock,
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
  useBulkDeleteDashboardsMock,
  useDeleteDashboardMock,
  uuidMock,
};
