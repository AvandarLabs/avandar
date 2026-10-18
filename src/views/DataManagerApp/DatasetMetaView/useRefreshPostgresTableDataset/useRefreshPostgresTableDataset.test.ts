import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { makePrincipalKeyFromWorkspaceSession } from "$/models/relations/RelationCacheKey/RelationCacheKey";
import { act, renderHook, TestProviders, waitFor } from "@/test-utils";
import { RAW_SQL_KEY_MARKER } from "@/views/DataExplorerApp/useDataQuery/isWorkspaceRawSqlDataQueryKey";
import { useRefreshPostgresTableDataset } from "@/views/DataManagerApp/DatasetMetaView/useRefreshPostgresTableDataset/useRefreshPostgresTableDataset";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { User } from "$/models/User/User";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { ReactNode } from "react";

const DATASET_ID = "11111111-1111-4111-8111-111111111111" as Dataset.Id;
const USER_ID = "00000000-0000-4000-8000-000000000001" as User.Id;
const WORKSPACE_ID = "00000000-0000-4000-8000-000000000002" as Workspace.Id;

const {
  dropLocalDatasetMock,
  evictRelationCacheMock,
  notifySuccessMock,
  notifyErrorMock,
} = vi.hoisted(() => {
  return {
    dropLocalDatasetMock: vi.fn(),
    evictRelationCacheMock: vi.fn(),
    notifySuccessMock: vi.fn(),
    notifyErrorMock: vi.fn(),
  };
});

vi.mock("@/clients/datasets/LocalDatasetClient/LocalDatasetClient", () => {
  return { LocalDatasetClient: { dropLocalDataset: dropLocalDatasetMock } };
});

vi.mock(
  "@/clients/qetl/RelationCache/DexieRelationCache/DexieRelationCache",
  () => {
    return { DexieRelationCache: { evict: evictRelationCacheMock } };
  },
);

vi.mock("@/utils/notifications/notify", () => {
  return { notifySuccess: notifySuccessMock, notifyError: notifyErrorMock };
});

vi.mock("@/hooks/users/useCurrentUser", () => {
  return {
    useCurrentUser: () => {
      return { id: USER_ID };
    },
  };
});

vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: () => {
      return { id: WORKSPACE_ID };
    },
  };
});

function _makeWrapper(
  queryClient: QueryClient,
): (props: { children: ReactNode }) => JSX.Element {
  return ({ children }) => {
    // `TestProviders` supplies the Lingui provider the hook's `useLingui`
    // needs.
    return createElement(
      TestProviders,
      null,
      createElement(QueryClientProvider, { client: queryClient }, children),
    );
  };
}

describe("useRefreshPostgresTableDataset", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dropLocalDatasetMock.mockResolvedValue(undefined);
    evictRelationCacheMock.mockResolvedValue(undefined);
  });

  it("drops every cached copy of the dataset's rows so the next query reads the table again", async () => {
    const queryClient = new QueryClient();
    const { result } = renderHook(useRefreshPostgresTableDataset, {
      wrapper: _makeWrapper(queryClient),
    });

    act(() => {
      result.current[0]({ datasetId: DATASET_ID });
    });

    await waitFor(() => {
      expect(notifySuccessMock).toHaveBeenCalledTimes(1);
    });
    expect(evictRelationCacheMock).toHaveBeenCalledWith(
      [{ kind: "dataset", id: DATASET_ID }],
      makePrincipalKeyFromWorkspaceSession({
        workspaceId: WORKSPACE_ID,
        userId: USER_ID,
      }),
    );
    expect(dropLocalDatasetMock).toHaveBeenCalledWith({
      datasetId: DATASET_ID,
    });
  });

  it("marks open data queries stale so they show the table's current rows", async () => {
    const queryClient = new QueryClient();
    const dataQueryKey = [
      { auth: "workspace", workspaceId: WORKSPACE_ID },
      undefined,
      RAW_SQL_KEY_MARKER,
      "select 1",
    ];
    const unrelatedQueryKey = ["datasets", "getAll"];
    queryClient.setQueryData(dataQueryKey, { rows: [] });
    queryClient.setQueryData(unrelatedQueryKey, []);
    const { result } = renderHook(useRefreshPostgresTableDataset, {
      wrapper: _makeWrapper(queryClient),
    });

    act(() => {
      result.current[0]({ datasetId: DATASET_ID });
    });

    await waitFor(() => {
      expect(notifySuccessMock).toHaveBeenCalledTimes(1);
    });
    expect(queryClient.getQueryState(dataQueryKey)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(unrelatedQueryKey)?.isInvalidated).toBe(
      false,
    );
  });
});
