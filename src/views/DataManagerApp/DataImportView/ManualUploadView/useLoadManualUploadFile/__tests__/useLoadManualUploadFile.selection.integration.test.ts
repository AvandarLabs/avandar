import { describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@/test-utils";
import { useLoadManualUploadFile } from "../useLoadManualUploadFile";
import {
  columnSchema,
  drawnRegion,
  emptyDocumentMetadata,
  extractPdfRegionsMock,
  startCsvImportMock,
  startPdfImportMock,
  startXlsxImportMock,
  transcodePdfExtractionMock,
  useGetPreviewDataMock,
  wrapper,
} from "../useLoadManualUploadFileTestHelpers";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { UnknownObject } from "@avandar/utils";

describe("useLoadManualUploadFile", () => {
  it("loads csv files and stores returned metadata", async () => {
    const previewRows: UnknownObject[] = [{ city: "LA" }];
    useGetPreviewDataMock.mockReturnValue([previewRows]);
    startCsvImportMock.mockResolvedValue({
      columns: [columnSchema("city", "VARCHAR")],
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
      { wrapper: wrapper },
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
      columns: [columnSchema("city", "VARCHAR")],
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
      { wrapper: wrapper },
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
      { wrapper: wrapper },
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
      documentMetadata: emptyDocumentMetadata(),
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
      columns: [columnSchema("label", "VARCHAR")],
      previewRows: [],
    });

    const { result } = renderHook(
      () => {
        return useLoadManualUploadFile();
      },
      { wrapper: wrapper },
    );

    await act(async () => {
      await result.current.loadFile.async({
        type: "pdf_file",
        file: new File(["%PDF-1.7"], "report.pdf", {
          type: "application/pdf",
        }),
        datasetId: "dataset_pdf" as Dataset.Id,
        regions: [drawnRegion()],
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
    // The mode the extraction actually used, not the one requested. Seeding a
    // fixed default here is what offered a line chart its printed table.
    expect(parseOptions.outputMode).toBe("natural");
  });
});

/* Register fixture mocks before Vitest loads the component dependencies. */
await vi.hoisted(async () => {
  await import("../useLoadManualUploadFileTestHelpers");
});
