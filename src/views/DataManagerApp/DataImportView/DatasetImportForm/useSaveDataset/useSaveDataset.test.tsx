import { Model } from "@avandar/models";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, TestProviders, waitFor } from "@/test-utils";
import { useSaveDataset } from "./useSaveDataset";
import type {
  CsvFileLoadResult,
  PdfFileLoadResult,
} from "../../ManualUploadView/useLoadManualUploadFile/useLoadManualUploadFile";
import type {
  CsvDataSourceMetadata,
  DatasetImportFormValues,
  GoogleSheetsDataSourceMetadata,
  PdfDataSourceMetadata,
} from "../DatasetImportForm.types";
import type {
  DuckDbColumnSchema,
  DuckDbLoadXlsxResult,
} from "@/clients/DuckDbClient/DuckDbClient.types";
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

/**
 * A Google Sheets import of the second tab of a two-tab workbook. The tab is
 * deliberately not the first one, so an insert that ignored the chosen tab
 * could not satisfy the assertions below.
 */
const GOOGLE_SHEETS_PARAMS: DatasetImportFormValues &
  GoogleSheetsDataSourceMetadata = {
  name: "Imported Sheet",
  description: "",
  sourceType: "google_sheets",
  // A Google `sub`, which is what `tokens__google.google_account_id` stores.
  googleAccountId: "108374652910384756291",
  googleDocumentId: "1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789",
  parseOptions: { type: "google_sheets", sheetName: "Kenya", hasHeader: true },
  datasetLoadResult: {
    datasetId: SAVED_DATASET.id,
    numRows: 7,
    spreadsheetName: "regional-population",
    availableSheetNames: ["Colombia", "Kenya"],
    sheetLoadMetadata: {
      type: "xlsx",
      id: "google-sheet-load-result" as DuckDbLoadXlsxResult["id"],
      tableName: "import_sheet",
      xlsxName: "regional-population.xlsx",
      numRows: 7,
      columns: [_duckDbColumn("county"), _duckDbColumn("residents")],
      sheet: "Kenya",
      parquetData: new Blob(),
    },
  },
};

const {
  insertCsvFileDatasetMock,
  insertGoogleSheetsDatasetMock,
  insertPdfFileDatasetMock,
  transcodeReviewedPdfExtractionMock,
  logEventMock,
  workspaceDatasetsMock,
  notifyErrorMock,
  notifySuccessMock,
  navigateMock,
} = vi.hoisted(() => {
  return {
    insertCsvFileDatasetMock: vi.fn(),
    insertGoogleSheetsDatasetMock: vi.fn(),
    insertPdfFileDatasetMock: vi.fn(),
    transcodeReviewedPdfExtractionMock: vi.fn(),
    logEventMock: vi.fn(),
    workspaceDatasetsMock: vi.fn(),
    notifyErrorMock: vi.fn(),
    notifySuccessMock: vi.fn(),
    navigateMock: vi.fn(),
  };
});

vi.mock("@/clients/datasets/DatasetClient/DatasetClient", () => {
  return {
    DatasetClient: {
      QueryKeys: {
        getAll: vi.fn(() => {
          return ["datasets"];
        }),
      },
      useGetAll: workspaceDatasetsMock,
      insertCsvFileDataset: insertCsvFileDatasetMock,
      insertGoogleSheetsDataset: insertGoogleSheetsDatasetMock,
      insertPdfFileDataset: insertPdfFileDatasetMock,
      insertXlsxFileDataset: vi.fn(),
    },
  };
});

vi.mock("@/clients/datasets/LocalDatasetClient/LocalDatasetClient", () => {
  return {
    LocalDatasetClient: {
      transcodeReviewedPdfExtraction: transcodeReviewedPdfExtractionMock,
    },
  };
});

vi.mock("@/clients/datasets/DatasetColumnClient", () => {
  return {
    DatasetColumnClient: {
      QueryKeys: {
        getAll: vi.fn(() => {
          return ["dataset-columns"];
        }),
      },
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

function _pdfLoadResult(
  overrides: Partial<PdfFileLoadResult> = {},
): PdfFileLoadResult {
  return {
    datasetId: SAVED_DATASET.id,
    numRows: 1,
    id: "pdf-load-result",
    type: "pdf",
    pageCount: 3,
    pages: [],
    status: "extracted",
    outputMode: "natural",
    regions: [],
    columns: [_duckDbColumn("subject"), _duckDbColumn("value")],
    tables: [],
    classifications: {},
    documentMetadata: {
      title: null,
      organisation: null,
      reportNumber: null,
      publishedAt: null,
    },
    combinedCells: [
      ["subject", "value"],
      ["Kassala", "12"],
    ],
    combinedHeaderRows: 1,
    ...overrides,
  };
}

function _pdfParams(
  overrides: Partial<PdfDataSourceMetadata> = {},
): DatasetImportFormValues & PdfDataSourceMetadata {
  return {
    name: "Imported PDF",
    description: "",
    sourceType: "pdf_file",
    // Offline-only, so the post-save original upload is a no-op here. The
    // dataset row still records that an original exists, because a PDF is
    // pinned locally whatever the user chose about the cloud.
    onlineStorageAllowed: false,
    sizeInBytes: 4096,
    datasetLoadResult: _pdfLoadResult(),
    parseOptions: {
      type: "pdf_file",
      regions: [],
      outputMode: "natural",
      pageRange: [2, 4],
    },
    ...overrides,
  };
}

describe("useSaveDataset", () => {
  beforeEach(() => {
    insertCsvFileDatasetMock.mockReset();
    insertCsvFileDatasetMock.mockResolvedValue(SAVED_DATASET);
    insertGoogleSheetsDatasetMock.mockReset();
    insertGoogleSheetsDatasetMock.mockResolvedValue(SAVED_DATASET);
    insertPdfFileDatasetMock.mockReset();
    insertPdfFileDatasetMock.mockResolvedValue(SAVED_DATASET);
    transcodeReviewedPdfExtractionMock.mockReset();
    transcodeReviewedPdfExtractionMock.mockResolvedValue({
      columns: [_duckDbColumn("subject"), _duckDbColumn("value")],
    });
    logEventMock.mockReset();
    navigateMock.mockReset();
    notifyErrorMock.mockReset();
    notifySuccessMock.mockReset();
    workspaceDatasetsMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
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

  it("stores the chosen tab on a Google Sheets import", async () => {
    // The tab is what makes a Sheets dataset one relation rather than
    // "whatever is first". A stored `null` means the workbook's first tab, so a
    // new import that failed to record its tab would silently become a
    // first-tab dataset.
    workspaceDatasetsMock.mockReturnValue([[], false]);
    const { result } = renderHook(
      () => {
        return useSaveDataset();
      },
      { wrapper: _wrapper },
    );

    await act(async () => {
      await result.current[0].async(GOOGLE_SHEETS_PARAMS);
    });

    expect(insertGoogleSheetsDatasetMock).toHaveBeenCalledWith(
      expect.objectContaining({
        sheetName: "Kenya",
        googleDocumentId: GOOGLE_SHEETS_PARAMS.googleDocumentId,
        googleAccountId: GOOGLE_SHEETS_PARAMS.googleAccountId,
      }),
    );
  });

  it("stores the tab that was read, not one selected but not applied", async () => {
    // The two sources diverge when a user picks a tab and saves without
    // pressing "Process data again": the recorded columns are still the tab
    // that was parsed, so storing the newly selected name would leave
    // `sheet_name` disagreeing with `dataset_columns`, and acquisition would
    // read a tab whose schema was never validated.
    //
    // This is also what stops the two assertions above from passing for the
    // wrong reason: in the fixture they share a value, so only a case where
    // they differ can tell which one the insert reads.
    workspaceDatasetsMock.mockReturnValue([[], false]);
    const { result } = renderHook(
      () => {
        return useSaveDataset();
      },
      { wrapper: _wrapper },
    );

    await act(async () => {
      await result.current[0].async({
        ...GOOGLE_SHEETS_PARAMS,
        // Selected "Colombia"; the load result still holds the parsed "Kenya".
        parseOptions: {
          type: "google_sheets",
          sheetName: "Colombia",
          hasHeader: true,
        },
      });
    });

    expect(insertGoogleSheetsDatasetMock).toHaveBeenCalledWith(
      expect.objectContaining({ sheetName: "Kenya" }),
    );
  });

  it("never stores an absent tab when nothing was selected", async () => {
    // A new row must always carry a concrete tab, so `null` stays a legacy
    // value that only pre-tab-column rows have.
    workspaceDatasetsMock.mockReturnValue([[], false]);
    const { result } = renderHook(
      () => {
        return useSaveDataset();
      },
      { wrapper: _wrapper },
    );

    await act(async () => {
      await result.current[0].async({
        ...GOOGLE_SHEETS_PARAMS,
        parseOptions: { type: "google_sheets", hasHeader: true },
      });
    });

    expect(insertGoogleSheetsDatasetMock).toHaveBeenCalledWith(
      expect.objectContaining({ sheetName: "Kenya" }),
    );
  });

  it("records the Sheets columns read from the workbook", async () => {
    workspaceDatasetsMock.mockReturnValue([[], false]);
    const { result } = renderHook(
      () => {
        return useSaveDataset();
      },
      { wrapper: _wrapper },
    );

    await act(async () => {
      await result.current[0].async(GOOGLE_SHEETS_PARAMS);
    });

    const insertParams = insertGoogleSheetsDatasetMock.mock.calls[0]![0] as {
      columns: Array<{ name: string }>;
    };
    expect(
      insertParams.columns.map((column) => {
        return column.name;
      }),
    ).toEqual(["county", "residents"]);
  });

  it("invalidates datasets and their columns after an import", async () => {
    workspaceDatasetsMock.mockReturnValue([[], false]);
    const invalidateQueries = vi.spyOn(
      QueryClient.prototype,
      "invalidateQueries",
    );
    const { result } = renderHook(
      () => {
        return useSaveDataset();
      },
      { wrapper: _wrapper },
    );

    await act(async () => {
      await result.current[0].async(CSV_PARAMS);
    });

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["datasets"] });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["dataset-columns"],
    });
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
  it("refuses to save a PDF with no region selected", async () => {
    // The save button is disabled in this state, so anything reaching here
    // bypassed the form. Writing the dataset anyway would hand the user a
    // saved source with no columns and no rows.
    workspaceDatasetsMock.mockReturnValue([[], false]);
    const { result } = renderHook(
      () => {
        return useSaveDataset();
      },
      { wrapper: _wrapper },
    );

    await act(async () => {
      await expect(
        result.current[0].async(
          _pdfParams({
            datasetLoadResult: _pdfLoadResult({
              status: "needs_selection",
              numRows: 0,
              columns: [],
              combinedCells: [],
              combinedHeaderRows: 0,
            }),
          }),
        ),
      ).rejects.toThrow(/select a region/i);
    });

    expect(insertPdfFileDatasetMock).not.toHaveBeenCalled();
  });

  it("records the model, the retained original and the page range", async () => {
    workspaceDatasetsMock.mockReturnValue([[], false]);
    const { result } = renderHook(
      () => {
        return useSaveDataset();
      },
      { wrapper: _wrapper },
    );

    await act(async () => {
      await result.current[0].async(
        _pdfParams({
          parseOptions: {
            type: "pdf_file",
            regions: [],
            outputMode: "observations",
            pageRange: [2, 4],
            llmModel: "anthropic/claude-sonnet-5",
          },
        }),
      );
    });

    expect(insertPdfFileDatasetMock).toHaveBeenCalledOnce();
    const params = insertPdfFileDatasetMock.mock.calls[0]![0];
    // Without this the privacy log cannot answer "did a model see this
    // document" from the dataset row alone.
    expect(params.llmModel).toBe("anthropic/claude-sonnet-5");
    expect(params.outputMode).toBe("observations");
    expect(params.hasOriginalFile).toBe(true);
    // The form's range is one-based; the stored one is zero-based, matching
    // `PageGeometry.pageIndex`.
    expect(params.pageRangeStart).toBe(1);
    expect(params.pageRangeEnd).toBe(3);
    // Fingerprinted from the combination, which is what the rows actually
    // are, not from any single region.
    expect(params.fingerprint).toEqual(
      expect.objectContaining({ headers: ["subject", "value"], shape: [1, 2] }),
    );
  });

  it("leaves the model unrecorded when rules did all the work", async () => {
    workspaceDatasetsMock.mockReturnValue([[], false]);
    const { result } = renderHook(
      () => {
        return useSaveDataset();
      },
      { wrapper: _wrapper },
    );

    await act(async () => {
      await result.current[0].async(_pdfParams());
    });

    expect(insertPdfFileDatasetMock).toHaveBeenCalledOnce();
    expect(insertPdfFileDatasetMock.mock.calls[0]![0].llmModel).toBeUndefined();
  });
});
