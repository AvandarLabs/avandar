import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { PdfDataSourceMetadata } from "@/views/DataManagerApp/DataImportView/DatasetImportForm/DatasetImportForm.types";

import { describe, expect, it, vi } from "vitest";

import { uuid } from "$/lib/uuid";
import { render, screen } from "@/test-utils";

import { DatasetPreview } from "./DatasetPreview";

const PDF_DATASET_ID = "33333333-3333-3333-3333-333333333333" as Dataset.Id;

// The real controls render the PDF through pdf.js onto a canvas, which this
// file has nothing to say about; what matters here is that they are reachable
// at all in the state that only they can end.
vi.mock(
  "@/views/DataManagerApp/DataImportView/DatasetImportForm/PdfParseControls/PdfParseControls",
  async () => {
    const { createElement } = await import("react");
    return {
      PdfParseControls: function PdfParseControlsMock() {
        return createElement("div", { "data-testid": "pdf-parse-controls" });
      },
    };
  },
);

vi.mock("@/lib/ui/viz/DataGrid", async () => {
  const { createElement } = await import("react");
  return {
    DataGrid: function DataGridMock() {
      return createElement("div", { "data-testid": "data-grid-mock" });
    },
  };
});

function _pdfDataSourceMetadata(): PdfDataSourceMetadata {
  return {
    sourceType: "pdf_file",
    onlineStorageAllowed: true,
    sizeInBytes: 1024,
    datasetLoadResult: {
      datasetId: PDF_DATASET_ID,
      numRows: 0,
      id: uuid(),
      type: "pdf",
      pageCount: 3,
      pages: [],
      status: "needs_selection",
      // No region picked yet, so no extraction has settled on a row shape.
      outputMode: undefined,
      regions: [],
      columns: [],
      tables: [],
      classifications: {},
      documentMetadata: {
        title: null,
        organisation: null,
        reportNumber: null,
        publishedAt: null,
      },
      combinedCells: [],
      combinedHeaderRows: 0,
    },
    parseOptions: { type: "pdf_file", regions: [], outputMode: "natural" },
  };
}

describe("DatasetPreview for a PDF awaiting selection", () => {
  it("asks for a region instead of reporting an empty dataset", () => {
    render(
      <DatasetPreview
        columns={[]}
        columnsMessage="0 columns were detected."
        dataSourceMetadata={_pdfDataSourceMetadata()}
        isProcessing={false}
        onDataSourceMetadataChange={vi.fn()}
        onRequestDataReparse={vi.fn()}
        previewMessage="These are the first 0 rows of your dataset."
        previewRows={[]}
      />,
    );

    expect(
      screen.getByText(/select a region .* to see data/i),
    ).toBeInTheDocument();
    // The generic empty state would be actively misleading here: it tells the
    // user their file contained nothing, when in fact they simply have not
    // chosen anything yet. Neither the empty grid nor the reparse control
    // belongs on screen until a region exists.
    expect(screen.queryByText(/rows of your dataset/i)).not.toBeInTheDocument();
    expect(screen.queryByTestId("data-grid-mock")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /process data again/i }),
    ).not.toBeInTheDocument();
  });

  it("still renders the region picker, which is the only way out of this state", () => {
    // Withholding the grid is right; withholding the picker too would leave
    // the user in a state with no exit, because drawing a region is what
    // ends it.
    render(
      <DatasetPreview
        columns={[]}
        columnsMessage="0 columns were detected."
        dataSourceMetadata={_pdfDataSourceMetadata()}
        isProcessing={false}
        onDataSourceMetadataChange={vi.fn()}
        onRequestDataReparse={vi.fn()}
        previewMessage="These are the first 0 rows of your dataset."
        previewRows={[]}
        sourceFile={new File([], "report.pdf", { type: "application/pdf" })}
      />,
    );

    expect(screen.getByTestId("pdf-parse-controls")).toBeInTheDocument();
  });
});
