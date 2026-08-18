import { describe, expect, it } from "vitest";
import { classifyRegion } from "./classifyRegion";
import type { RegionGeometry, RuleSegment, TextItem } from "./types";

function item(text: string, x: number, y: number, fontName = "body"): TextItem {
  return {
    text,
    x,
    y,
    width: text.length * 5,
    height: 9,
    fontName,
    unmappedCharRatio: 0,
  };
}

function region(
  textItems: readonly TextItem[],
  rules: readonly RuleSegment[] = [],
): RegionGeometry {
  return { pageIndex: 0, bbox: [0, 0, 600, 700], textItems, rules };
}

describe("classifyRegion", () => {
  it("calls a ruled region a grid table", () => {
    const result = classifyRegion(
      region(
        [
          item("District", 100, 600),
          item("Cases", 250, 600),
          item("Gao", 100, 580),
          item("1204", 250, 580),
        ],
        [
          { orientation: "horizontal", position: 590, span: [90, 400] },
          { orientation: "horizontal", position: 570, span: [90, 400] },
          { orientation: "vertical", position: 240, span: [560, 610] },
        ],
      ),
    );

    expect(result.shape).toBe("grid_table");
    expect(result.evidence.join(" ")).toMatch(/ruling lines/i);
  });

  it("calls scattered short labels and numbers a labelled graphic", () => {
    const result = classifyRegion(
      region([
        item("KHARTOUM", 480, 302),
        item("408", 490, 292),
        item("KASSALA", 560, 402),
        item("200", 566, 392),
        item("SENNAR", 300, 500),
        item("202", 306, 490),
      ]),
    );

    expect(result.shape).toBe("labelled_graphic");
    expect(result.evidence.join(" ")).toMatch(/no ruling lines/i);
  });

  it("calls run-in labels repeating blocks", () => {
    const result = classifyRegion(
      region([
        item("1. Surveillance", 100, 500, "bold"),
        item("Responses: To strengthen surveillance work", 100, 480),
        item("Challenges: Reporting delays hinder things", 100, 460),
      ]),
    );

    expect(result.shape).toBe("repeating_blocks");
  });

  it("calls running sentences prose measures", () => {
    const result = classifyRegion(
      region([
        item(
          "In June, 21,563 cases and 388 deaths have been reported across",
          100,
          600,
        ),
        item(
          "the state, including 13 suspected cases in West Darfur.",
          100,
          580,
        ),
      ]),
    );

    expect(result.shape).toBe("prose_measures");
  });

  it("reports low confidence when the region is ambiguous", () => {
    const result = classifyRegion(region([item("Something", 100, 600)]));

    expect(result.confidence).toBe("low");
  });

  it("always returns at least one line of evidence", () => {
    const result = classifyRegion(region([item("x", 1, 1)]));

    expect(result.evidence.length).toBeGreaterThan(0);
  });
});
