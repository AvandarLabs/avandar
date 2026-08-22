/** Tests that workspace QETL queries are authorized before any query work. */

import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { UserId } from "$/models/User/User.types";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { QueryClient } from "@tanstack/react-query";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { WorkspaceMembershipDenied } from "@/clients/qetl/assertWorkspaceMembership/WorkspaceMembershipDenied";
import { WorkspaceQuerySession } from "@/clients/qetl/WorkspaceQuerySession/WorkspaceQuerySession";
import { AvaQueryClient } from "@/config/AvaQueryClient";

const USER_ID = "66666666-6666-4666-8666-666666666666" as UserId;
const DATASET_ID = "22222222-2222-4222-8222-222222222222" as Dataset.Id;
const MEMBER_WORKSPACE_ID =
  "55555555-5555-4555-8555-555555555555" as Workspace.Id;
const FOREIGN_WORKSPACE_ID =
  "44444444-4444-4444-8444-444444444444" as Workspace.Id;

const WORKSPACES_QUERY_KEY = ["Workspace", "getWorkspacesOfCurrentUser"];

const { fetchWorkspacesMock, getCurrentSessionMock, innerRunQueryMock } =
  vi.hoisted(() => {
    return {
      fetchWorkspacesMock: vi.fn(),
      getCurrentSessionMock: vi.fn(),
      innerRunQueryMock: vi.fn(),
    };
  });

// Mirrors the `staleTime` and `networkMode` that ship in
// `src/config/AvaQueryClient.ts`, because authorization reads membership
// through this client and its freshness policy is part of the behavior. They
// are replicated rather than imported because importing the real module pulls
// in the whole `ServerApiClient` graph.
vi.mock("@/config/AvaQueryClient", async () => {
  const { QueryClient: TanstackQueryClient } =
    await import("@tanstack/react-query");
  const { getIsOnline } = await import("@avandar/browser-utils");
  return {
    AvaQueryClient: new TanstackQueryClient({
      defaultOptions: {
        queries: {
          staleTime: () => {
            return getIsOnline() ? 6 * 60 * 1000 : Number.POSITIVE_INFINITY;
          },
          networkMode: "offlineFirst",
          retry: false,
        },
      },
    }),
  };
});

vi.mock("@/clients/AuthClient/AuthClient", () => {
  return { AuthClient: { getCurrentSession: getCurrentSessionMock } };
});

vi.mock("@/clients/WorkspaceClient", () => {
  return {
    WorkspaceClient: {
      QueryKeys: {
        getWorkspacesOfCurrentUser: () => {
          return WORKSPACES_QUERY_KEY;
        },
      },
      withCache: (queryClient: QueryClient) => {
        return {
          withFetchQuery: () => {
            return {
              getWorkspacesOfCurrentUser: async () => {
                return await queryClient.fetchQuery({
                  queryKey: WORKSPACES_QUERY_KEY,
                  queryFn: fetchWorkspacesMock,
                });
              },
            };
          },
        };
      },
    },
  };
});

vi.mock("@/clients/datasets/DatasetClient/DatasetClient", () => {
  return {
    DatasetClient: {
      withCache: () => {
        return {
          withEnsureQueryData: () => {
            return {
              getAll: vi.fn(async () => {
                return [{ id: DATASET_ID }];
              }),
            };
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
  return { DuckDbClient: { dropTableViewAndFile: vi.fn() } };
});

vi.mock("@/clients/qetl/QueryMediator/QueryMediator", () => {
  return {
    QueryMediatorFactory: {
      create: () => {
        return { runQuery: innerRunQueryMock };
      },
    },
  };
});

async function getDenialCode(promise: Promise<unknown>): Promise<unknown> {
  const error = await promise.then(
    () => {
      return undefined;
    },
    (thrown: unknown) => {
      return thrown;
    },
  );
  expect(error).toBeInstanceOf(WorkspaceMembershipDenied);
  return (error as WorkspaceMembershipDenied).code;
}

beforeEach(() => {
  vi.clearAllMocks();

  // Start every test on a cold cache so authorization goes through the fetch
  // path the app takes outside a workspace route loader.
  AvaQueryClient.clear();
  innerRunQueryMock.mockResolvedValue({ data: [] });
  getCurrentSessionMock.mockResolvedValue({ user: { id: USER_ID } });
  fetchWorkspacesMock.mockResolvedValue([{ id: MEMBER_WORKSPACE_ID }]);
});

describe("WorkspaceQuerySession membership authorization", () => {
  it("rejects a non-member before running a js query", async () => {
    await expect(
      getDenialCode(
        WorkspaceQuerySession.runQuery({
          rawSql: `SELECT * FROM "${DATASET_ID}"`,
          workspaceId: FOREIGN_WORKSPACE_ID,
        }),
      ),
    ).resolves.toBe("not-a-member");

    expect(innerRunQueryMock).not.toHaveBeenCalled();
  });

  it("rejects a non-member before running a parquet query", async () => {
    await expect(
      getDenialCode(
        WorkspaceQuerySession.runQuery({
          rawSql: `SELECT * FROM "${DATASET_ID}"`,
          workspaceId: FOREIGN_WORKSPACE_ID,
          returnType: "parquet",
        }),
      ),
    ).resolves.toBe("not-a-member");

    expect(innerRunQueryMock).not.toHaveBeenCalled();
  });

  it("rejects an unauthenticated caller before running a query", async () => {
    getCurrentSessionMock.mockResolvedValue(undefined);

    await expect(
      getDenialCode(
        WorkspaceQuerySession.runQuery({
          rawSql: `SELECT * FROM "${DATASET_ID}"`,
          workspaceId: MEMBER_WORKSPACE_ID,
        }),
      ),
    ).resolves.toBe("not-authenticated");

    expect(innerRunQueryMock).not.toHaveBeenCalled();
    expect(fetchWorkspacesMock).not.toHaveBeenCalled();
  });

  it("reads the session once per query", async () => {
    await WorkspaceQuerySession.runQuery({
      rawSql: `SELECT * FROM "${DATASET_ID}"`,
      workspaceId: MEMBER_WORKSPACE_ID,
    });

    // On desktop each session read is a keychain IPC round trip, so the
    // authorization result is reused rather than read again.
    expect(getCurrentSessionMock).toHaveBeenCalledTimes(1);
  });

  it("runs a js query for a member", async () => {
    await expect(
      WorkspaceQuerySession.runQuery({
        rawSql: `SELECT * FROM "${DATASET_ID}"`,
        workspaceId: MEMBER_WORKSPACE_ID,
      }),
    ).resolves.toEqual({ data: [] });

    expect(innerRunQueryMock).toHaveBeenCalledTimes(1);
    expect(innerRunQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({ returnType: "js" }),
    );
  });

  it("runs a parquet query for a member", async () => {
    const parquetBlob = new Blob(["parquet"]);
    innerRunQueryMock.mockResolvedValue(parquetBlob);

    await expect(
      WorkspaceQuerySession.runQuery({
        rawSql: `SELECT * FROM "${DATASET_ID}"`,
        workspaceId: MEMBER_WORKSPACE_ID,
        returnType: "parquet",
      }),
    ).resolves.toBe(parquetBlob);

    expect(innerRunQueryMock).toHaveBeenCalledTimes(1);
    expect(innerRunQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({ returnType: "parquet" }),
    );
  });
});
