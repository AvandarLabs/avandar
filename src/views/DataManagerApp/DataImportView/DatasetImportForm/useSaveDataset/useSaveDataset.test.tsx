import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@/test-utils";
import { useSaveDataset } from "./useSaveDataset";
import type { UseMutationOptions } from "@avandar/query-hooks";
import type { MutationFunctionContext } from "@tanstack/react-query";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { Workspace } from "$/models/Workspace/Workspace";
import type {
  CsvFileLoadResult,
} from "../../ManualUploadView/useLoadManualUploadFile/useLoadManualUploadFile";
import type {
  CsvDataSourceMetadata,
  DatasetImportFormValues,
  DataSourceMetadata,
} from "../DatasetImportForm";
import type { DuckDbColumnSchema } from "@/clients/DuckDbClient/DuckDbClient.types";

const TEST_WORKSPACE = {
  id: "00000000-0000-4000-8000-000000000001" as Workspace.Id,
  slug: "test-workspace",
};

const MUTATION_FUNCTION_CONTEXT = {} as MutationFunctionContext;

const SAVED_DATASET: Dataset.T = {
  __type: "Dataset",
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
};

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

type SaveDatasetMutationContext = { isFirstInWorkspace?: boolean };
type SaveDatasetMutationOptions = UseMutationOptions<
  Dataset.T,
  DatasetImportFormValues & DataSourceMetadata,
  Error,
  SaveDatasetMutationContext
>;

let capturedMutationOptions: SaveDatasetMutationOptions;

const {
  logEventMock,
  useMutationMock,
  workspaceDatasetsMock,
  notifyErrorMock,
  notifySuccessMock,
  navigateMock,
} = vi.hoisted(() => {
  return {
    logEventMock: vi.fn(),
    useMutationMock: vi.fn(),
    workspaceDatasetsMock: vi.fn(),
    notifyErrorMock: vi.fn(),
    notifySuccessMock: vi.fn(),
    navigateMock: vi.fn(),
  };
});

vi.mock("@avandar/query-hooks", () => {
  return { useMutation: useMutationMock };
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
      insertCsvFileDataset: vi.fn(),
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
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
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

vi.mock("@lingui/react", () => {
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

vi.mock("@/clients/storage/DatasetParquetStorageClient/DatasetParquetStorageClient", () => {
  return { DatasetParquetStorageClient: { startDatasetUpload: vi.fn() } };
});

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

describe("useSaveDataset", () => {
  beforeEach(() => {
    logEventMock.mockReset();
    navigateMock.mockReset();
    notifyErrorMock.mockReset();
    notifySuccessMock.mockReset();
    workspaceDatasetsMock.mockReset();
    useMutationMock.mockReset();
    useMutationMock.mockImplementation((options) => {
      capturedMutationOptions = options;
      return [vi.fn(), false, {}];
    });
  });

  it("emits first-import metadata from the pre-save snapshot", async () => {
    workspaceDatasetsMock.mockReturnValue([[], false]);
    renderHook(() => {
      return useSaveDataset();
    });

    const context = await capturedMutationOptions.onMutate?.(
      CSV_PARAMS,
      MUTATION_FUNCTION_CONTEXT,
    );
    if (!context) {
      throw new Error("Expected the mutation to capture analytics metadata");
    }
    await capturedMutationOptions.onSuccess?.(
      SAVED_DATASET,
      CSV_PARAMS,
      context,
      MUTATION_FUNCTION_CONTEXT,
    );

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

  it("marks a later import as non-first", async () => {
    workspaceDatasetsMock.mockReturnValue([[SAVED_DATASET], false]);
    renderHook(() => {
      return useSaveDataset();
    });

    const context = await capturedMutationOptions.onMutate?.(
      CSV_PARAMS,
      MUTATION_FUNCTION_CONTEXT,
    );
    if (!context) {
      throw new Error("Expected the mutation to capture analytics metadata");
    }
    await capturedMutationOptions.onSuccess?.(
      SAVED_DATASET,
      CSV_PARAMS,
      context,
      MUTATION_FUNCTION_CONTEXT,
    );

    expect(logEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({ isFirstInWorkspace: false }),
      }),
    );
  });

  it("does not block save success when the analytics snapshot is unavailable", async () => {
    workspaceDatasetsMock.mockReturnValue([undefined, false]);
    const onAfterSave = vi.fn();
    renderHook(() => {
      return useSaveDataset({ onAfterSave });
    });

    const context = await capturedMutationOptions.onMutate?.(
      CSV_PARAMS,
      MUTATION_FUNCTION_CONTEXT,
    );
    if (!context) {
      throw new Error("Expected the mutation to capture analytics metadata");
    }
    await capturedMutationOptions.onSuccess?.(
      SAVED_DATASET,
      CSV_PARAMS,
      context,
      MUTATION_FUNCTION_CONTEXT,
    );

    expect(logEventMock).not.toHaveBeenCalled();
    expect(onAfterSave).toHaveBeenCalledWith(SAVED_DATASET);
  });
});
