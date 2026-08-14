import { Model } from "@avandar/models";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, TestProviders, waitFor } from "@/test-utils";
import { useSaveDataset } from "./useSaveDataset";
import type { CsvFileLoadResult } from "../../ManualUploadView/useLoadManualUploadFile/useLoadManualUploadFile";
import type {
  CsvDataSourceMetadata,
  DatasetImportFormValues,
} from "../DatasetImportForm";
import type { DuckDbColumnSchema } from "@/clients/DuckDbClient/DuckDbClient.types";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { ReactElement, ReactNode } from "react";

const TEST_WORKSPACE = {
  id: "00000000-0000-4000-8000-000000000001" as Workspace.Id,
  slug: "test-workspace",
};

const SAVED_DATASET = Model.make("Dataset", {
  id: "00000000-0000-4000-8000-000000000002" as Dataset.Id,
  name: "Saved dataset",
  sourceType: "csv_file",
  workspaceId: TEST_WORKSPACE.id,
  ownerId: "00000000-0000-4000-8000-000000000003" as Dataset.T["ownerId"],
  ownerProfileId:
    "00000000-0000-4000-8000-000000000004" as Dataset.T["ownerProfileId"],
  createdAt: "2026-08-13T00:00:00.000Z",
  updatedAt: "2026-08-13T00:00:00.000Z",
  dateOfLastSync: undefined,
  description: undefined,
  isRestricted: false,
});

const CSV_PARAMS: DatasetImportFormValues & CsvDataSourceMetadata = {
  name: "Imported CSV",
  description: "",
  sourceType: "csv_file",
  onlineStorageAllowed: false,
  sizeInBytes: 20,
  parseOptions: { type: "csv_file" },
  datasetLoadResult: {
    type: "csv",
    id: "csv-load-result" as CsvFileLoadResult["id"],
    csvName: "import.csv",
    numRows: 12,
    numRejectedRows: 0,
    columns: [_duckDbColumn("name"), _duckDbColumn("value")],
    errors: { rejectedScans: [], rejectedRows: [] },
    tableName: "import_csv",
    csvSniff: {
      Delimiter: ",",
      Quote: '"',
      Escape: '"',
      NewLineDelimiter: "\n",
      Comment: "#",
      SkipRows: 0,
      HasHeader: true,
      Columns: [],
      DateFormat: null,
      TimestampFormat: null,
      UserArguments: "",
      Prompt: "",
      table_name: "import_csv",
    },
    datasetId: SAVED_DATASET.id,
    parquetData: new Blob(),
  },
};

const {
  insertCsvFileDatasetMock,
  logEventMock,
  workspaceDatasetsMock,
  notifyErrorMock,
  notifySuccessMock,
  navigateMock,
} = vi.hoisted(() => {
  return {
    insertCsvFileDatasetMock: vi.fn(),
    logEventMock: vi.fn(),
    workspaceDatasetsMock: vi.fn(),
    notifyErrorMock: vi.fn(),
    notifySuccessMock: vi.fn(),
    navigateMock: vi.fn(),
  };
});

vi.mock("@/clients/datasets/DatasetClient", () => {
  return {
    DatasetClient: {
      QueryKeys: {
        getAll: vi.fn(() => {
          return ["datasets"];
        }),
      },
      useGetAll: workspaceDatasetsMock,
      insertCsvFileDataset: insertCsvFileDatasetMock,
      insertGoogleSheetsDataset: vi.fn(),
      insertXlsxFileDataset: vi.fn(),
    },
  };
});

vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: () => {
      return TEST_WORKSPACE;
    },
  };
});

vi.mock("@/lib/analytics/AnalyticsClient", () => {
  return { AnalyticsClient: { logEvent: logEventMock } };
});

vi.mock("@/utils/notifications/notify", () => {
  return { notifyError: notifyErrorMock, notifySuccess: notifySuccessMock };
});

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    useNavigate: () => {
      return navigateMock;
    },
  };
});

vi.mock("@lingui/react/macro", () => {
  return {
    useLingui: () => {
      return {
        _: () => {
          return "";
        },
      };
    },
  };
});

vi.mock("@lingui/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@lingui/react")>();
  return {
    ...actual,
    useLingui: () => {
      return {
        _: () => {
          return "";
        },
      };
    },
  };
});

vi.mock(
  "@/clients/storage/DatasetParquetStorageClient/DatasetParquetStorageClient",
  () => {
    return { DatasetParquetStorageClient: { startDatasetUpload: vi.fn() } };
  },
);

function _duckDbColumn(columnName: string): DuckDbColumnSchema {
  return {
    column_name: columnName,
    column_type: "VARCHAR",
    default: null,
    extra: null,
    key: null,
    null: "YES",
  };
}

function _wrapper({ children }: { children: ReactNode }): ReactElement {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });
  return createElement(
    TestProviders,
    null,
    createElement(QueryClientProvider, { client: queryClient }, children),
  );
}

describe("useSaveDataset", () => {
  beforeEach(() => {
    insertCsvFileDatasetMock.mockReset();
    insertCsvFileDatasetMock.mockResolvedValue(SAVED_DATASET);
    logEventMock.mockReset();
    navigateMock.mockReset();
    notifyErrorMock.mockReset();
    notifySuccessMock.mockReset();
    workspaceDatasetsMock.mockReset();
  });

  it("emits first-import metadata from the pre-save snapshot", async () => {
    workspaceDatasetsMock.mockReturnValue([[], false]);
    const { result } = renderHook(
      () => {
        return useSaveDataset();
      },
      { wrapper: _wrapper },
    );
    await act(async () => {
      await result.current[0].async(CSV_PARAMS);
    });

    await waitFor(() => {
      expect(logEventMock).toHaveBeenCalledOnce();
      expect(logEventMock).toHaveBeenCalledWith({
        event: "dataset.imported",
        workspaceId: TEST_WORKSPACE.id,
        app: "data_sources",
        payload: {
          datasetId: SAVED_DATASET.id,
          sourceType: "csv_file",
          columnCount: CSV_PARAMS.datasetLoadResult.columns.length,
          rowCount: CSV_PARAMS.datasetLoadResult.numRows,
          isFirstInWorkspace: true,
        },
      });
    });
    expect(insertCsvFileDatasetMock).toHaveBeenCalledOnce();
  });

  it("marks a later import as non-first", async () => {
    workspaceDatasetsMock.mockReturnValue([[SAVED_DATASET], false]);
    const { result } = renderHook(
      () => {
        return useSaveDataset();
      },
      { wrapper: _wrapper },
    );
    await act(async () => {
      await result.current[0].async(CSV_PARAMS);
    });

    await waitFor(() => {
      expect(logEventMock).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({ isFirstInWorkspace: false }),
        }),
      );
    });
  });

  it("does not block save success when the analytics snapshot is unavailable", async () => {
    workspaceDatasetsMock.mockReturnValue([undefined, false]);
    const onAfterSave = vi.fn();
    const { result } = renderHook(
      () => {
        return useSaveDataset({ onAfterSave });
      },
      { wrapper: _wrapper },
    );
    await act(async () => {
      await result.current[0].async(CSV_PARAMS);
    });

    expect(logEventMock).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(onAfterSave).toHaveBeenCalledWith(SAVED_DATASET);
    });
  });
});
