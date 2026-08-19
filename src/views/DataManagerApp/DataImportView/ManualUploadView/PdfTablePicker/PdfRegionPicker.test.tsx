import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/test-utils";
import { pickMantineSelectOption } from "@/test-utils/pickMantineSelectOption";
import { PdfRegionPicker } from "./PdfRegionPicker";
import type { RegionClassification } from "@/workers/pdfSniff/classifyRegion";
import type { PdfRegion } from "@/workers/pdfSniff/types";

const REGION: PdfRegion = {
  id: "r1",
  label: "Deaths by state",
  shape: "labelled_graphic",
  detectionMode: "manual",
  fragments: [{ page: 0, bbox: [330, 175, 590, 465] }],
  options: {},
};

type PickerProps = {
  file: File;
  pageCount: number;
  regions: readonly PdfRegion[];
  classifications: Readonly<Record<string, RegionClassification>>;
  activeRegionId: string | null;
  onRegionsChange: (regions: readonly PdfRegion[]) => void;
  onActiveRegionChange: (regionId: string) => void;
};

function renderPicker(overrides: Partial<PickerProps> = {}): PickerProps {
  const props: PickerProps = {
    file: new File([], "x.pdf", { type: "application/pdf" }),
    pageCount: 3,
    regions: [REGION],
    classifications: {
      r1: {
        shape: "labelled_graphic",
        confidence: "medium",
        evidence: ["16 numbers, 17 short labels, no ruling lines."],
      },
    },
    activeRegionId: "r1",
    onRegionsChange: vi.fn(),
    onActiveRegionChange: vi.fn(),
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

  it("lets the user override the shape", () => {
    const props = renderPicker();

    pickMantineSelectOption(/read as/i, "Table");

    expect(props.onRegionsChange).toHaveBeenCalledWith([
      expect.objectContaining({ id: "r1", shape: "grid_table" }),
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
});
