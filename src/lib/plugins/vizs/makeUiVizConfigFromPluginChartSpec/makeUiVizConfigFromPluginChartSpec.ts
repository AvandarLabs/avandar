import { matchLiteral } from "@avandar/utils";
import type { BuiltInUiVizConfig } from "$/models/vizs/UiVizConfig/UiVizConfig.types";
import type { PluginChartSpec } from "@avandar/plugin-sdk";

type BarConfig = Extract<BuiltInUiVizConfig, { vizType: "bar" }>;
type LineConfig = Extract<BuiltInUiVizConfig, { vizType: "line" }>;
type AreaConfig = Extract<BuiltInUiVizConfig, { vizType: "area" }>;

/**
 * A built-in chart config that draws a plugin chart's transform output, with
 * the column metadata `UiVizConfigRenderer` reads alongside it.
 */
export type PluginChartUiVizConfig = {
  uiVizConfig: BuiltInUiVizConfig;

  /** The x column, then each series column. */
  columnNames: string[];

  /** Holds the x column when the spec marks it as dates. */
  dateColumns: Set<string>;
};

function _buildSeriesFields(
  chart: PluginChartSpec,
): Array<{ key: string; label?: string }> {
  return chart.series.map((series) => {
    return series.label === undefined
      ? { key: series.column }
      : { key: series.column, label: series.label };
  });
}

function _buildBarConfig(chart: PluginChartSpec): BarConfig {
  const series = _buildSeriesFields(chart).map((field) => {
    return { ...field, renderAs: "bar" as const };
  });
  return {
    vizType: "bar",
    xAxisKey: chart.xColumn,
    series,
    layout: chart.layout ?? "group",
    withLegend: series.length > 1,
    barGap: chart.barGap ?? "default",
  };
}

function _buildLineConfig(chart: PluginChartSpec): LineConfig {
  const series = _buildSeriesFields(chart).map((field) => {
    return { ...field, renderAs: "line" as const };
  });
  return {
    vizType: "line",
    xAxisKey: chart.xColumn,
    series,
    withLegend: series.length > 1,
  };
}

function _buildAreaConfig(chart: PluginChartSpec): AreaConfig {
  const series = _buildSeriesFields(chart).map((field) => {
    return { ...field, renderAs: "area" as const };
  });
  return {
    vizType: "area",
    xAxisKey: chart.xColumn,
    series,
    layout: chart.layout === "stack" ? "stacked" : "default",
    withLegend: series.length > 1,
  };
}

function _getColumnNamesFromChart(chart: PluginChartSpec): string[] {
  const seriesColumns = chart.series.map((series) => {
    return series.column;
  });
  return [...new Set([chart.xColumn, ...seriesColumns])];
}

function _assertColumnsInRows(options: {
  chart: PluginChartSpec;
  rows: ReadonlyArray<Readonly<Record<string, unknown>>>;
}): void {
  const { chart, rows } = options;
  const firstRow = rows[0];
  if (firstRow === undefined) {
    return;
  }
  const missingColumn = _getColumnNamesFromChart(chart).find((column) => {
    return !Object.hasOwn(firstRow, column);
  });
  if (missingColumn !== undefined) {
    throw new Error(
      `The chart spec names the column "${missingColumn}", but the transform's rows have no such column.`,
    );
  }
}

/**
 * Makes the built-in chart config that draws a plugin chart transform's
 * output, plus the column names and date columns `UiVizConfigRenderer`
 * reads. Bar, line, and area specs map to the built-in chart of the same
 * kind, with a legend when there is more than one series.
 *
 * Throws an `Error` naming the column when the spec's x column or a series
 * column is missing from the first of `rows`, so a transform that mislabels
 * its output fails visibly instead of drawing an empty chart. Empty `rows`
 * pass the check.
 */
export function makeUiVizConfigFromPluginChartSpec(options: {
  chart: PluginChartSpec;
  rows: ReadonlyArray<Readonly<Record<string, unknown>>>;
}): PluginChartUiVizConfig {
  const { chart, rows } = options;
  _assertColumnsInRows({ chart, rows });
  return {
    uiVizConfig: matchLiteral(chart.kind, {
      bar: () => {
        return _buildBarConfig(chart);
      },
      line: () => {
        return _buildLineConfig(chart);
      },
      area: () => {
        return _buildAreaConfig(chart);
      },
    }),
    columnNames: _getColumnNamesFromChart(chart),
    dateColumns: new Set(chart.xColumnType === "date" ? [chart.xColumn] : []),
  };
}
