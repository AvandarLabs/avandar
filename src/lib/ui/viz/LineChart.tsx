import { formatDate, propEq } from "@avandar/utils";
import { LineChart as MantineLineChart } from "@mantine/charts";
import { useMemo } from "react";
import { useLineChartStyleProps } from "@/lib/ui/viz/axis/useLineChartStyleProps/useLineChartStyleProps";
import { X_AXIS_PADDING } from "@/lib/ui/viz/ChartConstants";
import { formatChartNumber } from "@/lib/ui/viz/formatChartNumber/formatChartNumber";
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

  const styleProps = useLineChartStyleProps({
    data,
    series,
    chartStyle,
    xAxisKey,
    tickFormatter: baseXAxisProps.tickFormatter,
    baseXAxisProps,
  });

  const allLines = series.every(propEq("renderAs", "line"));

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
        const found = lineSeries.find(propEq("key", s.name));
        if (found === undefined) {
          return {};
        }
        return {
          ...(found.strokeWidth !== undefined ?
            { strokeWidth: found.strokeWidth }
          : {}),
          ...(found.withDots !== undefined ? { dot: found.withDots } : {}),
        };
      }}
      {...styleProps}
    />
  );
}
