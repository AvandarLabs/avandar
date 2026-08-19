import { describe, expect, it } from "vitest";
import { combineRegions } from "./combineRegions";
import type { CombinedTable } from "./combineRegions";
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

  /**
   * The spec's rule for this shape: "Selecting the OCHA pillars in
   * observations mode contributes their embedded figures (573, subject
   * Surveillance, early detection and case management) and drops the prose."
   *
   * Mapping the first field's paragraph into `value` instead would put a
   * sentence in a numeric column, which is a column that lies.
   */
  const PILLAR_HEADER = ["number", "heading", "Responses", "Challenges"];

  /** Looks a column up by name, as the review grid would. */
  function columnOf(result: CombinedTable, name: string): number {
    const index = result.cells[0]!.indexOf(name);
    expect(index).toBeGreaterThanOrEqual(0);
    return index;
  }

  /** Combines a pillars row with an unrelated region, forcing observations. */
  function pillarsWith(pillarRow: readonly string[]): CombinedTable {
    const result = combineRegions({
      tables: [
        table("pillars", [PILLAR_HEADER, pillarRow]),
        table("kpi", [
          ["label", "value"],
          ["Cases", "83000"],
        ]),
      ],
      regionLabels: { pillars: "Response pillars", kpi: "Headline figures" },
      documentMetadata: DOC,
    });

    expect(result.outputMode).toBe("observations");
    return result;
  }

  function rowsFromPillars(
    result: CombinedTable,
  ): ReadonlyArray<readonly string[]> {
    const labelIndex = columnOf(result, "region_label");
    return result.cells.slice(1).filter((row) => {
      return row[labelIndex] === "Response pillars";
    });
  }

  it("mines figures out of repeating-blocks prose rather than putting a paragraph in the value column", () => {
    const sentence =
      "To strengthen surveillance, WHO has expanded EWARS to 573 health " +
      "facilities.";
    const result = pillarsWith([
      "1",
      "Surveillance, early detection and case management",
      sentence,
      "Reporting delays continue to hinder timely confirmation of cases.",
    ]);
    const pillarRows = rowsFromPillars(result);

    expect(pillarRows).toHaveLength(1);
    expect(pillarRows[0]![columnOf(result, "subject")]).toBe(
      "Surveillance, early detection and case management",
    );
    expect(pillarRows[0]![columnOf(result, "metric")]).toBe(
      "health facilities",
    );
    expect(pillarRows[0]![columnOf(result, "value")]).toBe("573");
    expect(pillarRows[0]![columnOf(result, "unit")]).toBe("n");
    expect(pillarRows[0]![columnOf(result, "source_text")]).toBe(sentence);
  });

  it("prefers a measurement's own subject to the row's heading", () => {
    const result = pillarsWith([
      "1",
      "Surveillance, early detection and case management",
      "To strengthen surveillance, WHO has expanded EWARS to 573 health " +
        "facilities in Darfur.",
      "No figures in this field.",
    ]);
    const pillarRows = rowsFromPillars(result);

    expect(pillarRows).toHaveLength(1);
    expect(pillarRows[0]![columnOf(result, "subject")]).toBe("Darfur");
    expect(pillarRows[0]![columnOf(result, "value")]).toBe("573");
  });

  it("drops a repeating-blocks row whose prose carries no figures", () => {
    const result = pillarsWith([
      "2",
      "Community engagement",
      "Partners continued to hold listening sessions with affected residents.",
      "Reporting delays continue to hinder timely confirmation.",
    ]);

    expect(rowsFromPillars(result)).toEqual([]);
    // The other region still contributes, so this is one dropped row rather
    // than a combine that gave up.
    expect(result.cells).toHaveLength(2);
  });

  it("leaves a row whose value is already numeric on the direct path", () => {
    const result = combineRegions({
      tables: [
        table("map", [
          ["label", "value"],
          ["Khartoum", "408"],
        ]),
        table("kpi", [
          ["label", "value", "unit"],
          ["Case fatality rate", "2.6", "percent"],
        ]),
      ],
      regionLabels: { map: "Deaths by state", kpi: "Headline figures" },
      documentMetadata: DOC,
    });

    expect(result.cells).toHaveLength(3);
    expect(result.cells[1]![columnOf(result, "subject")]).toBe("Khartoum");
    expect(result.cells[1]![columnOf(result, "value")]).toBe("408");
    expect(result.cells[1]![columnOf(result, "unit")]).toBe("n");
    expect(result.cells[2]![columnOf(result, "value")]).toBe("2.6");
    expect(result.cells[2]![columnOf(result, "unit")]).toBe("percent");
  });

  it("reads a row's unit from the table's parallel metadata", () => {
    // A labelled graphic's natural schema is [label, value]: a `unit` column
    // there would be noise the document never printed. Observations mode
    // still has to tell 2.6% from a count of 2.6, so the unit rides beside
    // the cells instead.
    const tiles: ExtractedTable = {
      ...table("tiles", [
        ["label", "value"],
        ["Cases", "83000"],
        ["Case fatality rate", "2.6"],
      ]),
      rowUnits: ["n", "percent"],
    };

    const result = combineRegions({
      tables: [
        tiles,
        table("x", [
          ["a", "b", "c"],
          ["1", "2", "3"],
        ]),
      ],
      regionLabels: { tiles: "Headline figures", x: "Other" },
      documentMetadata: DOC,
    });

    expect(result.cells[1]![columnOf(result, "value")]).toBe("83000");
    expect(result.cells[1]![columnOf(result, "unit")]).toBe("n");
    expect(result.cells[2]![columnOf(result, "value")]).toBe("2.6");
    expect(result.cells[2]![columnOf(result, "unit")]).toBe("percent");
  });

  it("keeps units out of natural mode entirely", () => {
    const map: ExtractedTable = {
      ...table("a", [
        ["label", "value"],
        ["Khartoum", "408"],
      ]),
      rowUnits: ["n"],
    };

    const result = combineRegions({
      tables: [map],
      regionLabels: { a: "Deaths by state" },
      documentMetadata: DOC,
    });

    expect(result.outputMode).toBe("natural");
    expect(result.cells).toEqual([
      ["label", "value"],
      ["Khartoum", "408"],
    ]);
  });

  it("still falls back to a bare count where no unit was read", () => {
    const result = combineRegions({
      tables: [
        table("map", [
          ["label", "value"],
          ["Khartoum", "408"],
        ]),
        table("x", [
          ["a", "b", "c"],
          ["1", "2", "3"],
        ]),
      ],
      regionLabels: { map: "Deaths by state", x: "Other" },
      documentMetadata: DOC,
    });

    expect(result.cells[1]![columnOf(result, "unit")]).toBe("n");
  });

  it("lets a region's own unit column win over the parallel metadata", () => {
    // `extractProseMeasures` names a unit per row in its own schema. Nothing
    // should be able to overrule the extractor that read the sentence.
    const prose: ExtractedTable = {
      ...table("prose", [
        ["subject", "metric", "value", "unit", "source_text"],
        ["Sudan", "case fatality rate", "2.6", "percent", "..."],
      ]),
      rowUnits: ["n"],
    };

    const result = combineRegions({
      tables: [
        prose,
        table("x", [
          ["a", "b", "c"],
          ["1", "2", "3"],
        ]),
      ],
      regionLabels: { prose: "Situation update", x: "Other" },
      documentMetadata: DOC,
    });

    expect(result.cells[1]![columnOf(result, "unit")]).toBe("percent");
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
