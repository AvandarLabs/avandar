import { describe, expect, it } from "vitest";
import { clipToRegion } from "./clipToRegion";
import type { PageGeometry, TextItem } from "../pdfSniff.types";

function textItem(text: string, x: number, y: number, width = 30): TextItem {
  return {
    text,
    x,
    y,
    width,
    height: 10,
    fontName: "f1",
    unmappedCharRatio: 0,
  };
}

function page(): PageGeometry {
  return {
    pageIndex: 0,
    width: 595,
    height: 842,
    looksScanned: false,
    rules: [
      { orientation: "horizontal", position: 500, span: [100, 400] },
      { orientation: "horizontal", position: 200, span: [100, 400] },
    ],
    marks: [],
    marksTruncated: false,
    textItems: [
      textItem("inside", 150, 450),
      textItem("also-inside", 300, 400),
      textItem("above", 150, 700),
      textItem("below", 150, 100),
      textItem("left", 20, 450),
      textItem("right", 550, 450),
    ],
  };
}

describe("clipToRegion", () => {
  it("keeps only items whose centre is inside the box", () => {
    const clipped = clipToRegion({ page: page(), bbox: [100, 300, 500, 600] });

    expect(
      clipped.textItems
        .map((i) => {
          return i.text;
        })
        .sort(),
    ).toEqual(["also-inside", "inside"]);
  });

  it("keeps rules that overlap the box", () => {
    const clipped = clipToRegion({ page: page(), bbox: [100, 300, 500, 600] });

    expect(clipped.rules).toHaveLength(1);
    expect(clipped.rules[0]!.position).toBe(500);
  });

  it("reports the region's own bbox and origin page", () => {
    const clipped = clipToRegion({ page: page(), bbox: [100, 300, 500, 600] });

    expect(clipped.bbox).toEqual([100, 300, 500, 600]);
    expect(clipped.pageIndex).toBe(0);
  });

  it("keeps an item straddling the edge when most of it is inside", () => {
    // A user drawing a box will rarely land exactly on a glyph boundary.
    // Dropping a mostly-inside item loses a value the user clearly meant to
    // include; keeping a mostly-outside one drags in a neighbouring column.
    const straddling: PageGeometry = {
      ...page(),
      textItems: [textItem("mostly-in", 480, 450, 40)],
    };

    const clipped = clipToRegion({
      page: straddling,
      bbox: [100, 300, 505, 600],
    });

    expect(clipped.textItems).toHaveLength(1);
  });

  it("drops an item mostly outside the edge", () => {
    const straddling: PageGeometry = {
      ...page(),
      textItems: [textItem("mostly-out", 480, 450, 40)],
    };

    const clipped = clipToRegion({
      page: straddling,
      bbox: [100, 300, 490, 600],
    });

    expect(clipped.textItems).toHaveLength(0);
  });

  it("returns empty geometry for a box over blank space", () => {
    const clipped = clipToRegion({ page: page(), bbox: [0, 0, 10, 10] });

    expect(clipped.textItems).toEqual([]);
    expect(clipped.rules).toEqual([]);
    expect(clipped.marks).toEqual([]);
  });

  it("keeps marks whose box overlaps the region", () => {
    const withMarks: PageGeometry = {
      ...page(),
      marks: [
        {
          kind: "closed",
          points: [
            { x: 150, y: 400 },
            { x: 200, y: 450 },
          ],
          bbox: [150, 400, 200, 450],
          isFilled: true,
          fill: null,
        },
        {
          kind: "polyline",
          points: [
            { x: 10, y: 10 },
            { x: 20, y: 20 },
          ],
          bbox: [10, 10, 20, 20],
          isFilled: false,
          fill: null,
        },
      ],
    };

    const clipped = clipToRegion({
      page: withMarks,
      bbox: [100, 300, 500, 600],
    });

    expect(clipped.marks).toHaveLength(1);
    expect(clipped.marks[0]!.bbox).toEqual([150, 400, 200, 450]);
  });
});
