import { Expect, IsEqual } from "@avandar/utils";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { act, renderHook, TestProviders, waitFor } from "@/test-utils";
import {
  ParseManualFileOptions,
  useLoadManualUploadFile,
} from "./useLoadManualUploadFile";
import type { DuckDbColumnSchema } from "@/clients/DuckDbClient/DuckDbClient.types";
import type { DocumentMetadata, PdfRegion } from "@/workers/pdfSniff/types";
import type { UnknownObject } from "@avandar/utils";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetSource } from "$/models/datasets/DatasetSource/DatasetSource";
import type { ReactNode } from "react";

const {
  startCsvImportMock,
  startXlsxImportMock,
  startPdfImportMock,
  transcodePdfExtractionMock,
  extractPdfRegionsMock,
  useGetPreviewDataMock,
  notifySuccessMock,
} = vi.hoisted(() => {
  return {
    startCsvImportMock: vi.fn(),
    startXlsxImportMock: vi.fn(),
    startPdfImportMock: vi.fn(),
    transcodePdfExtractionMock: vi.fn(),
    extractPdfRegionsMock: vi.fn(),
    useGetPreviewDataMock: vi.fn(),
    notifySuccessMock: vi.fn(),
  };
});

vi.mock("@/clients/datasets/LocalDatasetClient/LocalDatasetClient", () => {
  return {
    LocalDatasetClient: {
      startCsvImport: startCsvImportMock,
      startXlsxImport: startXlsxImportMock,
      startPdfImport: startPdfImportMock,
      transcodePdfExtraction: transcodePdfExtractionMock,
    },
  };
});

vi.mock("@/clients/datasets/pdfSniff", () => {
  return { extractPdfRegions: extractPdfRegionsMock };
});

vi.mock("@/clients/datasets/DatasetQueryClient", () => {
  return {
    DatasetQueryClient: {
      useGetPreviewData: useGetPreviewDataMock,
    },
  };
});

vi.mock("@/hooks/users/useCurrentUser", () => {
  return {
    useCurrentUser: () => {
      return { id: "00000000-0000-4000-8000-000000000001" };
    },
  };
});

vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: () => {
      return { id: "00000000-0000-4000-8000-000000000002" };
    },
  };
});

vi.mock("@/utils/notifications/notify", () => {
  return {
    notifySuccess: notifySuccessMock,
    notifyError: vi.fn(),
    notifyWarning: vi.fn(),
  };
});

vi.mock(import("@utils"), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    formatNumber: (value: number) => {
      return String(value);
    },
  };
});

vi.mock("xlsx", () => {
  return {
    read: vi.fn(() => {
      return {
        SheetNames: ["Sheet1", "Sheet2"],
      };
    }),
  };
});

function _columnSchema(
  column_name: string,
  column_type: DuckDbColumnSchema["column_type"],
): DuckDbColumnSchema {
  return {
    column_name,
    column_type,
    default: null,
    extra: null,
    key: null,
    null: "YES",
  };
}

function _emptyDocumentMetadata(): DocumentMetadata {
  return {
    title: null,
    organisation: null,
    reportNumber: null,
    publishedAt: null,
  };
}

/** What `PdfRegionPicker` creates when the user drags a box. */
function _drawnRegion(): PdfRegion {
  return {
    id: "r1",
    label: "Region 1",
    shape: "prose_measures",
    detectionMode: "manual",
    fragments: [{ page: 0, bbox: [305, 450, 570, 615] }],
    options: {},
  };
}

function _wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return createElement(
    TestProviders,
    null,
    createElement(QueryClientProvider, { client: queryClient }, children),
  );
}

describe("useLoadManualUploadFile", () => {
  it("loads csv files and stores returned metadata", async () => {
    const previewRows: UnknownObject[] = [{ city: "LA" }];
    useGetPreviewDataMock.mockReturnValue([previewRows]);
    startCsvImportMock.mockResolvedValue({
      columns: [_columnSchema("city", "VARCHAR")],
      previewRows,
      csvSniff: {
        Delimiter: ",",
        Quote: '"',
        Escape: '"',
        NewLineDelimiter: "\n",
        Comment: "",
        SkipRows: 0,
        HasHeader: true,
        Columns: [{ name: "city", type: "VARCHAR" }],
        DateFormat: null,
        TimestampFormat: null,
        UserArguments: "",
        Prompt: "",
        table_name: "dataset_csv",
      },
    });

    const { result } = renderHook(
      () => {
        return useLoadManualUploadFile();
      },
      { wrapper: _wrapper },
    );
    const file = new File(["city\nLA"], "cities.csv", {
      type: "text/csv",
    });

    await act(async () => {
      await result.current.loadFile.async({
        type: "csv_file",
        file,
        datasetId: "dataset_csv" as Dataset.Id,
        numRowsToSkip: 1,
        delimiter: ",",
      });
    });

    await waitFor(() => {
      expect(startCsvImportMock).toHaveBeenCalledWith(
        expect.objectContaining({
          datasetId: "dataset_csv",
        }),
      );
    });
    expect(
      result.current.dataSourceMetadata?.datasetLoadResult?.datasetId,
    ).toBe("dataset_csv");
  });

  it("keeps user csv parse options after load instead of sniff overrides", async () => {
    useGetPreviewDataMock.mockReturnValue([[]]);
    startCsvImportMock.mockResolvedValue({
      columns: [_columnSchema("city", "VARCHAR")],
      previewRows: [],
      csvSniff: {
        Delimiter: "|",
        Quote: '"',
        Escape: '"',
        NewLineDelimiter: "\n",
        Comment: "",
        SkipRows: 0,
        HasHeader: true,
        Columns: [{ name: "city", type: "VARCHAR" }],
        DateFormat: null,
        TimestampFormat: null,
        UserArguments: "",
        Prompt: "",
        table_name: "dataset_csv",
      },
      tableName: "dataset_csv",
    });

    const { result } = renderHook(
      () => {
        return useLoadManualUploadFile();
      },
      { wrapper: _wrapper },
    );
    const file = new File(["city\nLA"], "cities.csv", {
      type: "text/csv",
    });

    await act(async () => {
      await result.current.loadFile.async({
        type: "csv_file",
        file,
        datasetId: "dataset_csv" as Dataset.Id,
        numRowsToSkip: 1,
        delimiter: ",",
      });
    });

    expect(result.current.dataSourceMetadata?.parseOptions).toEqual({
      type: "csv_file",
      numRowsToSkip: 1,
      delimiter: ",",
    });
  });

  it("loads xlsx files and includes available sheet names", async () => {
    const previewRows: UnknownObject[] = [{ city: "LA" }];
    useGetPreviewDataMock.mockReturnValue([previewRows]);
    startXlsxImportMock.mockResolvedValue({
      sheets: ["Sheet1", "Sheet2"],
      defaultSheet: "Sheet2",
      columns: ["city"],
      previewRows,
    });

    const { result } = renderHook(
      () => {
        return useLoadManualUploadFile();
      },
      { wrapper: _wrapper },
    );
    const file = {
      name: "cities.xlsx",
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      arrayBuffer: async () => {
        return new ArrayBuffer(8);
      },
    } as unknown as File;

    await act(async () => {
      await result.current.loadFile.async({
        type: "xlsx_file",
        file,
        datasetId: "dataset_xlsx" as Dataset.Id,
        sheetName: "Sheet2",
      });
    });

    await waitFor(() => {
      expect(startXlsxImportMock).toHaveBeenCalledWith(
        expect.objectContaining({
          datasetId: "dataset_xlsx",
          parseOptions: expect.objectContaining({
            sheet: "Sheet2",
            hasHeader: undefined,
          }),
        }),
      );
    });
    expect(
      result.current.dataSourceMetadata?.datasetLoadResult?.datasetId,
    ).toBe("dataset_xlsx");
    if (result.current.dataSourceMetadata?.datasetLoadResult?.type === "xlsx") {
      expect(
        result.current.dataSourceMetadata?.datasetLoadResult
          .availableSheetNames,
      ).toEqual(["Sheet1", "Sheet2"]);
    }
  });

  it("writes back the shape a pdf region was actually read as", async () => {
    // A drawn region arrives carrying the shape it was created with, and the
    // classifier decides what it really is. If that verdict is not written
    // back, the "Read as" control keeps showing the created shape while the
    // rows on screen came from a different extractor, and a user who then
    // changes the shape is correcting a value nothing ever used.
    useGetPreviewDataMock.mockReturnValue([[]]);
    startPdfImportMock.mockResolvedValue({
      type: "result",
      pageCount: 1,
      pages: [],
      documentMetadata: _emptyDocumentMetadata(),
    });
    extractPdfRegionsMock.mockResolvedValue({
      type: "extract_result",
      tables: [],
      classifications: {},
      resolvedShapes: { r1: "labelled_graphic" },
      combined: {
        outputMode: "natural",
        cells: [
          ["label", "value"],
          ["KHARTOUM", "408"],
        ],
        headerRows: 1,
      },
    });
    transcodePdfExtractionMock.mockResolvedValue({
      columns: [_columnSchema("label", "VARCHAR")],
      previewRows: [],
    });

    const { result } = renderHook(
      () => {
        return useLoadManualUploadFile();
      },
      { wrapper: _wrapper },
    );

    await act(async () => {
      await result.current.loadFile.async({
        type: "pdf_file",
        file: new File(["%PDF-1.7"], "report.pdf", {
          type: "application/pdf",
        }),
        datasetId: "dataset_pdf" as Dataset.Id,
        regions: [_drawnRegion()],
        outputMode: "natural",
      });
    });

    const parseOptions = result.current.dataSourceMetadata?.parseOptions;
    if (parseOptions?.type !== "pdf_file") {
      throw new Error("expected pdf parse options");
    }
    expect(parseOptions.regions?.[0]?.shape).toBe("labelled_graphic");
    // Written back by us, so a later box move re-decides it. Claiming the
    // user chose it would pin the region to this shape for good.
    expect(parseOptions.regions?.[0]?.isShapeUserChosen).toBeUndefined();
  });
});

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore ignore unused variable warning
type _TypeTests = [
  /**
   * Ensure all manually importable file types are covered here. This should
   * have no error. If there is an error here, it means that we are missing an
   * ImportableFileType in our ParseFileOptions.
   */
  Expect<
    IsEqual<
      Exclude<
        ParseManualFileOptions["type"],
        DatasetSource.ManuallyUploadableSourceType
      >,
      never
    >
  >,
];
