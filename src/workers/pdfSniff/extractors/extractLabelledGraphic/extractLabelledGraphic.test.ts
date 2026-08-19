import { describe, expect, it } from "vitest";
import { extractLabelledGraphic } from "./extractLabelledGraphic";
import type { RegionGeometry, TextItem } from "../../pdfSniff.types";

function item(text: string, x: number, y: number, width?: number): TextItem {
  return {
    text,
    x,
    y,
    width: width ?? text.length * 5,
    height: 8,
    fontName: "f1",
    unmappedCharRatio: 0,
  };
}

function region(textItems: readonly TextItem[]): RegionGeometry {
  return { pageIndex: 0, bbox: [0, 0, 600, 600], textItems, rules: [] };
}

describe("extractLabelledGraphic", () => {
  it("produces a two-column label-and-value table", () => {
    const result = extractLabelledGraphic(
      region([
        item("KHARTOUM", 480, 302, 45),
        item("408", 490, 292, 15),
        item("KASSALA", 560, 402, 40),
        item("200", 566, 392, 15),
      ]),
      { regionId: "r1" },
    );

    expect(result.cells[0]).toEqual(["label", "value"]);
    expect(result.headerRows).toBe(1);
    expect(result.cells.slice(1)).toEqual([
      ["KHARTOUM", "408"],
      ["KASSALA", "200"],
    ]);
  });

  it("normalises values through normalizeCellValue", () => {
    const result = extractLabelledGraphic(
      region([item("WASH", 100, 300, 25), item("$3,000", 100, 290, 30)]),
      { regionId: "r1" },
    );

    expect(result.cells[1]).toEqual(["WASH", "3000"]);
  });

  it("flags an ambiguous pair with its position", () => {
    // 83 sits between RIVER NILE and RED SEA, 36.5 points from the winner
    // and 38.5 from the runner-up, reproducing the near-tie measured during
    // design. The two labels have to stand well apart or assembleLabels
    // rightly reads them as one wrapped name and there is no runner-up left
    // to be ambiguous with. 12 belongs unambiguously to RED SEA and is here
    // so that no label is left over: an unmatched label carries a flag of
    // its own, which would drown out the one under test.
    const result = extractLabelledGraphic(
      region([
        item("RIVER NILE", 440, 289, 45),
        item("RED SEA", 520, 289, 35),
        item("83", 493, 289, 12),
        item("12", 595, 289, 10),
      ]),
      { regionId: "r1" },
    );

    expect(result.flags).toHaveLength(1);
    expect(result.flags[0]!.reason).toBe("ambiguous_association");
    expect(result.flags[0]!.rowIndex).toBe(0);
  });

  it("keeps an unmatched label as a row with an empty value", () => {
    // Dropping it would quietly shrink the dataset. A reviewer needs to see
    // that we found the label and no figure for it.
    const result = extractLabelledGraphic(
      region([
        item("KHARTOUM", 480, 302, 45),
        item("408", 490, 292, 15),
        item("ABYEI", 100, 100, 25),
      ]),
      { regionId: "r1" },
    );

    expect(result.cells).toContainEqual(["ABYEI", ""]);
    expect(
      result.flags.some((f) => {
        return f.reason === "unmatched_label";
      }),
    ).toBe(true);
  });

  it("treats a legend's bin boundaries as values, not labels", () => {
    // Documented failure from design: a region that includes the choropleth
    // legend reads 10, 500, 1,000 as state data. A user-drawn box excludes
    // the legend, but when it does not, the run of bare numbers with no
    // nearby label must surface as unmatched rather than be paired to
    // whatever state happens to be closest.
    const result = extractLabelledGraphic(
      region([
        item("KHARTOUM", 480, 302, 45),
        item("408", 490, 292, 15),
        item("10", 100, 50, 10),
        item("500", 140, 50, 15),
        item("1,000", 180, 50, 20),
      ]),
      { regionId: "r1" },
    );

    expect(
      result.flags.filter((f) => {
        return f.reason === "unmatched_value";
      }),
    ).toHaveLength(3);
  });

  it("reads a figure printed as a number, a suffix and a share", () => {
    // The OCHA funding bar, item for item. Before unit-aware assembly the
    // "M (15%)" became a label, took the 3 for itself, and left WASH empty.
    const result = extractLabelledGraphic(
      region([
        item("WASH", 334.34, 426.04, 16.44),
        item("3", 513.06, 425.9, 3.63),
        item("M", 516.7, 425.9, 5.42),
        item(" ", 522.11, 425.9, 0.23),
        item("(15%)", 523.77, 425.9, 15.78),
      ]),
      { regionId: "r1" },
    );

    expect(result.cells.slice(1)).toEqual([["WASH", "3000000"]]);
    expect(result.rowUnits).toEqual(["n"]);
  });

  it("reports each row's unit beside the cells, never as a column", () => {
    // A map table is [label, value]. A unit column there is noise; the unit
    // still has to reach observations mode, which is what `rowUnits` is for.
    const result = extractLabelledGraphic(
      region([
        item("CFR", 100, 300, 20),
        item("2.6%", 100, 290, 20),
        item("CASES", 300, 300, 30),
        item("83,000", 300, 290, 30),
      ]),
      { regionId: "r1" },
    );

    expect(result.cells[0]).toEqual(["label", "value"]);
    expect(Object.fromEntries(result.cells.slice(1))).toEqual({
      CFR: "2.6",
      CASES: "83000",
    });
    expect(result.rowUnits).toEqual(["percent", "n"]);
  });

  it("has no unit for a label it found no figure for", () => {
    const result = extractLabelledGraphic(
      region([
        item("KHARTOUM", 480, 302, 45),
        item("408", 490, 292, 15),
        item("ABYEI", 100, 100, 25),
      ]),
      { regionId: "r1" },
    );

    // Parallel to the data rows, exactly like `rowProvenance`.
    expect(result.rowUnits).toHaveLength(result.cells.length - 1);
    expect(result.rowUnits).toEqual(["n", undefined]);
  });

  it("records row provenance for the page overlay", () => {
    const result = extractLabelledGraphic(
      region([item("KHARTOUM", 480, 302, 45), item("408", 490, 292, 15)]),
      { regionId: "r1" },
    );

    expect(result.rowProvenance).toHaveLength(1);
    expect(result.rowProvenance[0]!.page).toBe(0);
  });

  it("reports rules-based extraction", () => {
    const result = extractLabelledGraphic(
      region([item("A", 100, 300, 10), item("1", 100, 290, 10)]),
      { regionId: "r1" },
    );

    expect(result.extractedBy).toBe("rules");
  });
});
