import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, TestProviders, waitFor } from "@/test-utils";
import { GOOGLE_SHEET_FRESHNESS_CACHE } from "@/clients/google/GoogleDriveClient/googleSheetFreshness";
import { useRefreshGoogleSheetDataset } from "@/views/DataManagerApp/DatasetMetaView/useRefreshGoogleSheetDataset";
import { makePrincipalKeyFromWorkspaceSession } from "$/models/relations/RelationCacheKey/RelationCacheKey";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { GoogleSheetsDataset } from "$/models/datasets/GoogleSheetsDataset/GoogleSheetsDataset";
import type { User } from "$/models/User/User";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { ReactNode } from "react";

const DATASET_ID = "11111111-1111-4111-8111-111111111111" as Dataset.Id;
const USER_ID = "00000000-0000-4000-8000-000000000001" as User.Id;
const WORKSPACE_ID = "00000000-0000-4000-8000-000000000002" as Workspace.Id;
const WORKBOOK_BYTES = Uint8Array.from([
  0x50, 0x4b, 0x03, 0x04,
]) as Uint8Array<ArrayBuffer>;

/** Records the order the refresh steps ran in. */
const callOrder: string[] = [];

const {
  apiGetMock,
  dropLocalDatasetMock,
  startXlsxImportMock,
  getGoogleSheetXlsxExportMock,
  evictRelationCacheMock,
  notifySuccessMock,
  notifyErrorMock,
} = vi.hoisted(() => {
  return {
    apiGetMock: vi.fn(),
    dropLocalDatasetMock: vi.fn(),
    startXlsxImportMock: vi.fn(),
    getGoogleSheetXlsxExportMock: vi.fn(),
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
      startXlsxImport: startXlsxImportMock,
    },
  };
});

vi.mock("@/clients/google/GoogleDriveClient/GoogleDriveClient", () => {
  return { getGoogleSheetXlsxExport: getGoogleSheetXlsxExportMock };
});

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

function _wrapper({ children }: { children: ReactNode }): JSX.Element {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  // `TestProviders` supplies the Lingui provider the hook's `useLingui` needs.
  return createElement(
    TestProviders,
    null,
    createElement(QueryClientProvider, { client: queryClient }, children),
  );
}

function _sourceDataset(
  sheetName: string | null,
): Pick<
  GoogleSheetsDataset.T,
  "googleDocumentId" | "googleAccountId" | "sheetName"
> {
  return {
    googleDocumentId: "1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789",
    // A Google `sub`, which is what `tokens__google.google_account_id` stores.
    googleAccountId: "108374652910384756291",
    sheetName,
  };
}

async function _refresh(sheetName: string | null = "Kenya"): Promise<void> {
  const { result } = renderHook(
    () => {
      return useRefreshGoogleSheetDataset();
    },
    { wrapper: _wrapper },
  );

  await act(async () => {
    await result.current[0]
      .async({
        datasetId: DATASET_ID,
        sourceDataset: _sourceDataset(sheetName),
      })
      .catch(() => {
        // Failure paths are asserted through the notification mocks.
      });
  });
}

describe("useRefreshGoogleSheetDataset", () => {
  beforeEach(() => {
    callOrder.length = 0;
    GOOGLE_SHEET_FRESHNESS_CACHE.clear();

    apiGetMock.mockReset();
    apiGetMock.mockResolvedValue({
      tokens: [{ access_token: "ya29.refresh-test-token" }],
    });

    evictRelationCacheMock.mockReset();
    evictRelationCacheMock.mockImplementation(async () => {
      callOrder.push("evict");
    });

    dropLocalDatasetMock.mockReset();
    dropLocalDatasetMock.mockImplementation(async () => {
      callOrder.push("drop");
    });

    getGoogleSheetXlsxExportMock.mockReset();
    getGoogleSheetXlsxExportMock.mockImplementation(async () => {
      callOrder.push("export");
      return { xlsxBytes: WORKBOOK_BYTES, sourceVersion: "99" };
    });

    startXlsxImportMock.mockReset();
    startXlsxImportMock.mockImplementation(async () => {
      callOrder.push("import");
      return {
        sheets: ["Colombia", "Kenya"],
        defaultSheet: "Colombia",
        columns: ["county"],
        previewRows: [{ county: "Nairobi" }],
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

  it("drops the local copy before re-exporting", async () => {
    // Order matters: re-importing over a live local row and DuckDB table would
    // leave the old table registered if the export then failed.
    await _refresh();

    expect(callOrder).toEqual(["evict", "drop", "export", "import"]);
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

  it("re-reads the dataset's stored tab", async () => {
    await _refresh("Kenya");

    expect(startXlsxImportMock).toHaveBeenCalledWith(
      expect.objectContaining({
        datasetId: DATASET_ID,
        parseOptions: { sheet: "Kenya" },
      }),
    );
  });

  it("re-reads the first tab when the stored tab is null", async () => {
    // Positive control for the test above, and the legacy-row contract: `null`
    // means the workbook's first tab, which is `read_xlsx`'s own default.
    await _refresh(null);

    expect(startXlsxImportMock).toHaveBeenCalledWith(
      expect.objectContaining({ parseOptions: { sheet: undefined } }),
    );
  });

  it("exports the dataset's own document with the refreshed token", async () => {
    await _refresh();

    expect(getGoogleSheetXlsxExportMock).toHaveBeenCalledWith({
      fileId: "1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789",
      accessToken: "ya29.refresh-test-token",
    });
  });

  it("announces success", async () => {
    await _refresh();

    await waitFor(() => {
      expect(notifySuccessMock).toHaveBeenCalled();
    });
    expect(notifyErrorMock).not.toHaveBeenCalled();
  });

  it("reports a failure instead of announcing success", async () => {
    getGoogleSheetXlsxExportMock.mockRejectedValue(new Error("Drive is down"));

    await _refresh();

    await waitFor(() => {
      expect(notifyErrorMock).toHaveBeenCalled();
    });
    expect(notifySuccessMock).not.toHaveBeenCalled();
    // The workbook never arrived, so nothing may have been re-imported.
    expect(startXlsxImportMock).not.toHaveBeenCalled();
  });

  it("fails when the user has no Google token", async () => {
    apiGetMock.mockResolvedValue({ tokens: [] });

    await _refresh();

    await waitFor(() => {
      expect(notifyErrorMock).toHaveBeenCalled();
    });
    expect(getGoogleSheetXlsxExportMock).not.toHaveBeenCalled();
  });
});
