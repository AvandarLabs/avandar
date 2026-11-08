import { makePluginTranslator } from "@avandar/plugin-sdk";
import { describe, expect, it } from "vitest";
import englishMessages from "../../../locales/en.json";
import { makeEpicurveFromRows } from "./makeEpicurveFromRows";
import type {
  PluginVizContext,
  PluginVizInput,
  PluginVizTransformResult,
} from "@avandar/plugin-sdk";

const CONTEXT: PluginVizContext = {
  i18n: {
    t: makePluginTranslator({
      locale: "en-US",
      messages: { en: englishMessages },
    }),
  },
  locale: "en-US",
};

function _makeEpicurve(options: {
  rows: PluginVizInput["rows"];
  settings?: PluginVizInput["settings"];
}): PluginVizTransformResult {
  return makeEpicurveFromRows(
    {
      rows: options.rows,
      columns: [
        { name: "onset", dataType: "date" },
        { name: "cases", dataType: "bigint" },
        { name: "status", dataType: "varchar" },
      ],
      settings: { dateColumn: "onset", interval: "day", ...options.settings },
      isTruncated: false,
    },
    CONTEXT,
  );
}

function _makeOnsetRows(onsets: readonly string[]): PluginVizInput["rows"] {
  return onsets.map((onset) => {
    return { onset };
  });
}

describe("makeEpicurveFromRows", () => {
  it("counts one case per row when no count column is set", () => {
    const { rows } = _makeEpicurve({
      rows: _makeOnsetRows(["2021-01-04", "2021-01-04", "2021-01-05"]),
    });
    expect(rows).toEqual([
      { bucket: "2021-01-04", cases: 2 },
      { bucket: "2021-01-05", cases: 1 },
    ]);
  });

  it("sums the count column per bucket", () => {
    const { rows } = _makeEpicurve({
      rows: [
        { onset: "2021-01-04", cases: 3 },
        { onset: "2021-01-04", cases: "2" },
        { onset: "2021-01-05", cases: 4n },
      ],
      settings: { countColumn: "cases" },
    });
    expect(rows).toEqual([
      { bucket: "2021-01-04", cases: 5 },
      { bucket: "2021-01-05", cases: 4 },
    ]);
  });

  it("adds nothing for a row whose count is not a number", () => {
    const { rows } = _makeEpicurve({
      rows: [
        { onset: "2021-01-04", cases: 3 },
        { onset: "2021-01-04", cases: null },
      ],
      settings: { countColumn: "cases" },
    });
    expect(rows).toEqual([{ bucket: "2021-01-04", cases: 3 }]);
  });

  it("skips rows without a valid date", () => {
    const { rows } = _makeEpicurve({
      rows: [
        { onset: "2021-01-04" },
        { onset: null },
        { onset: "not a date" },
        { onset: "2021-02-30" },
      ],
    });
    expect(rows).toEqual([{ bucket: "2021-01-04", cases: 1 }]);
  });

  it("reads Date objects and epoch milliseconds as dates", () => {
    const { rows } = _makeEpicurve({
      rows: [
        { onset: new Date("2021-01-04T08:00:00.000Z") },
        { onset: Date.UTC(2021, 0, 4, 20) },
      ],
    });
    expect(rows).toEqual([{ bucket: "2021-01-04", cases: 2 }]);
  });

  it("fills every empty day between the first and last date with zero", () => {
    const { rows } = _makeEpicurve({
      rows: _makeOnsetRows(["2021-01-08", "2021-01-04"]),
    });
    expect(rows).toEqual([
      { bucket: "2021-01-04", cases: 1 },
      { bucket: "2021-01-05", cases: 0 },
      { bucket: "2021-01-06", cases: 0 },
      { bucket: "2021-01-07", cases: 0 },
      { bucket: "2021-01-08", cases: 1 },
    ]);
  });

  it("zero-fills epi weeks across the 2020 to 2021 year boundary", () => {
    const { rows } = _makeEpicurve({
      rows: _makeOnsetRows(["2020-12-22", "2020-12-31", "2021-01-12"]),
      settings: { interval: "epiWeek" },
    });
    expect(rows).toEqual([
      { bucket: "2020-12-20", cases: 1 },
      { bucket: "2020-12-27", cases: 1 },
      { bucket: "2021-01-03", cases: 0 },
      { bucket: "2021-01-10", cases: 1 },
    ]);
  });

  it("puts 2020-12-31 and 2021-01-02 in MMWR week 53 of 2020", () => {
    const { rows } = _makeEpicurve({
      rows: _makeOnsetRows(["2020-12-31", "2021-01-02", "2021-01-03"]),
      settings: { interval: "epiWeek" },
    });
    expect(rows).toEqual([
      { bucket: "2020-12-27", cases: 2 },
      { bucket: "2021-01-03", cases: 1 },
    ]);
  });

  it("zero-fills months across a year boundary", () => {
    const { rows } = _makeEpicurve({
      rows: _makeOnsetRows(["2020-11-15", "2021-02-01"]),
      settings: { interval: "month" },
    });
    expect(rows).toEqual([
      { bucket: "2020-11-01", cases: 1 },
      { bucket: "2020-12-01", cases: 0 },
      { bucket: "2021-01-01", cases: 0 },
      { bucket: "2021-02-01", cases: 1 },
    ]);
  });

  it("buckets by epi week when the interval is unset", () => {
    const { rows } = _makeEpicurve({
      rows: _makeOnsetRows(["2021-01-04", "2021-01-09"]),
      settings: { interval: undefined },
    });
    expect(rows).toEqual([{ bucket: "2021-01-03", cases: 2 }]);
  });

  it("returns a stacked bar spec with no bar gap and a date x axis", () => {
    const { chart } = _makeEpicurve({
      rows: _makeOnsetRows(["2021-01-04"]),
    });
    expect(chart).toEqual({
      kind: "bar",
      xColumn: "bucket",
      xColumnType: "date",
      series: [{ column: "cases", label: "Cases" }],
      layout: "stack",
      barGap: "none",
    });
  });

  it("makes one series per stack-by value, from the most cases to the fewest", () => {
    const { rows, chart } = _makeEpicurve({
      rows: [
        { onset: "2021-01-04", status: "Vaccinated" },
        { onset: "2021-01-04", status: "Unvaccinated" },
        { onset: "2021-01-05", status: "Unvaccinated" },
      ],
      settings: { stackByColumn: "status" },
    });
    expect(chart.series).toEqual([
      { column: "series_0", label: "Unvaccinated" },
      { column: "series_1", label: "Vaccinated" },
    ]);
    expect(rows).toEqual([
      { bucket: "2021-01-04", series_0: 1, series_1: 1 },
      { bucket: "2021-01-05", series_0: 1, series_1: 0 },
    ]);
  });

  it("orders stack-by values with the same total by their text", () => {
    const { chart } = _makeEpicurve({
      rows: [
        { onset: "2021-01-04", status: "b" },
        { onset: "2021-01-04", status: "a" },
      ],
      settings: { stackByColumn: "status" },
    });
    expect(chart.series).toEqual([
      { column: "series_0", label: "a" },
      { column: "series_1", label: "b" },
    ]);
  });

  it("sums the stack-by values past the top 8 as Other", () => {
    const { rows, chart } = _makeEpicurve({
      rows: Array.from({ length: 10 }, (_value, index) => {
        return { onset: "2021-01-04", status: `s${index}`, cases: 10 - index };
      }),
      settings: { stackByColumn: "status", countColumn: "cases" },
    });
    const labels = chart.series.map((oneSeries) => {
      return oneSeries.label;
    });
    expect(labels).toEqual([
      "s0",
      "s1",
      "s2",
      "s3",
      "s4",
      "s5",
      "s6",
      "s7",
      "Other",
    ]);
    expect(rows[0]).toMatchObject({ series_7: 3, series_other: 3 });
  });

  it("labels rows with no stack-by value as Unknown", () => {
    const { rows, chart } = _makeEpicurve({
      rows: [
        { onset: "2021-01-04", status: "Vaccinated" },
        { onset: "2021-01-04", status: null },
        { onset: "2021-01-04", status: "" },
      ],
      settings: { stackByColumn: "status" },
    });
    expect(chart.series).toEqual([
      { column: "series_0", label: "Unknown" },
      { column: "series_1", label: "Vaccinated" },
    ]);
    expect(rows).toEqual([{ bucket: "2021-01-04", series_0: 2, series_1: 1 }]);
  });

  it("returns no rows and the Cases series when no row has a valid date", () => {
    const result = _makeEpicurve({
      rows: _makeOnsetRows(["n/a"]),
      settings: { stackByColumn: "status" },
    });
    expect(result.rows).toEqual([]);
    expect(result.chart.series).toEqual([{ column: "cases", label: "Cases" }]);
  });

  it("keeps only the latest 200 days when an early date is an outlier", () => {
    const startedAt = performance.now();
    const { rows } = _makeEpicurve({
      rows: _makeOnsetRows(["0020-01-01", "2021-01-04", "2021-09-01"]),
    });
    expect(rows).toHaveLength(200);
    expect(rows[199]).toEqual({ bucket: "2021-09-01", cases: 1 });
    expect(rows[0]).toEqual({ bucket: "2021-02-14", cases: 0 });
    expect(performance.now() - startedAt).toBeLessThan(500);
  });

  it("keeps only the latest 200 epi weeks and months", () => {
    const weekRows = _makeEpicurve({
      rows: _makeOnsetRows(["0020-01-01", "2021-09-01"]),
      settings: { interval: "epiWeek" },
    }).rows;
    const monthRows = _makeEpicurve({
      rows: _makeOnsetRows(["0020-01-01", "2021-09-15"]),
      settings: { interval: "month" },
    }).rows;
    expect(weekRows).toHaveLength(200);
    expect(weekRows[199]).toEqual({ bucket: "2021-08-29", cases: 1 });
    expect(monthRows).toHaveLength(200);
    expect(monthRows[0]).toEqual({ bucket: "2005-02-01", cases: 0 });
    expect(monthRows[199]).toEqual({ bucket: "2021-09-01", cases: 1 });
  });

  it("keeps every bucket of a span of exactly 200 days", () => {
    const { rows } = _makeEpicurve({
      rows: _makeOnsetRows(["2021-01-01", "2021-07-19"]),
    });
    expect(rows).toHaveLength(200);
    expect(rows[0]).toEqual({ bucket: "2021-01-01", cases: 1 });
  });

  it("ranks stack-by values over the kept buckets only", () => {
    const { chart } = _makeEpicurve({
      rows: [
        { onset: "0020-01-01", status: "Old" },
        { onset: "2021-09-01", status: "Recent" },
      ],
      settings: { stackByColumn: "status" },
    });
    expect(chart.series).toEqual([{ column: "series_0", label: "Recent" }]);
  });

  it("gives a stack-by value with no cases no series", () => {
    const { rows, chart } = _makeEpicurve({
      rows: [
        { onset: "2021-01-04", status: "Counted", cases: 2 },
        { onset: "2021-01-04", status: "Empty", cases: null },
      ],
      settings: { stackByColumn: "status", countColumn: "cases" },
    });
    expect(chart.series).toEqual([{ column: "series_0", label: "Counted" }]);
    expect(rows).toEqual([{ bucket: "2021-01-04", series_0: 2 }]);
  });

  it("keeps the top 8 slots for values with cases", () => {
    const { chart } = _makeEpicurve({
      rows: [
        ...Array.from({ length: 8 }, (_value, index) => {
          return { onset: "2021-01-04", status: `s${index}`, cases: 1 };
        }),
        { onset: "2021-01-04", status: "Empty", cases: null },
      ],
      settings: { stackByColumn: "status", countColumn: "cases" },
    });
    expect(chart.series).toHaveLength(8);
  });

  it("throws when the date column setting is unset", () => {
    expect(() => {
      return _makeEpicurve({
        rows: _makeOnsetRows(["2021-01-04"]),
        settings: { dateColumn: undefined },
      });
    }).toThrow('The epicurve needs a "dateColumn" setting.');
  });
});
