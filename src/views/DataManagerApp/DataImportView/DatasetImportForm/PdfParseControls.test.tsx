import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCurrentUser } from "@/hooks/users/useCurrentUser";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { fireEvent, render, screen } from "@/test-utils";
import { PdfParseControls } from "./PdfParseControls";
import type { PdfFileLoadResult } from "../ManualUploadView/useLoadManualUploadFile/useLoadManualUploadFile";
import type { PdfDataSourceMetadata } from "./DatasetImportForm.types";
import type { PdfRegion } from "@/workers/pdfSniff/types";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { User } from "$/models/User/User";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { ReactElement } from "react";

const NEW_REGION: PdfRegion = {
  id: "r1",
  label: "Region 1",
  shape: "prose_measures",
  detectionMode: "manual",
  fragments: [{ page: 0, bbox: [10, 10, 100, 100] }],
  options: {},
};

vi.mock("@/hooks/users/useCurrentUser", () => {
  return { useCurrentUser: vi.fn() };
});

vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return { useCurrentWorkspace: vi.fn() };
});

// The real picker renders the PDF onto a canvas through pdf.js, which is not
// what this file is about: it is about what a region change does next.
vi.mock(
  "@/views/DataManagerApp/DataImportView/ManualUploadView/PdfTablePicker/PdfRegionPicker",
  () => {
    return {
      PdfRegionPicker: function PdfRegionPickerMock(props: {
        onRegionsChange: (regions: readonly PdfRegion[]) => void;
        onLlmModelUsed: (llmModel: string) => void;
      }): ReactElement {
        return createElement(
          "div",
          null,
          createElement(
            "button",
            {
              type: "button",
              onClick: () => {
                props.onRegionsChange([NEW_REGION]);
              },
            },
            "draw region",
          ),
          createElement(
            "button",
            {
              type: "button",
              onClick: () => {
                props.onLlmModelUsed("anthropic/claude-sonnet-5");
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
    numRows: 0,
    id: "load-1",
    type: "pdf",
    pageCount: 2,
    pages: [],
    status: "needs_selection",
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
  };
}

function _metadata(): PdfDataSourceMetadata {
  return {
    sourceType: "pdf_file",
    onlineStorageAllowed: true,
    sizeInBytes: 2048,
    datasetLoadResult: _loadResult(),
    parseOptions: { type: "pdf_file", regions: [], outputMode: "natural" },
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
        parseOptions: expect.objectContaining({ regions: [NEW_REGION] }),
      }),
    );
    expect(onRequestDataReparse).toHaveBeenCalledWith(
      expect.objectContaining({ type: "pdf_file", regions: [NEW_REGION] }),
    );
  });

  it("records the model that contributed rows without re-parsing", async () => {
    // Re-extracting here would throw the model's rows away again, which is
    // the opposite of what recording them is for.
    const { onDataSourceMetadataChange, onRequestDataReparse } =
      renderControls();

    fireEvent.click(await screen.findByRole("button", { name: /assist ran/i }));

    expect(onDataSourceMetadataChange).toHaveBeenCalledWith(
      expect.objectContaining({
        parseOptions: expect.objectContaining({
          llmModel: "anthropic/claude-sonnet-5",
        }),
      }),
    );
    expect(onRequestDataReparse).not.toHaveBeenCalled();
  });
});
