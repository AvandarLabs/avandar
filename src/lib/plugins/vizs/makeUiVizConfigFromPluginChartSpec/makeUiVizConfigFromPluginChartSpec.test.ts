import { describe, expect, it } from "vitest";
import { makeUiVizConfigFromPluginChartSpec } from "@/lib/plugins/vizs/makeUiVizConfigFromPluginChartSpec/makeUiVizConfigFromPluginChartSpec";
import type { PluginChartSpec } from "@avandar/plugin-sdk";

const ROWS = [{ week: "2026-01-04", vaccinated: 3, unvaccinated: 5 }];

const STACKED_BARS: PluginChartSpec = {
  kind: "bar",
  xColumn: "week",
  xColumnType: "date",
  series: [
    { column: "vaccinated", label: "Vaccinated" },
    { column: "unvaccinated", label: "Unvaccinated" },
  ],
  layout: "stack",
  barGap: "none",
};

const SINGLE_SERIES: PluginChartSpec = {
  kind: "line",
  xColumn: "week",
  series: [{ column: "vaccinated" }],
};

function _convert(
  chart: PluginChartSpec,
): ReturnType<typeof makeUiVizConfigFromPluginChartSpec> {
  return makeUiVizConfigFromPluginChartSpec({ chart, rows: ROWS });
}

describe("makeUiVizConfigFromPluginChartSpec", () => {
  it("builds a bar config with the spec's layout and bar gap", () => {
    expect(_convert(STACKED_BARS).uiVizConfig).toEqual({
      vizType: "bar",
      xAxisKey: "week",
      series: [
        { renderAs: "bar", key: "vaccinated", label: "Vaccinated" },
        { renderAs: "bar", key: "unvaccinated", label: "Unvaccinated" },
      ],
      layout: "stack",
      withLegend: true,
      barGap: "none",
    });
  });

  it("defaults a bar config to grouped bars with the default gap", () => {
    expect(
      _convert({ ...SINGLE_SERIES, kind: "bar" }).uiVizConfig,
    ).toMatchObject({ layout: "group", barGap: "default" });
  });

  it("builds a line config with one line series per spec series", () => {
    expect(_convert(SINGLE_SERIES).uiVizConfig).toEqual({
      vizType: "line",
      xAxisKey: "week",
      series: [{ renderAs: "line", key: "vaccinated" }],
      withLegend: false,
    });
  });

  it("maps a stacked area spec to the stacked area layout", () => {
    expect(
      _convert({ ...STACKED_BARS, kind: "area" }).uiVizConfig,
    ).toMatchObject({ vizType: "area", layout: "stacked" });
  });

  it("maps a grouped area spec to the default area layout", () => {
    expect(
      _convert({ ...STACKED_BARS, kind: "area", layout: "group" }).uiVizConfig,
    ).toMatchObject({ vizType: "area", layout: "default" });
  });

  it("turns the legend on when the spec has more than one series", () => {
    expect(_convert(STACKED_BARS).uiVizConfig).toMatchObject({
      withLegend: true,
    });
  });

  it("turns the legend off for a single series", () => {
    expect(_convert(SINGLE_SERIES).uiVizConfig).toMatchObject({
      withLegend: false,
    });
  });

  it("lists the x column first, then each series column, as the column names", () => {
    expect(_convert(STACKED_BARS).columnNames).toEqual([
      "week",
      "vaccinated",
      "unvaccinated",
    ]);
  });

  it("marks the x column as a date column when the spec says it holds dates", () => {
    expect(_convert(STACKED_BARS).dateColumns).toEqual(new Set(["week"]));
  });

  it("marks no date columns for a category x column", () => {
    expect(_convert(SINGLE_SERIES).dateColumns).toEqual(new Set());
  });

  it("throws an error naming an x column the rows lack", () => {
    expect(() => {
      _convert({ ...SINGLE_SERIES, xColumn: "month" });
    }).toThrow('"month"');
  });

  it("throws an error naming a series column the rows lack", () => {
    expect(() => {
      _convert({ ...SINGLE_SERIES, series: [{ column: "boosted" }] });
    }).toThrow('"boosted"');
  });

  it("accepts any column names when there are no rows", () => {
    expect(
      makeUiVizConfigFromPluginChartSpec({
        chart: { ...SINGLE_SERIES, xColumn: "month" },
        rows: [],
      }).columnNames,
    ).toEqual(["month", "vaccinated"]);
  });
});
