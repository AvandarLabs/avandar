import { describe, expect, it } from "vitest";
import { extractRepeatingBlocks } from "./extractRepeatingBlocks";
import type { RegionGeometry, TextItem } from "../../pdfSniff.types";

function items(
  lines: ReadonlyArray<readonly [string, number, string?]>,
): TextItem[] {
  return lines.map(([text, y, fontName]) => {
    return {
      text,
      x: 100,
      y,
      width: text.length * 4,
      height: 9,
      fontName: fontName ?? "body",
      unmappedCharRatio: 0,
    };
  });
}

function region(textItems: readonly TextItem[]): RegionGeometry {
  return { pageIndex: 1, bbox: [0, 0, 600, 600], textItems, rules: [] };
}

describe("extractRepeatingBlocks", () => {
  it("builds one row per block with a column per field", () => {
    const result = extractRepeatingBlocks(
      region(
        items([
          ["1. Surveillance", 500, "bold"],
          ["Responses: To strengthen surveillance", 480],
          ["Challenges: Reporting delays", 460],
          ["2. Water quality", 420, "bold"],
          ["Responses: Providing safe water", 400],
          ["Challenges: One in four sources unsafe", 380],
        ]),
      ),
      { regionId: "r1" },
    );

    expect(result.cells[0]).toEqual([
      "number",
      "heading",
      "Responses",
      "Challenges",
    ]);
    expect(result.cells[1]).toEqual([
      "1",
      "Surveillance",
      "To strengthen surveillance",
      "Reporting delays",
    ]);
  });

  it("leaves a missing field empty rather than shifting columns", () => {
    // A pillar missing one of its labels must not slide the remaining
    // values one column left, which would silently mislabel every value
    // after it.
    const result = extractRepeatingBlocks(
      region(
        items([
          ["1. Surveillance", 500, "bold"],
          ["Responses: A", 480],
          ["Challenges: B", 460],
          ["2. Water", 420, "bold"],
          ["Challenges: C", 400],
        ]),
      ),
      { regionId: "r1" },
    );

    expect(result.cells[2]).toEqual(["2", "Water", "", "C"]);
  });

  it("orders columns by first appearance, not alphabetically", () => {
    const result = extractRepeatingBlocks(
      region(
        items([
          ["1. X", 500, "bold"],
          ["Responses: A", 480],
          ["Challenges: B", 460],
          ["Priorities: C", 440],
        ]),
      ),
      { regionId: "r1" },
    );

    expect(result.cells[0]!.slice(2)).toEqual([
      "Responses",
      "Challenges",
      "Priorities",
    ]);
  });

  it("returns an empty table when no blocks are found", () => {
    const result = extractRepeatingBlocks(
      region(items([["Just prose, no structure at all.", 500]])),
      { regionId: "r1" },
    );

    expect(result.cells).toEqual([]);
    expect(result.flags).toHaveLength(1);
  });

  it("records provenance on the region's page", () => {
    const result = extractRepeatingBlocks(
      region(
        items([
          ["1. X", 500, "bold"],
          ["Responses: A", 480],
        ]),
      ),
      { regionId: "r1" },
    );

    expect(result.rowProvenance[0]!.page).toBe(1);
  });
});
