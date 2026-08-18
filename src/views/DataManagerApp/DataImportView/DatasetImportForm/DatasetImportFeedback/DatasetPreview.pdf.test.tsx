import { uuid } from "$/lib/uuid";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@/test-utils";
import { DatasetPreview } from "./DatasetPreview";
import type { PdfDataSourceMetadata } from "@/views/DataManagerApp/DataImportView/DatasetImportForm/DatasetImportForm.types";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

const PDF_DATASET_ID = "33333333-3333-3333-3333-333333333333" as Dataset.Id;

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
      columns: [],
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
});
