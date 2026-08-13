import { formatDate, propEq } from "@avandar/utils";
import { LineChart as MantineLineChart } from "@mantine/charts";
import { getAxisRoles } from "$/models/vizs/getAxisRoles/getAxisRoles";
import { useMemo } from "react";
import { applyChartStyle } from "@/lib/ui/viz/applyChartStyle/applyChartStyle";
import { computeValueExtent } from "@/lib/ui/viz/axis/computeValueExtent/computeValueExtent";
import { needsValueExtent } from "@/lib/ui/viz/axis/needsValueExtent/needsValueExtent";
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

  const yExtent = useMemo(() => {
    if (!needsValueExtent(chartStyle?.yAxis)) {
      return undefined;
    }
    return computeValueExtent(
      data,
      series.map((s) => {
        return { key: s.key };
      }),
    );
  }, [data, series, chartStyle?.yAxis]);

  const xTickLabels = useMemo(() => {
    if (chartStyle?.xAxis?.tickAngle === undefined) {
      return undefined;
    }
    const format = baseXAxisProps.tickFormatter;
    return data.map((row) => {
      const value = row[xAxisKey];
      // `baseXAxisProps.tickFormatter` is locally typed as
      // `(value: unknown) => string` — one parameter, no cast needed.
      return format !== undefined ? format(value) : String(value ?? "");
    });
  }, [data, xAxisKey, baseXAxisProps, chartStyle?.xAxis?.tickAngle]);

  const styleProps = useMemo(() => {
    return applyChartStyle(chartStyle, {
      baseXAxisProps,
      yExtent,
      xTickLabels,
      axisRoles: getAxisRoles("line"),
    });
  }, [chartStyle, baseXAxisProps, yExtent, xTickLabels]);

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
