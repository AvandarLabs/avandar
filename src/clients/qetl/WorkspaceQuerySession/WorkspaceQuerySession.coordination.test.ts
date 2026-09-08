/** Tests workspace QETL ownership handoff from published snapshot tables. */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { DatasetDuckDbCoordinator } from "@/clients/DuckDbClient/DatasetDuckDbCoordinator/DatasetDuckDbCoordinator";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { DatasetDuckDbLease } from "@/clients/DuckDbClient/DatasetDuckDbCoordinator/DatasetDuckDbCoordinator";

const DATASET_ID = "22222222-2222-4222-8222-222222222222" as Dataset.Id;
const DASHBOARD_ID = "11111111-1111-4111-8111-111111111111" as Dashboard.Id;

// `vi.mock` factories are hoisted above every other statement, so ids the
// mocks need live here rather than in a plain `const`, which would be in its
// temporal dead zone when a factory runs.
const { datasetGetAllMock, dropTableViewAndFileMock, ids } = vi.hoisted(() => {
  return {
    datasetGetAllMock: vi.fn(),
    dropTableViewAndFileMock: vi.fn(),
    ids: {
      userId: "66666666-6666-4666-8666-666666666666",
      workspaceId: "55555555-5555-4555-8555-555555555555",
    },
  };
});

const WORKSPACE_ID = ids.workspaceId as Workspace.Id;

vi.mock("@/clients/AuthClient/AuthClient", () => {
  return {
    AuthClient: {
      getCurrentSession: vi.fn(async () => {
        return { user: { id: ids.userId } };
      }),
    },
  };
});

vi.mock("@/clients/WorkspaceClient", () => {
  return {
    WorkspaceClient: {
      QueryKeys: {
        getWorkspacesOfCurrentUser: () => {
          return ["Workspace", "getWorkspacesOfCurrentUser"];
        },
      },
      withCache: () => {
        return {
          withFetchQuery: () => {
            return {
              getWorkspacesOfCurrentUser: async () => {
                return [{ id: ids.workspaceId }];
              },
            };
          },
        };
      },
    },
  };
});

// Both accessors are modelled because the session uses each for a different
// purpose: `withEnsureQueryData` for the lease breadth, and `withFetchQuery`
// for the per-relation authorization read, which must honor staleness. Both
// answer from the same mock, so a dataset in this list is one the workspace
// owns and is therefore authorized.
vi.mock("@/clients/datasets/DatasetClient/DatasetClient", () => {
  return {
    DatasetClient: {
      withCache: () => {
        return {
          withEnsureQueryData: () => {
            return { getAll: datasetGetAllMock };
          },
          withFetchQuery: () => {
            return { getAll: datasetGetAllMock };
          },
        };
      },
    },
  };
});

vi.mock("@/clients/datasets/LocalDatasetClient/LocalDatasetClient", () => {
  return { LocalDatasetClient: { bulkInsert: vi.fn() } };
});

vi.mock("@/clients/DuckDbClient/DuckDbClient", () => {
  return {
    DuckDbClient: {
      dropTableViewAndFile: dropTableViewAndFileMock,
    },
  };
});

vi.mock("@/clients/qetl/QueryMediator/QueryMediator", () => {
  return {
    QueryMediatorFactory: {
      create: (options: {
        getQueryDependencies: (rawSql: string) => Promise<Dataset.Id[]>;
        prepareDuckDbDatasets?: (params: {
          datasetIds: readonly Dataset.Id[];
          datasetDuckDbLease: DatasetDuckDbLease;
        }) => Promise<void>;
      }) => {
        return {
          runQuery: async ({ rawSql }: { rawSql: string }) => {
            const datasetIds = await options.getQueryDependencies(rawSql);
            const { runCoordinatedDatasetDuckDbOperation } =
              DatasetDuckDbCoordinator;
            return await runCoordinatedDatasetDuckDbOperation({
              datasetIds,
              operation: async (datasetDuckDbLease) => {
                await options.prepareDuckDbDatasets?.({
                  datasetIds,
                  datasetDuckDbLease,
                });
                return {
                  data: [
                    {
                      datasetIds,
                      hasPublicOwner:
                        DatasetDuckDbCoordinator.hasPublicSnapshotDatasetOwner(
                          DATASET_ID,
                        ),
                    },
                  ],
                };
              },
            });
          },
        };
      },
    },
  };
});

beforeEach(() => {
  vi.clearAllMocks();
  DatasetDuckDbCoordinator.clearPublicSnapshotDatasetOwner(DATASET_ID);
  datasetGetAllMock.mockResolvedValue([{ id: DATASET_ID }]);
  dropTableViewAndFileMock.mockImplementation(
    async (options: {
      datasetDuckDbLease?: unknown;
      tableOrViewName: Dataset.Id;
    }) => {
      expect(options.datasetDuckDbLease).toBeDefined();
      DatasetDuckDbCoordinator.clearPublicSnapshotDatasetOwner(DATASET_ID);
    },
  );
});

describe("WorkspaceQuerySession DuckDB coordination", () => {
  it("ignores eligible dataset IDs used only as literals or CTE aliases", async () => {
    const { WorkspaceQuerySession } =
      await import("@/clients/qetl/WorkspaceQuerySession/WorkspaceQuerySession");

    await expect(
      WorkspaceQuerySession.runQuery({
        rawSql: [
          `WITH "${DATASET_ID}" AS (`,
          `SELECT '${DATASET_ID}' AS dataset_id`,
          `) SELECT * FROM "${DATASET_ID}"`,
        ].join(" "),
        workspaceId: WORKSPACE_ID,
      }),
    ).resolves.toEqual({
      data: [{ datasetIds: [], hasPublicOwner: false }],
    });
  });

  it("evicts a public-owned table before the workspace query", async () => {
    DatasetDuckDbCoordinator.setPublicSnapshotDatasetOwner({
      datasetId: DATASET_ID,
      owner: {
        bucket: "published",
        dashboardId: DASHBOARD_ID,
        snapshotRevision: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      },
    });
    const { WorkspaceQuerySession } =
      await import("@/clients/qetl/WorkspaceQuerySession/WorkspaceQuerySession");

    await expect(
      WorkspaceQuerySession.runQuery({
        rawSql: `SELECT * FROM "${DATASET_ID}"`,
        workspaceId: WORKSPACE_ID,
      }),
    ).resolves.toEqual({
      data: [{ datasetIds: [DATASET_ID], hasPublicOwner: false }],
    });
    expect(dropTableViewAndFileMock).toHaveBeenCalledWith({
      tableOrViewName: DATASET_ID,
      datasetDuckDbLease: expect.any(Object),
    });
  });
});
