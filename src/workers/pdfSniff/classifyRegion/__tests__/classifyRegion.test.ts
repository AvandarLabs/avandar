import type {
  RegionGeometry,
  RuleSegment,
  TextItem,
} from "../../pdfSniff.types";

import { describe, expect, it } from "vitest";

import { classifyRegion } from "../classifyRegion";

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
  return { pageIndex: 0, bbox: [0, 0, 600, 700], textItems, rules, marks: [] };
}

describe("classifyRegion", () => {
  it("calls a ruled region whose text lines up a grid table", () => {
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
    expect(result.confidence).toBe("high");
    expect(result.evidence.join(" ")).toMatch(/ruling lines/i);
    expect(result.evidence.join(" ")).toMatch(/2 columns/i);
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
    expect(result.evidence.join(" ")).toMatch(
      /scattered rather than tabulated/i,
    );
    // No marks, so nothing says what it was drawn as. The import UI reads this
    // to decide whether to call the region a chart or only a graphic.
    expect(result.graphicKind).toBe("unknown");
  });

  it("does not call a ruled graphic a grid table", () => {
    // The choropleth's shape, in miniature: a frame and a graticule reach the
    // geometry as ruling lines, but the labels they surround are scattered
    // across the map rather than lined up in columns. Rules alone used to be
    // enough for `grid_table`, and `extractGridTable` then returned no rows
    // at all for exactly this region.
    const result = classifyRegion(
      region(
        [
          item("KHARTOUM", 480, 302),
          item("408", 490, 292),
          item("KASSALA", 560, 402),
          item("200", 566, 392),
          item("SENNAR", 300, 500),
          item("202", 306, 490),
        ],
        [
          { orientation: "horizontal", position: 590, span: [40, 560] },
          { orientation: "horizontal", position: 250, span: [40, 560] },
          { orientation: "horizontal", position: 430, span: [120, 180] },
          { orientation: "vertical", position: 40, span: [250, 590] },
        ],
      ),
    );

    expect(result.shape).toBe("labelled_graphic");
    expect(result.evidence.join(" ")).toMatch(
      /borders or gridlines rather than a table's rules/i,
    );
  });

  it("says why it discounted the ruling lines", () => {
    // The rules are the first thing the user sees in the region, so a verdict
    // that ignores them has to say so or it reads as a mistake.
    const result = classifyRegion(
      region(
        [
          item(
            "In June, 21,563 cases and 388 deaths have been reported across",
            100,
            600,
          ),
          item("the state, including 13 cases in West Darfur.", 100, 580),
        ],
        [
          { orientation: "horizontal", position: 620, span: [90, 500] },
          { orientation: "horizontal", position: 560, span: [90, 500] },
        ],
      ),
    );

    expect(result.shape).toBe("prose_measures");
    expect(result.evidence.join(" ")).toMatch(/2 horizontal ruling lines/i);
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
