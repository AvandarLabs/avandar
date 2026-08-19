import { describe, expect, it } from "vitest";
import { combineRegions } from "./combineRegions";
import type { ExtractedTable } from "./types";

function table(
  regionId: string,
  cells: ReadonlyArray<readonly string[]>,
): ExtractedTable {
  return {
    regionId,
    cells,
    headerRows: 1,
    flags: [],
    extractedBy: "rules",
    rowProvenance: cells.slice(1).map(() => {
      return { page: 0, bbox: [0, 0, 1, 1] as const };
    }),
  };
}

const DOC = {
  title: "Sudan Cholera Operational Update",
  organisation: "OCHA",
  reportNumber: null,
  publishedAt: "2025-07-03",
};

describe("combineRegions", () => {
  it("unions regions whose headers match", () => {
    const result = combineRegions({
      tables: [
        table("a", [
          ["District", "Cases"],
          ["Gao", "1204"],
        ]),
        table("b", [
          ["District", "Cases"],
          ["Mopti", "987"],
        ]),
      ],
      regionLabels: { a: "Page 4", b: "Page 5" },
      documentMetadata: DOC,
    });

    expect(result.outputMode).toBe("natural");
    expect(result.cells).toEqual([
      ["District", "Cases"],
      ["Gao", "1204"],
      ["Mopti", "987"],
    ]);
  });

  it("treats headers differing only by case or spacing as matching", () => {
    const result = combineRegions({
      tables: [
        table("a", [
          ["District", "Cases"],
          ["Gao", "1204"],
        ]),
        table("b", [
          [" district ", "CASES"],
          ["Mopti", "987"],
        ]),
      ],
      regionLabels: { a: "Page 4", b: "Page 5" },
      documentMetadata: DOC,
    });

    expect(result.outputMode).toBe("natural");
    expect(result.cells).toHaveLength(3);
  });

  it("normalises regions with different headers to observations", () => {
    const result = combineRegions({
      tables: [
        table("map", [
          ["label", "value"],
          ["Khartoum", "408"],
        ]),
        table("kpi", [
          ["label", "value", "unit"],
          ["cases", "83000", "n"],
        ]),
      ],
      regionLabels: { map: "Deaths by state", kpi: "Headline figures" },
      documentMetadata: DOC,
    });

    expect(result.outputMode).toBe("observations");
    expect(result.cells[0]).toEqual([
      "subject",
      "metric",
      "value",
      "unit",
      "period",
      "page",
      "region_label",
      "confidence",
      "extracted_by",
      "source_text",
      "doc_title",
      "doc_org",
      "doc_date",
      "doc_report_no",
    ]);
  });

  it("carries document metadata onto every observation row", () => {
    // This is the join key that lets sitrep #1 and #2 stack.
    const result = combineRegions({
      tables: [
        table("map", [
          ["label", "value"],
          ["Khartoum", "408"],
        ]),
        table("kpi", [
          ["a", "b", "c"],
          ["1", "2", "3"],
        ]),
      ],
      regionLabels: { map: "m", kpi: "k" },
      documentMetadata: DOC,
    });

    for (const row of result.cells.slice(1)) {
      expect(row).toContain("Sudan Cholera Operational Update");
      expect(row).toContain("2025-07-03");
    }
  });

  it("keeps a single region in its natural schema", () => {
    const result = combineRegions({
      tables: [
        table("a", [
          ["District", "Cases"],
          ["Gao", "1204"],
        ]),
      ],
      regionLabels: { a: "Table" },
      documentMetadata: DOC,
    });

    expect(result.outputMode).toBe("natural");
    expect(result.cells[0]).toEqual(["District", "Cases"]);
  });

  it("honours an explicit observations request for one region", () => {
    const result = combineRegions({
      tables: [
        table("a", [
          ["label", "value"],
          ["Khartoum", "408"],
        ]),
      ],
      regionLabels: { a: "Deaths" },
      documentMetadata: DOC,
      outputMode: "observations",
    });

    expect(result.outputMode).toBe("observations");
  });

  it("marks a flagged row's confidence as needing review", () => {
    const flagged: ExtractedTable = {
      ...table("a", [
        ["label", "value"],
        ["Khartoum", "408"],
      ]),
      flags: [
        {
          rowIndex: 0,
          columnIndex: 0,
          reason: "ambiguous_association",
          detail: "near tie",
        },
      ],
    };

    const result = combineRegions({
      tables: [
        flagged,
        table("b", [
          ["x", "y", "z"],
          ["1", "2", "3"],
        ]),
      ],
      regionLabels: { a: "m", b: "k" },
      documentMetadata: DOC,
    });

    const confidenceIndex = result.cells[0]!.indexOf("confidence");
    expect(result.cells[1]![confidenceIndex]).toBe("review");
  });

  it("returns an empty result for no tables", () => {
    const result = combineRegions({
      tables: [],
      regionLabels: {},
      documentMetadata: DOC,
    });

    expect(result.cells).toEqual([]);
  });
});
