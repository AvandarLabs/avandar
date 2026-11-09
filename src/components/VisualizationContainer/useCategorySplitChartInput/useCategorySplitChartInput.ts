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

/**
 * Chart props after a category split, plus the name of the column the chart
 * was split by. `splitColumnName` is undefined when nothing was split.
 */
export type CategorySplitChartInput = ChartInput & {
  splitColumnName: string | undefined;
};

type XYVizConfig = Extract<
  AvaVizConfig.T,
  { vizType: "bar" | "line" | "area" }
>;

type SplitSource = {
  vizConfig: XYVizConfig;
  templateSeries: AvaXYSeries;
  xColumn: QueryResult.ColumnWithId;
  valueColumn: QueryResult.ColumnWithId;
};

/** The Other series is neutral, so it reads as the rest, not a category. */
const OTHER_SERIES_COLOR = "var(--mantine-color-neutral-5)";

function _isXYVizConfig(config: AvaVizConfig.T): config is XYVizConfig {
  return (
    config.vizType === "bar" ||
    config.vizType === "line" ||
    config.vizType === "area"
  );
}

/**
 * The XY config, its one series, and the X and value columns a split needs.
 * Undefined for any other chart type, a chart with more or fewer than one
 * series, or a slot whose column is missing from the result.
 */
function _getSplitSource(input: ChartInput): SplitSource | undefined {
  const { columns, vizConfig } = input;
  if (!_isXYVizConfig(vizConfig) || vizConfig.series.length !== 1) {
    return undefined;
  }
  const [templateSeries] = vizConfig.series;
  const xColumn = columns.find((column) => {
    return column.id === vizConfig.xAxisKey;
  });
  const valueColumn = columns.find((column) => {
    return column.id === templateSeries?.key;
  });
  return templateSeries === undefined ||
    xColumn === undefined ||
    valueColumn === undefined
    ? undefined
    : { vizConfig, templateSeries, xColumn, valueColumn };
}

/** One series per split column, styled like the chart's own series. */
function _buildSplitSeries(
  options: Readonly<{
    templateSeries: AvaXYSeries;
    seriesColumns: readonly QueryResult.ColumnWithId[];
    hasOtherSeries: boolean;
  }>,
): AvaXYSeries[] {
  const { templateSeries, seriesColumns, hasOtherSeries } = options;
  const otherIndex = hasOtherSeries ? seriesColumns.length - 1 : undefined;
  return seriesColumns.map((column, index) => {
    return {
      ...templateSeries,
      key: column.id,
      label: undefined,
      color:
        index === otherIndex
          ? OTHER_SERIES_COLOR
          : CHART_COLOR_SWATCHES[index % CHART_COLOR_SWATCHES.length],
    };
  });
}

function _splitChartInputByCategory(
  input: ChartInput,
  labels: Readonly<{ otherLabel: string; blankLabel: string }>,
): CategorySplitChartInput {
  const unchanged = { ...input, splitColumnName: undefined };
  const source = _getSplitSource(input);
  const wideResult =
    source === undefined
      ? undefined
      : makeWideResultFromLongResult({
          ...input,
          ...labels,
          xColumnName: source.xColumn.name,
          valueColumnName: source.valueColumn.name,
        });
  if (source === undefined || wideResult === undefined || !wideResult.isSplit) {
    return unchanged;
  }
  const { valueColumn, templateSeries } = source;
  const seriesColumns = wideResult.seriesColumnNames.map((name, index) => {
    const id = `${valueColumn.id}:split:${index}` as QueryColumn.Id;
    return { id, name, dataType: valueColumn.dataType };
  });
  return {
    columns: [source.xColumn, ...seriesColumns],
    data: wideResult.data,
    dateColumns: input.dateColumns,
    splitColumnName: wideResult.splitColumnName,
    vizConfig: {
      ...source.vizConfig,
      withLegend: true,
      series: _buildSplitSeries({
        templateSeries,
        seriesColumns,
        hasOtherSeries: wideResult.hasOtherSeries,
      }),
    },
  };
}

/**
 * Turns a long query result into one series per category when it is drawn
 * as a line, bar, or area chart, so `cases` by week and district shows a
 * line per district with a legend instead of one zigzag line. Every other
 * chart type, and any result that is not long, comes back unchanged with no
 * `splitColumnName`.
 *
 * Use it on the props of a `VisualizationContainer`, whether the result came
 * from a structured query or from free-form SQL, for example a chart the AI
 * agent drew. It only changes what is drawn: the caller's own config,
 * columns, and rows stay as they are.
 */
export function useCategorySplitChartInput(
  input: ChartInput,
): CategorySplitChartInput {
  const { t } = useLingui();
  const otherLabel = t`Other`;
  const blankLabel = t`(Blank)`;
  const { columns, data, dateColumns, vizConfig } = input;
  return useMemo(() => {
    return _splitChartInputByCategory(
      { columns, data, dateColumns, vizConfig },
      { otherLabel, blankLabel },
    );
  }, [columns, data, dateColumns, vizConfig, otherLabel, blankLabel]);
}
