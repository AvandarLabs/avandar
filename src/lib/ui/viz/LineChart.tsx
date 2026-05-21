import { LineChart as MantineLineChart } from "@mantine/charts";
import { formatDate } from "@utils";
import { useMemo } from "react";
import { applyChartStyle } from "@/lib/ui/viz/applyChartStyle";
import { X_AXIS_PADDING } from "@/lib/ui/viz/ChartConstants";
import { formatChartNumber } from "@/lib/ui/viz/formatChartNumber";
import { renderXYComposite } from "@/lib/ui/viz/renderXYComposite";
import type { XYChartProps } from "@/lib/ui/viz/ChartTypes";
import type { LineChartSeries } from "@mantine/charts";
import type { LineSeries } from "$/models/vizs/SeriesConfig";
import type { LineProps } from "recharts";

type Props = XYChartProps;

export function LineChart({
  data,
  xAxisKey,
  series,
  height = 500,
  dateColumns,
  dateFormat = "YYYY-MM-DD",
  timezone,
  withLegend = false,
  chartStyle,
}: Props): JSX.Element {
  const isDateAxis = dateColumns?.has(xAxisKey) ?? false;

  const baseXAxisProps = useMemo(() => {
    if (!isDateAxis) {
      return { padding: X_AXIS_PADDING };
    }
    return {
      padding: X_AXIS_PADDING,
      tickFormatter: (value: unknown) => {
        return formatDate(value, { format: dateFormat, zone: timezone });
      },
    };
  }, [isDateAxis, dateFormat, timezone]);

  const tooltipProps = useMemo(() => {
    if (!isDateAxis) {
      return undefined;
    }
    return {
      labelFormatter: (label: unknown) => {
        return formatDate(label, { format: dateFormat, zone: timezone });
      },
    };
  }, [isDateAxis, dateFormat, timezone]);

  const styleProps = useMemo(() => {
    return applyChartStyle(chartStyle, baseXAxisProps);
  }, [chartStyle, baseXAxisProps]);

  const allLines = useMemo(() => {
    return series.every((s) => {
      return s.renderAs === "line";
    });
  }, [series]);

  if (!allLines) {
    return renderXYComposite({
      data,
      xAxisKey,
      series,
      height,
      withLegend,
      tooltipProps,
      styleProps,
      valueFormatter: formatChartNumber,
    });
  }

  const lineSeries = series as readonly LineSeries[];
  return (
    <MantineLineChart
      h={height}
      data={data}
      dataKey={xAxisKey}
      withLegend={withLegend}
      tooltipProps={tooltipProps}
      valueFormatter={formatChartNumber}
      series={lineSeries.map((s): LineChartSeries => {
        return {
          name: s.key,
          label: s.label,
          color: s.color,
          curveType: s.curveType,
        };
      })}
      lineProps={(s): Partial<Omit<LineProps, "ref">> => {
        const found = lineSeries.find((ls) => {
          return ls.key === s.name;
        });
        if (found === undefined) {
          return {};
        }
        const overrides: Partial<Omit<LineProps, "ref">> = {};
        if (found.strokeWidth !== undefined) {
          overrides.strokeWidth = found.strokeWidth;
        }
        if (found.withDots !== undefined) {
          overrides.dot = found.withDots;
        }
        return overrides;
      }}
      {...styleProps}
    />
  );
}
