import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCurrentUser } from "@/hooks/users/useCurrentUser";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { fireEvent, render, screen, waitFor } from "@/test-utils";
import { PdfParseControls } from "./PdfParseControls/PdfParseControls";
import { useSaveDataset } from "./useSaveDataset/useSaveDataset";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { User } from "$/models/User/User";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { PdfFileLoadResult } from "../ManualUploadView/useLoadManualUploadFile/useLoadManualUploadFile";
import type {
  DataSourceMetadata,
  PdfDataSourceMetadata,
} from "./DatasetImportForm.types";
import type {
  ExtractedTable,
  PdfRegion,
} from "@/workers/pdfSniff/pdfSniff.types";
import type { ReactElement, ReactNode } from "react";

/**
 * The seam this file guards is "what the user approved" to "what is saved".
 *
 * It drives the real `PdfParseControls`, the real `PdfReviewGrid` and the
 * real `useSaveDataset`, and asserts on the CSV handed to the save-time
 * transcode, because that CSV *is* the dataset's rows. Asserting anywhere
 * earlier would pass while the saved data stayed wrong, which is exactly the
 * failure this is here to catch.
 */

const {
  insertPdfFileDatasetMock,
  transcodeReviewedPdfExtractionMock,
  navigateMock,
} = vi.hoisted(() => {
  return {
    insertPdfFileDatasetMock: vi.fn(),
    transcodeReviewedPdfExtractionMock: vi.fn(),
    navigateMock: vi.fn(),
  };
});

vi.mock("@/hooks/users/useCurrentUser", () => {
  return { useCurrentUser: vi.fn() };
});

vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return { useCurrentWorkspace: vi.fn() };
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

vi.mock("@/clients/datasets/DatasetClient/DatasetClient", () => {
  return {
    DatasetClient: {
      QueryKeys: {
        getAll: () => {
          return ["datasets"];
        },
      },
      useGetAll: () => {
        return [[], false];
      },
      insertPdfFileDataset: insertPdfFileDatasetMock,
    },
  };
});

vi.mock("@/clients/datasets/DatasetColumnClient", () => {
  return {
    DatasetColumnClient: {
      QueryKeys: {
        getAll: () => {
          return ["dataset-columns"];
        },
      },
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

vi.mock(
  "@/clients/storage/DatasetParquetStorageClient/DatasetParquetStorageClient",
  () => {
    return { DatasetParquetStorageClient: { startDatasetUpload: vi.fn() } };
  },
);

vi.mock("@/lib/analytics/AnalyticsClient", () => {
  return { AnalyticsClient: { logEvent: vi.fn() } };
});

vi.mock("@/utils/notifications/notify", () => {
  return { notifyError: vi.fn(), notifySuccess: vi.fn() };
});

const REGION: PdfRegion = {
  id: "r1",
  label: "Highlights",
  shape: "prose_measures",
  detectionMode: "manual",
  fragments: [{ page: 0, bbox: [10, 10, 100, 100] }],
  options: {},
};

const HEADER = ["subject", "metric", "value", "unit", "source_text"];
const RULE_ROW = [
  "Northern",
  "deaths",
  "29",
  "n",
  "There were 29 deaths in Northern.",
];
const MODEL_ROW = [
  "Gedaref",
  "deaths",
  "3",
  "n",
  "and three deaths in Gedaref.",
];

const RULE_TABLE: ExtractedTable = {
  regionId: "r1",
  cells: [HEADER, RULE_ROW],
  headerRows: 1,
  flags: [
    {
      rowIndex: 0,
      columnIndex: 0,
      reason: "ambiguous_association",
      detail: "Two labels were almost equally close to this value.",
    },
  ],
  extractedBy: "rules",
  rowProvenance: [{ page: 0, bbox: [10, 10, 100, 100] }],
};

/** What an accepted assist hands back: rule rows first, model rows after. */
const MERGED_TABLE: ExtractedTable = {
  ...RULE_TABLE,
  extractedBy: "model",
  flags: [],
  cells: [HEADER, RULE_ROW, MODEL_ROW],
  rowProvenance: [
    ...RULE_TABLE.rowProvenance,
    { page: 0, bbox: [10, 10, 100, 100] },
  ],
};

vi.mock(
  "@/views/DataManagerApp/DataImportView/ManualUploadView/PdfTablePicker/PdfRegionPicker/PdfRegionPicker",
  () => {
    return {
      PdfRegionPicker: function PdfRegionPickerMock(props: {
        onAssistApplied: (result: {
          table: ExtractedTable;
          llmModel: string;
        }) => void;
      }): ReactElement {
        return createElement(
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
          "accept assist",
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
    outputMode: "natural",
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

const INITIAL_METADATA: PdfDataSourceMetadata = {
  sourceType: "pdf_file",
  onlineStorageAllowed: false,
  sizeInBytes: 2048,
  datasetLoadResult: _loadResult(),
  parseOptions: { type: "pdf_file", regions: [REGION], outputMode: "natural" },
};

/**
 * Stands in for the import form: owns the metadata the way
 * `useLoadManualUploadFile` does, and saves exactly what it currently holds.
 */
function ReviewAndSaveHarness(): ReactNode {
  const [metadata, setMetadata] =
    useState<PdfDataSourceMetadata>(INITIAL_METADATA);
  const [saveDataset] = useSaveDataset();
  return (
    <>
      <PdfParseControls
        sourceFile={new File([], "report.pdf", { type: "application/pdf" })}
        metadata={metadata}
        onDataSourceMetadataChange={(next: DataSourceMetadata) => {
          if (next.sourceType === "pdf_file") {
            setMetadata(next);
          }
        }}
        onRequestDataReparse={vi.fn()}
      />
      <button
        type="button"
        onClick={() => {
          saveDataset({ name: "Report", description: "", ...metadata });
        }}
      >
        save dataset
      </button>
    </>
  );
}

function renderHarness(): void {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  render(<ReviewAndSaveHarness />, {
    wrapper: ({ children }: { children: ReactNode }) => {
      return (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );
    },
  });
}

/** jsdom's `Blob` has no `text()`, so the bytes come back the long way. */
function _readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(String(reader.result));
    };
    reader.onerror = () => {
      reject(reader.error ?? new Error("Could not read the transcoded CSV."));
    };
    reader.readAsText(file);
  });
}

/** The rows the save actually wrote, read back off the transcoded CSV. */
async function _savedCsv(): Promise<string> {
  await waitFor(() => {
    expect(transcodeReviewedPdfExtractionMock).toHaveBeenCalledTimes(1);
  });
  const { csvFile } = transcodeReviewedPdfExtractionMock.mock.calls[0]![0] as {
    csvFile: File;
  };
  return _readFile(csvFile);
}

describe("saving a reviewed PDF extraction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertPdfFileDatasetMock.mockResolvedValue({
      id: "11111111-1111-4111-8111-111111111111",
      name: "Report",
    });
    transcodeReviewedPdfExtractionMock.mockResolvedValue({
      columns: [
        {
          column_name: "subject",
          column_type: "VARCHAR",
          null: "YES",
          key: null,
          default: null,
          extra: null,
        },
      ],
    });
    vi.mocked(useCurrentWorkspace).mockReturnValue({
      id: "00000000-0000-4000-8000-000000000002" as Workspace.Id,
      slug: "test-workspace",
    } as ReturnType<typeof useCurrentWorkspace>);
    vi.mocked(useCurrentUser).mockReturnValue({
      id: "00000000-0000-4000-8000-000000000001",
    } as User.T);
  });

  it("saves the corrected value, not the one the rules read", async () => {
    // Position-based association was measured getting about one figure in
    // sixteen silently wrong, which is the whole reason the grid exists. A
    // correction that never reaches the data is worse than no grid at all:
    // it manufactures confidence in the same bad row.
    renderHarness();

    fireEvent.change(
      await screen.findByRole("textbox", { name: /row 1, subject/i }),
      { target: { value: "Northern State" } },
    );
    fireEvent.click(screen.getByRole("button", { name: /save dataset/i }));

    const csv = await _savedCsv();
    expect(csv).toContain("Northern State");
    expect(csv).not.toContain("Northern,deaths");
    await waitFor(() => {
      expect(insertPdfFileDatasetMock).toHaveBeenCalledTimes(1);
    });
  });

  it("saves the model's rows alongside the model it recorded", async () => {
    // `llm_model` set with the model's rows missing is the specific
    // inconsistency to prevent: the provenance column would claim a model
    // contributed to data it did not.
    renderHarness();

    fireEvent.click(
      await screen.findByRole("button", { name: /accept assist/i }),
    );
    fireEvent.click(screen.getByRole("button", { name: /save dataset/i }));

    const csv = await _savedCsv();
    expect(csv).toContain("Gedaref");
    expect(csv).toContain("Northern");

    await waitFor(() => {
      expect(insertPdfFileDatasetMock).toHaveBeenCalledTimes(1);
    });
    expect(insertPdfFileDatasetMock.mock.calls[0]![0].llmModel).toBe(
      "anthropic/claude-sonnet-5",
    );
  });

  it("saves the raw extraction unchanged when nothing was reviewed", async () => {
    // The regression guard. Recombining untouched tables has to reproduce
    // the worker's own combination exactly, or every unedited import
    // silently changes shape.
    renderHarness();

    fireEvent.click(
      await screen.findByRole("button", { name: /save dataset/i }),
    );

    const csv = await _savedCsv();
    expect(csv).toBe(
      "subject,metric,value,unit,source_text\n" +
        "Northern,deaths,29,n,There were 29 deaths in Northern.",
    );
    await waitFor(() => {
      expect(insertPdfFileDatasetMock).toHaveBeenCalledTimes(1);
    });
    expect(insertPdfFileDatasetMock.mock.calls[0]![0].llmModel).toBeUndefined();
  });
});
