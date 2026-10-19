import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { makePrincipalKeyFromWorkspaceSession } from "$/models/relations/RelationCacheKey/RelationCacheKey";
import { GOOGLE_SHEET_FRESHNESS_CACHE } from "@/clients/google/GoogleDriveClient/googleSheetFreshness";
import { act, renderHook, TestProviders, waitFor } from "@/test-utils";
import { RAW_SQL_KEY_MARKER } from "@/views/DataExplorerApp/useDataQuery/isWorkspaceRawSqlDataQueryKey";
import { useRefreshGoogleSheetDataset } from "@/views/DataManagerApp/DatasetMetaView/useRefreshGoogleSheetDataset";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { User } from "$/models/User/User";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { ReactNode } from "react";

const DATASET_ID = "11111111-1111-4111-8111-111111111111" as Dataset.Id;
const USER_ID = "00000000-0000-4000-8000-000000000001" as User.Id;
const WORKSPACE_ID = "00000000-0000-4000-8000-000000000002" as Workspace.Id;
/** Records the order the refresh steps ran in. */
const callOrder: string[] = [];

const {
  apiGetMock,
  dropLocalDatasetMock,
  startCsvImportMock,
  fetchSheetCsvMock,
  evictRelationCacheMock,
  notifySuccessMock,
  notifyErrorMock,
} = vi.hoisted(() => {
  return {
    apiGetMock: vi.fn(),
    dropLocalDatasetMock: vi.fn(),
    startCsvImportMock: vi.fn(),
    fetchSheetCsvMock: vi.fn(),
    evictRelationCacheMock: vi.fn(),
    notifySuccessMock: vi.fn(),
    notifyErrorMock: vi.fn(),
  };
});

vi.mock("@/clients/APIClient", () => {
  return { APIClient: { get: apiGetMock } };
});

vi.mock("@/clients/datasets/LocalDatasetClient/LocalDatasetClient", () => {
  return {
    LocalDatasetClient: {
      dropLocalDataset: dropLocalDatasetMock,
      startCsvImport: startCsvImportMock,
    },
  };
});

vi.mock(
  "@/clients/google/GoogleSheetDatasetProxy/GoogleSheetDatasetProxy",
  () => {
    return { GoogleSheetDatasetProxy: { fetchCsv: fetchSheetCsvMock } };
  },
);

vi.mock(
  "@/clients/qetl/RelationCache/DexieRelationCache/DexieRelationCache",
  () => {
    return {
      DexieRelationCache: { evict: evictRelationCacheMock },
    };
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

function _makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
}

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

async function _refresh(
  options: Readonly<{ queryClient?: QueryClient }> = {},
): Promise<void> {
  const { queryClient = _makeQueryClient() } = options;
  const { result } = renderHook(
    () => {
      return useRefreshGoogleSheetDataset();
    },
    { wrapper: _makeWrapper(queryClient) },
  );

  await act(async () => {
    await result.current[0].async({ datasetId: DATASET_ID }).catch(() => {
      // Failure paths are asserted through the notification mocks.
    });
  });
}

describe("useRefreshGoogleSheetDataset", () => {
  beforeEach(() => {
    callOrder.length = 0;
    GOOGLE_SHEET_FRESHNESS_CACHE.clear();

    apiGetMock.mockReset();

    evictRelationCacheMock.mockReset();
    evictRelationCacheMock.mockImplementation(async () => {
      callOrder.push("evict");
    });

    dropLocalDatasetMock.mockReset();
    dropLocalDatasetMock.mockImplementation(async () => {
      callOrder.push("drop");
    });

    fetchSheetCsvMock.mockReset();
    fetchSheetCsvMock.mockImplementation(async () => {
      callOrder.push("download");
      return { csvText: "county\r\nNairobi\r\n", sourceVersion: "99" };
    });

    startCsvImportMock.mockReset();
    startCsvImportMock.mockImplementation(async () => {
      callOrder.push("import");
      return {
        columns: [{ column_name: "county", column_type: "VARCHAR" }],
        previewRows: [{ county: "Nairobi" }],
        csvSniff: {},
      };
    });

    notifySuccessMock.mockReset();
    notifyErrorMock.mockReset();
  });

  it("forgets the cached version so a just-edited sheet is not reported unchanged", async () => {
    GOOGLE_SHEET_FRESHNESS_CACHE.set(DATASET_ID, {
      checkedAt: 1_700_000_000_000,
      version: "1",
    });

    await _refresh();

    expect(GOOGLE_SHEET_FRESHNESS_CACHE.has(DATASET_ID)).toBe(false);
  });

  it("drops the local copy before re-downloading", async () => {
    // Order matters: re-importing over a live local row and DuckDB table would
    // leave the old table registered if the export then failed.
    await _refresh();

    expect(callOrder).toEqual(["evict", "drop", "download", "import"]);
  });

  it("evicts the workspace relation-cache identity so the next query re-acquires", async () => {
    await _refresh();

    expect(evictRelationCacheMock).toHaveBeenCalledWith(
      [{ kind: "dataset", id: DATASET_ID }],
      makePrincipalKeyFromWorkspaceSession({
        workspaceId: WORKSPACE_ID,
        userId: USER_ID,
      }),
    );
  });

  it("downloads the rows through the dataset's edge route, so any viewer of the dataset can refresh it", async () => {
    await _refresh();

    expect(fetchSheetCsvMock).toHaveBeenCalledWith({ datasetId: DATASET_ID });
    // No Google token of the refresher's own is ever asked for: the edge
    // function reads the sheet with the grant of the account that added it.
    expect(apiGetMock).not.toHaveBeenCalled();
  });

  it("marks the dataset page's queries and open data queries stale once the sheet is re-imported", async () => {
    const queryClient = _makeQueryClient();
    const previewQueryKey = [
      "DatasetQueryClient",
      "getPreviewData",
      { datasetId: DATASET_ID },
    ];
    const dataQueryKey = [
      { auth: "workspace", workspaceId: WORKSPACE_ID },
      undefined,
      RAW_SQL_KEY_MARKER,
      "select 1",
    ];
    const unrelatedQueryKey = ["datasets", "getAll"];
    queryClient.setQueryData(previewQueryKey, []);
    queryClient.setQueryData(dataQueryKey, { rows: [] });
    queryClient.setQueryData(unrelatedQueryKey, []);
    startCsvImportMock.mockImplementation(async () => {
      // Nothing may be marked stale before the new rows are imported, or
      // the page would re-run its queries against the old ones.
      expect(queryClient.getQueryState(previewQueryKey)?.isInvalidated).toBe(
        false,
      );
      return {
        columns: [{ column_name: "county", column_type: "VARCHAR" }],
        previewRows: [{ county: "Nairobi" }],
        csvSniff: {},
      };
    });

    await _refresh({ queryClient });

    expect(notifyErrorMock).not.toHaveBeenCalled();
    expect(queryClient.getQueryState(previewQueryKey)?.isInvalidated).toBe(
      true,
    );
    expect(queryClient.getQueryState(dataQueryKey)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(unrelatedQueryKey)?.isInvalidated).toBe(
      false,
    );
  });

  it("announces success", async () => {
    await _refresh();

    await waitFor(() => {
      expect(notifySuccessMock).toHaveBeenCalled();
    });
    expect(notifyErrorMock).not.toHaveBeenCalled();
  });

  it("reports a failure instead of announcing success", async () => {
    fetchSheetCsvMock.mockRejectedValue(new Error("Drive is down"));

    await _refresh();

    await waitFor(() => {
      expect(notifyErrorMock).toHaveBeenCalled();
    });
    expect(notifySuccessMock).not.toHaveBeenCalled();
    // The workbook never arrived, so nothing may have been re-imported.
    expect(startCsvImportMock).not.toHaveBeenCalled();
  });
});
