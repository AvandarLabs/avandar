import { describe, expect, it } from "vitest";
import { makeRatePlotPointsFromRows } from "./makeRatePlotPointsFromRows";
import type { RatePlotPoint, RatePlotSort } from "./makeRatePlotPointsFromRows";
import type { PluginVizInput } from "@avandar/plugin-sdk";

function _makePoints(options: {
  rows: PluginVizInput["rows"];
  hasBounds?: boolean;
  sort?: RatePlotSort;
}): RatePlotPoint[] {
  const hasBounds = options.hasBounds ?? true;
  return makeRatePlotPointsFromRows({
    rows: options.rows,
    labelColumn: "borough",
    rateColumn: "rate",
    lowerColumn: hasBounds ? "lower" : undefined,
    upperColumn: hasBounds ? "upper" : undefined,
    sort: options.sort ?? "rate",
  });
}

function _getLabels(points: readonly RatePlotPoint[]): string[] {
  return points.map((point) => {
    return point.label;
  });
}

describe("makeRatePlotPointsFromRows", () => {
  it("makes one point per row with its label, rate, and bounds", () => {
    expect(
      _makePoints({
        rows: [{ borough: "Bronx", rate: 12.4, lower: 9.8, upper: 15.6 }],
      }),
    ).toEqual([{ label: "Bronx", rate: 12.4, lower: 9.8, upper: 15.6 }]);
  });

  it("converts numeric text and bigints in the rate and bounds", () => {
    expect(
      _makePoints({
        rows: [{ borough: "Queens", rate: "8", lower: 6n, upper: " 10 " }],
      }),
    ).toEqual([{ label: "Queens", rate: 8, lower: 6, upper: 10 }]);
  });

  it("skips rows whose rate is not a number", () => {
    const points = _makePoints({
      rows: [
        { borough: "Bronx", rate: 12.4 },
        { borough: "Queens", rate: null },
        { borough: "Brooklyn", rate: "n/a" },
        { borough: "Manhattan", rate: "" },
        { borough: "Staten Island" },
      ],
    });
    expect(_getLabels(points)).toEqual(["Bronx"]);
  });

  it("leaves a bound undefined when its value is not a number", () => {
    expect(
      _makePoints({
        rows: [{ borough: "Bronx", rate: 12.4, lower: null, upper: 15.6 }],
      }),
    ).toEqual([{ label: "Bronx", rate: 12.4, lower: undefined, upper: 15.6 }]);
  });

  it("leaves both bounds undefined when their columns are not set", () => {
    expect(
      _makePoints({
        rows: [{ borough: "Bronx", rate: 12.4, lower: 9.8, upper: 15.6 }],
        hasBounds: false,
      }),
    ).toEqual([
      { label: "Bronx", rate: 12.4, lower: undefined, upper: undefined },
    ]);
  });

  it("writes a missing label as empty text", () => {
    const points = _makePoints({ rows: [{ borough: null, rate: 1 }] });
    expect(_getLabels(points)).toEqual([""]);
  });

  it("sorts by rate from highest to lowest", () => {
    const points = _makePoints({
      rows: [
        { borough: "Bronx", rate: 8 },
        { borough: "Queens", rate: 15 },
        { borough: "Brooklyn", rate: 11 },
      ],
      sort: "rate",
    });
    expect(_getLabels(points)).toEqual(["Queens", "Brooklyn", "Bronx"]);
  });

  it("sorts by label from A to Z", () => {
    const points = _makePoints({
      rows: [
        { borough: "Queens", rate: 15 },
        { borough: "Bronx", rate: 8 },
        { borough: "Brooklyn", rate: 11 },
      ],
      sort: "label",
    });
    expect(_getLabels(points)).toEqual(["Bronx", "Brooklyn", "Queens"]);
  });
});
