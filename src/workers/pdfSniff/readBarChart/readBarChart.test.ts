import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { clipToRegion } from "../clipToRegion/clipToRegion";
import { extractPageGeometry } from "../extractPageGeometry/extractPageGeometry";
import { loadPdfDocument } from "../loadPdfDocument/loadPdfDocument";
import { readBarChart } from "./readBarChart";
import type {
  BBox,
  ExtractedTable,
  PageGeometry,
  PathMark,
  RegionGeometry,
  RuleSegment,
  TextItem,
} from "../pdfSniff.types";

const OCHA =
  "public/test-data/pdf/gate/ocha-sudan-cholera-update-2025-07-03.pdf";
const OCHA_BARS: BBox = [300, 300, 570, 440];

function rect(bbox: BBox): PathMark {
  return {
    kind: "closed",
    points: [
      { x: bbox[0], y: bbox[1] },
      { x: bbox[2], y: bbox[1] },
      { x: bbox[2], y: bbox[3] },
      { x: bbox[0], y: bbox[3] },
    ],
    bbox,
    isFilled: true,
    fill: null,
  };
}

function text(value: string, x: number, y: number): TextItem {
  return {
    text: value,
    x,
    y,
    width: value.length * 4,
    height: 8,
    fontName: "f1",
    unmappedCharRatio: 0,
  };
}

function region(parts: {
  marks: readonly PathMark[];
  textItems?: readonly TextItem[];
  rules?: readonly RuleSegment[];
  bbox?: BBox;
}): RegionGeometry {
  return {
    pageIndex: 0,
    bbox: parts.bbox ?? [0, 0, 200, 200],
    textItems: parts.textItems ?? [],
    rules: parts.rules ?? [],
    marks: parts.marks,
  };
}

function dataRows(table: ExtractedTable): ReadonlyArray<readonly string[]> {
  return table.cells.slice(table.headerRows);
}

async function pageOf(path: string, pageNumber: number): Promise<PageGeometry> {
  const bytes = await readFile(path);
  const doc = await loadPdfDocument(new Uint8Array(bytes));
  const page = await doc.getPage(pageNumber);
  const geometry = await extractPageGeometry({
    page,
    pageIndex: pageNumber - 1,
  });
  await doc.destroy();
  return geometry;
}

describe("readBarChart", () => {
  it("returns undefined when the region draws no bars", () => {
    expect(
      readBarChart(region({ marks: [] }), { regionId: "r" }),
    ).toBeUndefined();
  });

  it("returns undefined when nothing calibrates the value axis", () => {
    // Three bars and not one figure or tick anywhere: their lengths are in
    // some unit we cannot name, so there is nothing honest to report.
    expect(
      readBarChart(
        region({
          marks: [
            rect([10, 20, 40, 30]),
            rect([10, 40, 70, 50]),
            rect([10, 60, 100, 70]),
          ],
          textItems: [text("Alpha", 1, 21), text("Beta", 1, 41)],
        }),
        { regionId: "r" },
      ),
    ).toBeUndefined();
  });

  it("reads an unlabelled bar off the scale the labelled ones set", () => {
    // 10pt per unit: the middle bar prints nothing and is 60pt long.
    const table = readBarChart(
      region({
        marks: [
          rect([10, 20, 40, 30]),
          rect([10, 40, 70, 50]),
          rect([10, 60, 100, 70]),
        ],
        textItems: [
          text("Alpha", 105, 61),
          text("9", 130, 61),
          text("Beta", 75, 41),
          text("Gamma", 45, 21),
          text("3", 60, 21),
        ],
      }),
      { regionId: "r" },
    );
    expect(dataRows(table!)).toEqual([
      ["Alpha", "9"],
      ["Beta", "6"],
      ["Gamma", "3"],
    ]);
    // Only what the chart printed carries the chart's own unit; the read
    // value is a bare count because the scale says nothing about units.
    expect(table?.rowUnits).toEqual(["n", "n", "n"]);
    expect(table?.flags).toEqual([]);
  });

  it("says so when the bars do not all sit on one scale", () => {
    // Alpha is drawn at 9 units and printed as 20, so no straight line fits
    // all three. Which of the three labels is the wrong one is not knowable
    // from the chart, and least squares spreads the error across all of them,
    // so this is reported once about the region rather than pinned on a row.
    const table = readBarChart(
      region({
        marks: [
          rect([10, 20, 40, 30]),
          rect([10, 40, 70, 50]),
          rect([10, 60, 100, 70]),
        ],
        textItems: [
          text("Alpha", 105, 61),
          text("20", 130, 61),
          text("Beta", 75, 41),
          text("6", 80, 41),
          text("Gamma", 45, 21),
          text("3", 60, 21),
        ],
      }),
      { regionId: "r" },
    );
    // The printed figures are still what is reported. We are saying the chart
    // disagrees with itself, not overwriting the document with arithmetic.
    expect(dataRows(table!)).toEqual([
      ["Alpha", "20"],
      ["Beta", "6"],
      ["Gamma", "3"],
    ]);
    expect(
      table?.flags.map((flag) => {
        return [flag.rowIndex, flag.reason];
      }),
    ).toEqual([[-1, "high_residual"]]);
  });

  it("calibrates columns against the numeric ticks on a framed plot", () => {
    // A column chart with a y-axis: 0 at y 20 and 100 at y 120, so the
    // 60pt-tall column reads 60. None of the columns prints a figure, and the
    // two tick labels must not become a row of their own.
    const table = readBarChart(
      region({
        bbox: [0, 0, 200, 160],
        marks: [
          rect([40, 20, 60, 50]),
          rect([70, 20, 90, 80]),
          rect([100, 20, 120, 40]),
        ],
        rules: [
          { orientation: "horizontal", position: 20, span: [30, 180] },
          { orientation: "vertical", position: 30, span: [20, 140] },
        ],
        textItems: [
          text("0", 20, 20),
          text("100", 14, 120),
          text("Jan", 42, 10),
          text("Feb", 72, 10),
          text("Mar", 102, 10),
        ],
      }),
      { regionId: "r" },
    );
    expect(dataRows(table!)).toEqual([
      ["Jan", "30"],
      ["Feb", "60"],
      ["Mar", "20"],
    ]);
    expect(table?.chartAxis).toMatchObject({ min: 0, max: 100, tickCount: 2 });
  });

  it("prefers the user's two points over everything the chart prints", () => {
    // The same three bars, told that x 10 is 0 and x 110 is 50: the reading
    // halves, and the printed 9 stops agreeing with its bar.
    const table = readBarChart(
      region({
        marks: [
          rect([10, 20, 40, 30]),
          rect([10, 40, 70, 50]),
          rect([10, 60, 100, 70]),
        ],
        textItems: [text("Alpha", 105, 61), text("9", 130, 61)],
      }),
      {
        regionId: "r",
        valueAxisHints: [
          { position: 10, value: 0 },
          { position: 110, value: 50 },
        ],
      },
    );
    expect(dataRows(table!)).toEqual([
      ["Alpha", "9"],
      ["", "30"],
      ["", "15"],
    ]);
    expect(
      table?.flags.map((flag) => {
        return flag.reason;
      }),
    ).toEqual(["high_residual", "unmatched_label", "unmatched_label"]);
  });

  it("reads the six OCHA funding pillars with no near-ties left", async () => {
    const table = readBarChart(
      clipToRegion({ page: await pageOf(OCHA, 3), bbox: OCHA_BARS }),
      { regionId: "bars" },
    );
    expect(dataRows(table!)).toEqual([
      ["WASH", "3000000"],
      ["Health", "2000000"],
      ["RCCE", "1000000"],
      ["Log and Supply", "1000000"],
      ["Coordination", "1000000"],
      ["Others", "0"],
    ]);
    expect(table?.flags).toEqual([]);
  });
});
