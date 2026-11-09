import { useLingui } from "@lingui/react/macro";
import { useMemo } from "react";
import { makeWideResultFromLongResult } from "@/components/VisualizationContainer/makeWideResultFromLongResult/makeWideResultFromLongResult";
import { CHART_COLOR_SWATCHES } from "@/lib/ui/viz/ChartConstants";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { AvaVizConfig } from "$/models/vizs/AvaVizConfig/AvaVizConfig";
import type { AvaXYSeries } from "$/models/vizs/series.types";
import type { UnknownDataFrame } from "@avandar/utils";

/** The props `VisualizationContainer` draws a chart from. */
export type ChartInput = {
  columns: readonly QueryResult.ColumnWithId[];
  data: UnknownDataFrame;
  dateColumns: ReadonlySet<string>;
  vizConfig: AvaVizConfig.T;
};

type XYVizConfig = Extract<
  AvaVizConfig.T,
  { vizType: "bar" | "line" | "area" }
>;

/** The Other series is neutral, so it reads as the rest, not a category. */
const OTHER_SERIES_COLOR = "var(--mantine-color-neutral-5)";

function _isXYVizConfig(config: AvaVizConfig.T): config is XYVizConfig {
  return (
    config.vizType === "bar" ||
    config.vizType === "line" ||
    config.vizType === "area"
  );
}

/** One series per split column, styled like the chart's own series. */
function _buildSplitSeries(
  options: Readonly<{
    templateSeries: AvaXYSeries;
    seriesColumns: readonly QueryResult.ColumnWithId[];
    otherLabel: string;
  }>,
): AvaXYSeries[] {
  const { templateSeries, seriesColumns, otherLabel } = options;
  return seriesColumns.map((column, index) => {
    return {
      ...templateSeries,
      key: column.id,
      label: undefined,
      color:
        column.name === otherLabel
          ? OTHER_SERIES_COLOR
          : CHART_COLOR_SWATCHES[index % CHART_COLOR_SWATCHES.length],
    };
  });
}

function _splitChartInputByCategory(
  input: ChartInput,
  otherLabel: string,
): ChartInput {
  const { columns, vizConfig } = input;
  if (!_isXYVizConfig(vizConfig) || vizConfig.series.length !== 1) {
    return input;
  }
  const [templateSeries] = vizConfig.series;
  const xColumn = columns.find((column) => {
    return column.id === vizConfig.xAxisKey;
  });
  const valueColumn = columns.find((column) => {
    return column.id === templateSeries?.key;
  });
  if (
    templateSeries === undefined ||
    xColumn === undefined ||
    valueColumn === undefined
  ) {
    return input;
  }
  const wideResult = makeWideResultFromLongResult({
    ...input,
    xColumnName: xColumn.name,
    valueColumnName: valueColumn.name,
    otherLabel,
  });
  if (!wideResult.isSplit) {
    return input;
  }
  const seriesColumns = wideResult.seriesColumnNames.map((name, index) => {
    const id = `${valueColumn.id}:split:${index}` as QueryColumn.Id;
    return { id, name, dataType: valueColumn.dataType };
  });
  return {
    columns: [xColumn, ...seriesColumns],
    data: wideResult.data,
    dateColumns: input.dateColumns,
    vizConfig: {
      ...vizConfig,
      withLegend: true,
      series: _buildSplitSeries({ templateSeries, seriesColumns, otherLabel }),
    },
  };
}

/**
 * Turns a long query result into one series per category when it is drawn
 * as a line, bar, or area chart, so `cases` by week and district shows a
 * line per district with a legend instead of one zigzag line. Every other
 * chart type, and any result that is not long, comes back unchanged.
 *
 * Use it on the props of a `VisualizationContainer` whose result comes from
 * free-form SQL, for example a chart the AI agent drew. It only changes what
 * is drawn: the caller's own config, columns, and rows stay as they are.
 */
export function useCategorySplitChartInput(input: ChartInput): ChartInput {
  const { t } = useLingui();
  const otherLabel = t`Other`;
  const { columns, data, dateColumns, vizConfig } = input;
  return useMemo(() => {
    return _splitChartInputByCategory(
      { columns, data, dateColumns, vizConfig },
      otherLabel,
    );
  }, [columns, data, dateColumns, vizConfig, otherLabel]);
}
