import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/test-utils";
import { PdfReviewGrid } from "./PdfReviewGrid";
import type { ExtractedTable } from "@/workers/pdfSniff/pdfSniff.types";

const TABLE: ExtractedTable = {
  regionId: "r1",
  cells: [
    ["label", "value"],
    ["KHARTOUM", "408"],
    ["RIVER NILE", "83"],
  ],
  headerRows: 1,
  flags: [
    {
      rowIndex: 1,
      columnIndex: 0,
      reason: "ambiguous_association",
      detail: '"83" was nearly as close to another label.',
    },
  ],
  extractedBy: "rules",
  rowProvenance: [
    { page: 0, bbox: [480, 300, 500, 310] },
    { page: 0, bbox: [478, 280, 498, 290] },
  ],
};

/*
 * `rowIndex: -1` with `columnIndex: -1` is the sentinel for a flag about the
 * whole region rather than one cell. It must never be read as a coordinate.
 */
const TABLE_WITH_REGION_FLAG: ExtractedTable = {
  ...TABLE,
  flags: [
    ...TABLE.flags,
    {
      rowIndex: -1,
      columnIndex: -1,
      reason: "unmatched_value",
      detail: "3 numbers in this region had no label near them.",
    },
  ],
};

describe("PdfReviewGrid", () => {
  it("renders the extracted rows", () => {
    render(
      <PdfReviewGrid
        table={TABLE}
        onTableChange={vi.fn()}
        onRowFocus={vi.fn()}
      />,
    );

    expect(screen.getByDisplayValue("KHARTOUM")).toBeInTheDocument();
    expect(screen.getByDisplayValue("408")).toBeInTheDocument();
  });

  it("marks a flagged cell and explains why", () => {
    render(
      <PdfReviewGrid
        table={TABLE}
        onTableChange={vi.fn()}
        onRowFocus={vi.fn()}
      />,
    );

    expect(
      screen.getByText(/nearly as close to another label/i),
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue("RIVER NILE")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  it("reports how many rows need review", () => {
    render(
      <PdfReviewGrid
        table={TABLE}
        onTableChange={vi.fn()}
        onRowFocus={vi.fn()}
      />,
    );

    expect(screen.getByText(/1 of 2 rows needs review/i)).toBeInTheDocument();
  });

  it("lets the user correct a cell", () => {
    const onTableChange = vi.fn();
    render(
      <PdfReviewGrid
        table={TABLE}
        onTableChange={onTableChange}
        onRowFocus={vi.fn()}
      />,
    );

    const cell = screen.getByDisplayValue("RIVER NILE");
    fireEvent.change(cell, { target: { value: "RED SEA" } });

    expect(onTableChange).toHaveBeenCalledWith(
      expect.objectContaining({
        cells: [
          ["label", "value"],
          ["KHARTOUM", "408"],
          ["RED SEA", "83"],
        ],
      }),
    );
  });

  it("clears a row's flag once it is edited", () => {
    // An edited row has been reviewed by definition. Leaving it flagged would
    // make the review counter useless.
    const onTableChange = vi.fn();
    render(
      <PdfReviewGrid
        table={TABLE}
        onTableChange={onTableChange}
        onRowFocus={vi.fn()}
      />,
    );

    const cell = screen.getByDisplayValue("RIVER NILE");
    fireEvent.change(cell, { target: { value: "RED SEA" } });

    expect(onTableChange).toHaveBeenCalledWith(
      expect.objectContaining({ flags: [] }),
    );
  });

  it("reports the source position when a row is focused", () => {
    const onRowFocus = vi.fn();
    render(
      <PdfReviewGrid
        table={TABLE}
        onTableChange={vi.fn()}
        onRowFocus={onRowFocus}
      />,
    );

    fireEvent.click(screen.getByDisplayValue("KHARTOUM"));

    expect(onRowFocus).toHaveBeenCalledWith({
      page: 0,
      bbox: [480, 300, 500, 310],
    });
  });

  it("reports the source position when a cell is focused by keyboard", () => {
    const onRowFocus = vi.fn();
    render(
      <PdfReviewGrid
        table={TABLE}
        onTableChange={vi.fn()}
        onRowFocus={onRowFocus}
      />,
    );

    fireEvent.focus(screen.getByDisplayValue("RIVER NILE"));

    expect(onRowFocus).toHaveBeenCalledWith({
      page: 0,
      bbox: [478, 280, 498, 290],
    });
  });

  it("renders a region-level flag as a note, not as a row", () => {
    render(
      <PdfReviewGrid
        table={TABLE_WITH_REGION_FLAG}
        onTableChange={vi.fn()}
        onRowFocus={vi.fn()}
      />,
    );

    expect(
      screen.getByText(/3 numbers in this region had no label near them/i),
    ).toBeInTheDocument();
    // The sentinel row must not be counted: still 1 of 2, not 2 of 2.
    expect(screen.getByText(/1 of 2 rows needs review/i)).toBeInTheDocument();
    // And it must not have been read as a coordinate: only the real flag
    // marks a cell.
    const invalidCells = screen.getAllByRole("textbox").filter((cell) => {
      return cell.getAttribute("aria-invalid") === "true";
    });
    expect(invalidCells).toHaveLength(1);
    expect(invalidCells[0]).toHaveValue("RIVER NILE");
  });

  it("keeps region-level flags when a row is edited", () => {
    const onTableChange = vi.fn();
    render(
      <PdfReviewGrid
        table={TABLE_WITH_REGION_FLAG}
        onTableChange={onTableChange}
        onRowFocus={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByDisplayValue("RIVER NILE"), {
      target: { value: "RED SEA" },
    });

    expect(onTableChange).toHaveBeenCalledWith(
      expect.objectContaining({
        flags: [
          {
            rowIndex: -1,
            columnIndex: -1,
            reason: "unmatched_value",
            detail: "3 numbers in this region had no label near them.",
          },
        ],
      }),
    );
  });
});
