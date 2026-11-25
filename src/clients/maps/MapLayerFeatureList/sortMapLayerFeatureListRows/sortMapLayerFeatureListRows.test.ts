import { describe, expect, it } from "vitest";
import { sortMapLayerFeatureListRows } from "./sortMapLayerFeatureListRows";

const ROWS = [
  { name: "P.S. 10", distance: 0.4 },
  { name: "P.S. 9", distance: undefined },
  { name: "P.S. 2", distance: 0.1 },
];

function _getNames(rows: ReadonlyArray<Readonly<Record<string, unknown>>>) {
  return rows.map((row) => {
    return row.name;
  });
}

describe("sortMapLayerFeatureListRows", () => {
  it("orders numbers ascending with blanks last", () => {
    const sorted = sortMapLayerFeatureListRows({
      rows: ROWS,
      sort: { key: "distance", direction: "asc" },
    });

    expect(_getNames(sorted)).toEqual(["P.S. 2", "P.S. 10", "P.S. 9"]);
  });

  it("keeps blanks last when descending", () => {
    const sorted = sortMapLayerFeatureListRows({
      rows: ROWS,
      sort: { key: "distance", direction: "desc" },
    });

    expect(_getNames(sorted)).toEqual(["P.S. 10", "P.S. 2", "P.S. 9"]);
  });

  it("orders text with numbers in natural order", () => {
    const sorted = sortMapLayerFeatureListRows({
      rows: ROWS,
      sort: { key: "name", direction: "asc" },
    });

    expect(_getNames(sorted)).toEqual(["P.S. 2", "P.S. 9", "P.S. 10"]);
  });
});
