import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@/test-utils";
import { pickMantineSelectOption } from "@/test-utils/pickMantineSelectOption";
import { runRegionModelAssist } from "../runRegionModelAssist/runRegionModelAssist";
import { PdfRegionPicker } from "./PdfRegionPicker";
import type { RegionClassification } from "@/workers/pdfSniff/classifyRegion/classifyRegion";
import type {
  ExtractedTable,
  PageGeometry,
  PdfRegion,
} from "@/workers/pdfSniff/pdfSniff.types";
import type { Workspace } from "$/models/Workspace/Workspace";

vi.mock(
  "../runRegionModelAssist/runRegionModelAssist",
  async (importOriginal) => {
    // Only the network-facing call is stubbed.
    // `getCoverageFlagFromTable` stays real, because whether the offer appears
    // at all is what these tests are about.
    const original =
      await importOriginal<
        typeof import("../runRegionModelAssist/runRegionModelAssist")
      >();
    return { ...original, runRegionModelAssist: vi.fn() };
  },
);

if (!("PointerEvent" in window)) {
  (window as unknown as { PointerEvent: typeof MouseEvent }).PointerEvent =
    MouseEvent;
}

const REGION: PdfRegion = {
  id: "r1",
  label: "Deaths by state",
  shape: "labelled_graphic",
  detectionMode: "manual",
  fragments: [{ page: 0, bbox: [330, 175, 590, 465] }],
  options: {},
};

const PAGE: PageGeometry = {
  pageIndex: 0,
  width: 595,
  height: 842,
  textItems: [],
  rules: [],
  marks: [],
  marksTruncated: false,
  looksScanned: false,
};

const TABLE_WITH_COVERAGE_FLAG: ExtractedTable = {
  regionId: "r1",
  cells: [
    ["subject", "metric", "value", "unit", "source_text"],
    ["Kassala", "cases", "12", "n", "There were 12 cases in Kassala."],
  ],
  headerRows: 1,
  flags: [
    {
      rowIndex: -1,
      columnIndex: -1,
      reason: "unmatched_value",
      detail:
        "We read 1 of the 4 numbers in this region. Sentences that name " +
        "their subject indirectly are hard to read with rules alone.",
    },
  ],
  extractedBy: "rules",
  rowProvenance: [{ page: 0, bbox: [330, 175, 590, 465] }],
};

type PickerProps = {
  file: File;
  pageCount: number;
  pages: readonly PageGeometry[];
  regions: readonly PdfRegion[];
  tables: readonly ExtractedTable[];
  classifications: Readonly<Record<string, RegionClassification>>;
  activeRegionId: string | null;
  workspaceId: Workspace.Id;
  userId: string | undefined;
  onRegionsChange: (regions: readonly PdfRegion[]) => void;
  onActiveRegionChange: (regionId: string) => void;
  onAssistApplied: (result: {
    table: ExtractedTable;
    llmModel: string;
  }) => void;
};

function renderPicker(overrides: Partial<PickerProps> = {}): PickerProps {
  const props: PickerProps = {
    file: new File([], "x.pdf", { type: "application/pdf" }),
    pageCount: 3,
    pages: [PAGE],
    regions: [REGION],
    tables: [],
    classifications: {
      r1: {
        shape: "labelled_graphic",
        confidence: "medium",
        evidence: ["16 numbers, 17 short labels, no ruling lines."],
      },
    },
    activeRegionId: "r1",
    workspaceId: "ws-1" as Workspace.Id,
    userId: "user-1",
    onRegionsChange: vi.fn(),
    onActiveRegionChange: vi.fn(),
    onAssistApplied: vi.fn(),
    ...overrides,
  };
  render(<PdfRegionPicker {...props} />);
  return props;
}

describe("PdfRegionPicker", () => {
  it("shows the classifier's evidence beside the shape control", () => {
    // Without the evidence the override control is a coin flip: the user has
    // no basis to decide whether we got it right.
    renderPicker();

    expect(
      screen.getByText(/16 numbers, 17 short labels, no ruling lines/i),
    ).toBeInTheDocument();
  });

  it("lets the user override the shape, and records that they chose it", () => {
    // The flag is the override. Without it the next extraction classifies the
    // region again and writes its own verdict straight back over the choice,
    // which the user sees as the dropdown snapping back.
    const props = renderPicker();

    pickMantineSelectOption(/read as/i, "Table");

    expect(props.onRegionsChange).toHaveBeenCalledWith([
      expect.objectContaining({
        id: "r1",
        shape: "grid_table",
        isShapeUserChosen: true,
      }),
    ]);
  });

  it("does not claim the user chose a shape they never touched", () => {
    const props = renderPicker();

    const nameField = screen.getByDisplayValue("Deaths by state");
    fireEvent.change(nameField, { target: { value: "Cholera deaths" } });

    expect(props.onRegionsChange).toHaveBeenCalledWith([
      expect.not.objectContaining({ isShapeUserChosen: true }),
    ]);
  });

  it("lets the user rename a region", () => {
    const props = renderPicker();

    const nameField = screen.getByDisplayValue("Deaths by state");
    fireEvent.change(nameField, { target: { value: "Cholera deaths" } });

    expect(props.onRegionsChange).toHaveBeenCalledWith([
      expect.objectContaining({ label: "Cholera deaths" }),
    ]);
  });

  it("removes a region", () => {
    const props = renderPicker();

    fireEvent.click(screen.getByRole("button", { name: /remove/i }));

    expect(props.onRegionsChange).toHaveBeenCalledWith([]);
  });

  it("prompts for a selection when there are no regions", () => {
    renderPicker({ regions: [], classifications: {} });

    expect(screen.getByText(/draw a box/i)).toBeInTheDocument();
  });

  it("does not offer the assistant when the rules read the region well", () => {
    // The offer costs money and sends data. It exists for the one case the
    // rules admit to being bad at, not as a general button.
    renderPicker({
      tables: [{ ...TABLE_WITH_COVERAGE_FLAG, flags: [] }],
    });

    expect(
      screen.queryByRole("button", { name: /extract with the assistant/i }),
    ).not.toBeInTheDocument();
  });

  it("offers the assistant when the rules missed most of the numbers", () => {
    renderPicker({ tables: [TABLE_WITH_COVERAGE_FLAG] });

    expect(
      screen.getByRole("button", { name: /extract with the assistant/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/we read 1 of the 4 numbers/i)).toBeInTheDocument();
  });

  it("leaves the table untouched when the assist is declined", async () => {
    vi.mocked(runRegionModelAssist).mockResolvedValue({
      kind: "skipped",
      reason: "consent_declined",
    });
    const props = renderPicker({ tables: [TABLE_WITH_COVERAGE_FLAG] });

    fireEvent.click(
      screen.getByRole("button", { name: /extract with the assistant/i }),
    );

    expect(
      await screen.findByText(/kept the rule-based results/i),
    ).toBeInTheDocument();
    expect(props.onAssistApplied).not.toHaveBeenCalled();
  });

  it("reports the merged rows and the model that wrote them together", async () => {
    // One call, not two. Two would be two state updates derived from the
    // same metadata, and the loser would take the model's rows with it.
    const merged: ExtractedTable = {
      ...TABLE_WITH_COVERAGE_FLAG,
      extractedBy: "model",
      flags: [],
    };
    vi.mocked(runRegionModelAssist).mockResolvedValue({
      kind: "merged",
      table: merged,
      llmModel: "anthropic/claude-sonnet-5",
      addedRowCount: 2,
    });
    const props = renderPicker({ tables: [TABLE_WITH_COVERAGE_FLAG] });

    fireEvent.click(
      screen.getByRole("button", { name: /extract with the assistant/i }),
    );

    await waitFor(() => {
      expect(props.onAssistApplied).toHaveBeenCalledWith({
        table: merged,
        llmModel: "anthropic/claude-sonnet-5",
      });
    });
    expect(props.onAssistApplied).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/added 2 rows from the assistant/i)).toBeVisible();
  });

  it("keeps the rule-based rows when the assist throws", async () => {
    // Offline, or the edge function is down. Either way the rules stand.
    vi.mocked(runRegionModelAssist).mockRejectedValue(new Error("offline"));
    const props = renderPicker({ tables: [TABLE_WITH_COVERAGE_FLAG] });

    fireEvent.click(
      screen.getByRole("button", { name: /extract with the assistant/i }),
    );

    expect(
      await screen.findByText(/could not reach the assistant/i),
    ).toBeInTheDocument();
    expect(props.onAssistApplied).not.toHaveBeenCalled();
  });

  it("shows the y-axis fit on a cartesian extraction", () => {
    renderPicker({
      tables: [
        {
          regionId: "r1",
          cells: [
            ["week", "value"],
            ["1", "760"],
          ],
          headerRows: 1,
          flags: [],
          extractedBy: "rules",
          rowProvenance: [{ page: 0, bbox: REGION.fragments[0]!.bbox }],
          chartAxis: {
            min: 0,
            max: 10000,
            scale: "linear",
            tickCount: 6,
            maxResidual: 0.3,
          },
        },
      ],
    });

    // "Value axis" rather than "y-axis": a horizontal bar chart is calibrated
    // along x, and the same note is what reports it.
    expect(screen.getByText(/value axis 0 to 10000/i)).toBeInTheDocument();
    expect(screen.getByText(/fits 6 ticks/i)).toBeInTheDocument();
    expect(screen.getByText(/max error 0.3 pt/i)).toBeInTheDocument();
  });

  it("writes two y-axis clicks onto the region as calibration hints", () => {
    const props = renderPicker();

    fireEvent.click(
      screen.getByRole("button", { name: /calibrate manually/i }),
    );

    const overlay = screen.getByTestId("pdf-region-overlay");
    vi.spyOn(overlay, "getBoundingClientRect").mockReturnValue(
      new DOMRect(0, 0, 210, 424),
    );
    fireEvent.pointerDown(overlay, { clientX: 20, clientY: 400 });
    fireEvent.pointerUp(overlay, { clientX: 20, clientY: 400 });
    fireEvent.pointerDown(overlay, { clientX: 20, clientY: 40 });
    fireEvent.pointerUp(overlay, { clientX: 20, clientY: 40 });

    fireEvent.change(screen.getByLabelText(/first tick value/i), {
      target: { value: "0" },
    });
    fireEvent.change(screen.getByLabelText(/second tick value/i), {
      target: { value: "10000" },
    });
    fireEvent.click(screen.getByRole("button", { name: /apply calibration/i }));

    const nextRegions = vi.mocked(props.onRegionsChange).mock.calls.at(-1)?.[0];
    const hints = nextRegions?.[0]?.options.yAxisHints as
      | ReadonlyArray<{ position: number; value: number }>
      | undefined;
    expect(hints).toHaveLength(2);
    expect(hints?.[0]).toEqual(expect.objectContaining({ value: 0 }));
    expect(hints?.[1]).toEqual(expect.objectContaining({ value: 10000 }));
    expect(hints?.[0]?.position).toBeLessThan(100);
    expect(hints?.[1]?.position).toBeGreaterThan(700);
  });
});
