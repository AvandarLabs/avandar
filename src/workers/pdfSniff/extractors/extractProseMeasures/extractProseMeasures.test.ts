import { describe, expect, it } from "vitest";
import { extractProseMeasures } from "./extractProseMeasures";
import type { RegionGeometry, TextItem } from "../../pdfSniff.types";

function lines(texts: readonly string[]): TextItem[] {
  return texts.map((text, index) => {
    return {
      text,
      x: 100,
      y: 600 - index * 20,
      width: text.length * 4,
      height: 9,
      fontName: "body",
      unmappedCharRatio: 0,
    };
  });
}

function region(texts: readonly string[]): RegionGeometry {
  return {
    pageIndex: 0,
    bbox: [0, 0, 600, 700],
    textItems: lines(texts),
    rules: [],
  };
}

describe("extractProseMeasures", () => {
  it("produces one row per measurement", () => {
    const result = extractProseMeasures(
      region(["In June, 21,563 cases and 388 deaths were reported."]),
      { regionId: "r1" },
    );

    expect(result.cells[0]).toEqual([
      "subject",
      "metric",
      "value",
      "unit",
      "source_text",
    ]);
    expect(result.cells).toHaveLength(3);
  });

  it("joins a sentence that wraps across lines", () => {
    // Line breaks are a layout artefact. Splitting on them would cut
    // sentences in half and lose the trailing subject clause entirely.
    const result = extractProseMeasures(
      region(["There were 166 cases and 13 deaths", "in South Darfur."]),
      { regionId: "r1" },
    );

    expect(result.cells[1]![0]).toBe("South Darfur");
  });

  it("reports a coverage flag when many numerals went unread", () => {
    // The signal Task 18 uses to decide whether to offer the model. A region
    // dense with numbers that yielded almost nothing is exactly the case
    // rules handle badly.
    const result = extractProseMeasures(
      region([
        "Between 12 and 15, then 18, 21, 24, 27, 30, 33, 36, 39, 42 and 45.",
      ]),
      { regionId: "r1" },
    );

    expect(
      result.flags.some((f) => {
        return f.detail.includes("numbers in this region");
      }),
    ).toBe(true);
  });

  it("does not flag coverage when it read most of the numbers", () => {
    const result = extractProseMeasures(
      region(["We recorded 12 cases and 3 deaths."]),
      { regionId: "r1" },
    );

    expect(result.flags).toEqual([]);
  });

  it("returns an empty table for prose with no measurements", () => {
    const result = extractProseMeasures(
      region(["The outbreak remains widespread and severe."]),
      { regionId: "r1" },
    );

    expect(result.cells).toEqual([]);
  });
});
