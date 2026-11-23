import { describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@/test-utils";
import { useLoadManualUploadFile } from "../useLoadManualUploadFile";
import {
  columnSchema,
  drawnRegion,
  emptyDocumentMetadata,
  extractPdfRegionsMock,
  startPdfImportMock,
  transcodePdfExtractionMock,
  wrapper,
} from "../useLoadManualUploadFileTestHelpers";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetSource } from "$/models/datasets/DatasetSource/DatasetSource";
import type { ParseManualFileOptions } from "../useLoadManualUploadFile";
import type { Expect, IsEqual } from "@avandar/utils";

describe("useLoadManualUploadFile", () => {
  it("seeds the row shape the extraction resolved, not the request's", async () => {
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
        outputMode: "observations",
        cells: [["subject", "metric", "value"]],
        headerRows: 1,
      },
    });
    transcodePdfExtractionMock.mockResolvedValue({
      columns: [columnSchema("subject", "VARCHAR")],
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
      });
    });

    const parseOptions = result.current.dataSourceMetadata?.parseOptions;
    if (parseOptions?.type !== "pdf_file") {
      throw new Error("expected pdf parse options");
    }
    expect(parseOptions.outputMode).toBe("observations");
    // A mode nobody picked must not be sent, or the derived default could
    // never change once a first extraction had resolved one.
    expect(extractPdfRegionsMock).toHaveBeenCalledWith(
      expect.objectContaining({ outputMode: undefined }),
    );
  });

  it("forwards a row shape the user picked", async () => {
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
        cells: [["label", "value"]],
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
        isOutputModeUserChosen: true,
      });
    });

    expect(extractPdfRegionsMock).toHaveBeenCalledWith(
      expect.objectContaining({ outputMode: "natural" }),
    );
  });
});

// oxlint-disable-next-line typescript/ban-ts-comment
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

/* Register fixture mocks before Vitest loads the component dependencies. */
await vi.hoisted(async () => {
  await import("../useLoadManualUploadFileTestHelpers");
});
