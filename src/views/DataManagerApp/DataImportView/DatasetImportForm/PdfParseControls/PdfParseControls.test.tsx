import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCurrentUser } from "@/hooks/users/useCurrentUser";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { fireEvent, render, screen } from "@/test-utils";
import { PdfParseControls } from "./PdfParseControls";
import type { PdfFileLoadResult } from "../../ManualUploadView/useLoadManualUploadFile/useLoadManualUploadFile";
import type {
  DataSourceMetadata,
  PdfDataSourceMetadata,
} from "../DatasetImportForm.types";
import type { ExtractedTable, PdfRegion } from "@/workers/pdfSniff/pdfSniff.types";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { User } from "$/models/User/User";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { ReactElement } from "react";

const REGION: PdfRegion = {
  id: "r1",
  label: "Highlights",
  shape: "prose_measures",
  detectionMode: "manual",
  fragments: [{ page: 0, bbox: [10, 10, 100, 100] }],
  options: {},
};

const SECOND_REGION: PdfRegion = { ...REGION, id: "r2", label: "Region 2" };

const RULE_TABLE: ExtractedTable = {
  regionId: "r1",
  cells: [
    ["subject", "metric", "value", "unit", "source_text"],
    ["Kassala", "cases", "12", "n", "There were 12 cases in Kassala."],
  ],
  headerRows: 1,
  flags: [],
  extractedBy: "rules",
  rowProvenance: [{ page: 0, bbox: [10, 10, 100, 100] }],
};

/** What `runRegionModelAssist` returns once the user accepts the assist. */
const MERGED_TABLE: ExtractedTable = {
  ...RULE_TABLE,
  extractedBy: "model",
  cells: [
    ...RULE_TABLE.cells,
    ["Gedaref", "deaths", "3", "n", "and three deaths in Gedaref."],
  ],
  rowProvenance: [
    ...RULE_TABLE.rowProvenance,
    { page: 0, bbox: [10, 10, 100, 100] },
  ],
};

vi.mock("@/hooks/users/useCurrentUser", () => {
  return { useCurrentUser: vi.fn() };
});

vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return { useCurrentWorkspace: vi.fn() };
});

// The real picker renders the PDF onto a canvas through pdf.js, which is not
// what this file is about: it is about what a region change and an accepted
// assist do next.
vi.mock(
  "@/views/DataManagerApp/DataImportView/ManualUploadView/PdfTablePicker/PdfRegionPicker/PdfRegionPicker",
  () => {
    return {
      PdfRegionPicker: function PdfRegionPickerMock(props: {
        onRegionsChange: (regions: readonly PdfRegion[]) => void;
        onAssistApplied: (result: {
          table: ExtractedTable;
          llmModel: string;
        }) => void;
      }): ReactElement {
        return createElement(
          "div",
          null,
          createElement(
            "button",
            {
              type: "button",
              onClick: () => {
                props.onRegionsChange([REGION, SECOND_REGION]);
              },
            },
            "draw region",
          ),
          createElement(
            "button",
            {
              type: "button",
              onClick: () => {
                props.onAssistApplied({
                  table: MERGED_TABLE,
                  llmModel: "anthropic/claude-sonnet-5",
                });
              },
            },
            "assist ran",
          ),
        );
      },
    };
  },
);

function _loadResult(): PdfFileLoadResult {
  return {
    datasetId: "11111111-1111-4111-8111-111111111111" as Dataset.Id,
    numRows: 1,
    id: "load-1",
    type: "pdf",
    pageCount: 2,
    pages: [],
    status: "extracted",
    regions: [REGION],
    columns: [],
    tables: [RULE_TABLE],
    classifications: {},
    documentMetadata: {
      title: null,
      organisation: null,
      reportNumber: null,
      publishedAt: null,
    },
    combinedCells: RULE_TABLE.cells,
    combinedHeaderRows: 1,
  };
}

function _metadata(): PdfDataSourceMetadata {
  return {
    sourceType: "pdf_file",
    onlineStorageAllowed: true,
    sizeInBytes: 2048,
    datasetLoadResult: _loadResult(),
    parseOptions: {
      type: "pdf_file",
      regions: [REGION],
      outputMode: "natural",
    },
  };
}

function renderControls(): {
  onDataSourceMetadataChange: ReturnType<typeof vi.fn>;
  onRequestDataReparse: ReturnType<typeof vi.fn>;
} {
  const onDataSourceMetadataChange = vi.fn();
  const onRequestDataReparse = vi.fn();
  render(
    <PdfParseControls
      sourceFile={new File([], "report.pdf", { type: "application/pdf" })}
      metadata={_metadata()}
      onDataSourceMetadataChange={onDataSourceMetadataChange}
      onRequestDataReparse={onRequestDataReparse}
    />,
  );
  return { onDataSourceMetadataChange, onRequestDataReparse };
}

function _lastMetadata(spy: ReturnType<typeof vi.fn>): PdfDataSourceMetadata {
  const calls = spy.mock.calls;
  const last = calls[calls.length - 1]?.[0] as DataSourceMetadata;
  if (last?.sourceType !== "pdf_file") {
    throw new Error("Expected a pdf_file metadata update.");
  }
  return last;
}

describe("PdfParseControls", () => {
  beforeEach(() => {
    vi.mocked(useCurrentWorkspace).mockReturnValue({
      id: "00000000-0000-4000-8000-000000000002" as Workspace.Id,
    } as ReturnType<typeof useCurrentWorkspace>);
    vi.mocked(useCurrentUser).mockReturnValue({
      id: "00000000-0000-4000-8000-000000000001",
    } as User.T);
  });

  it("re-extracts through the normal re-parse path when a region changes", async () => {
    // Extraction must not get a second route of its own: a region change is
    // a re-parse, so it goes through the same call the "process again"
    // button uses and cannot drift from what the form will save.
    const { onDataSourceMetadataChange, onRequestDataReparse } =
      renderControls();

    fireEvent.click(
      await screen.findByRole("button", { name: /draw region/i }),
    );

    expect(onDataSourceMetadataChange).toHaveBeenCalledWith(
      expect.objectContaining({
        parseOptions: expect.objectContaining({
          regions: [REGION, SECOND_REGION],
        }),
      }),
    );
    expect(onRequestDataReparse).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "pdf_file",
        regions: [REGION, SECOND_REGION],
      }),
    );
  });

  it("folds an accepted assist's rows and its model into one update", async () => {
    // The rows and the `llm_model` that explains them have to travel
    // together. Two updates derived from the same metadata would leave a
    // dataset naming a model that apparently wrote nothing.
    const { onDataSourceMetadataChange, onRequestDataReparse } =
      renderControls();

    fireEvent.click(await screen.findByRole("button", { name: /assist ran/i }));

    expect(onDataSourceMetadataChange).toHaveBeenCalledTimes(1);
    const metadata = _lastMetadata(onDataSourceMetadataChange);
    expect(metadata.parseOptions.llmModel).toBe("anthropic/claude-sonnet-5");
    expect(metadata.datasetLoadResult.combinedCells).toContainEqual([
      "Gedaref",
      "deaths",
      "3",
      "n",
      "and three deaths in Gedaref.",
    ]);
    expect(metadata.datasetLoadResult.numRows).toBe(2);
    // Re-extracting here would throw the model's rows away again, which is
    // the opposite of what recording them is for.
    expect(onRequestDataReparse).not.toHaveBeenCalled();
  });

  it("folds a corrected cell into the rows the save will build from", async () => {
    // The review grid's whole reason to exist is that position-based
    // association gets figures wrong. A correction that stops at component
    // state fixes the display and nothing else.
    const { onDataSourceMetadataChange, onRequestDataReparse } =
      renderControls();

    fireEvent.change(
      await screen.findByRole("textbox", { name: /row 1, subject/i }),
      { target: { value: "Kassala State" } },
    );

    const metadata = _lastMetadata(onDataSourceMetadataChange);
    expect(metadata.datasetLoadResult.combinedCells).toContainEqual([
      "Kassala State",
      "cases",
      "12",
      "n",
      "There were 12 cases in Kassala.",
    ]);
    expect(metadata.datasetLoadResult.tables[0]?.cells[1]?.[0]).toBe(
      "Kassala State",
    );
    // A correction must not re-sniff the document: re-reading the PDF would
    // re-extract from the page geometry and undo the correction, besides
    // costing a full parse of a possibly enormous file on every keystroke.
    expect(onRequestDataReparse).not.toHaveBeenCalled();
  });
});
